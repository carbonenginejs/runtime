// The scanner behind scripts/lint-typed-array-alloc.js, split out so the
// fixture test can run it on source text. What it flags and allows is in
// that script's head comment.

import { parse } from "@babel/parser";

export const RULE = "source-style rule: typed arrays and scratch";

const TYPED_ARRAY = /^(?:Int8|Uint8|Uint8Clamped|Int16|Uint16|Int32|Uint32|Float16|Float32|Float64|BigInt64|BigUint64)Array$/u;
const MATH = new Set([ "vec2", "vec3", "vec4", "quat", "quat2", "mat2", "mat2d", "mat3", "mat4", "box3", "sph3", "ray3", "lne3", "tri3", "pln", "color" ]);
const MATH_ALLOCATORS = new Set([ "create", "clone", "fromValues" ]);
const SLOT_NAME = /^[a-z][a-z0-9]*_\d+$/u;

const isFunction = node => /^(?:FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ClassMethod|ClassPrivateMethod|ObjectMethod)$/u.test(node?.type ?? "");
const isField = node => /^(?:ClassProperty|ClassPrivateProperty|ClassAccessorProperty)$/u.test(node?.type ?? "");
const isScratchField = node => isField(node) && node.static && node.key?.name === "scratch";
const isScratchAccess = node => node?.type === "MemberExpression" && !node.computed && node.property?.name === "scratch";

/** The name a function is known by, for the recursion test. */
function functionName(node, parent)
{
  if (node.id?.name) return node.id.name;
  if (node.key) return node.key.name ?? node.key.id?.name ?? node.key.value ?? "";
  if (parent?.type === "VariableDeclarator" && parent.id?.name) return parent.id.name;
  if (parent?.type === "AssignmentExpression" && parent.left?.type === "MemberExpression") return parent.left.property?.name ?? "";
  if (parent?.type === "ObjectProperty" || isField(parent)) return parent.key?.name ?? "";
  return "";
}

/** Whether a line carries the given marker comment. */
function marked(lines, line, marker)
{
  return lines[line - 1]?.includes(`// ${marker}`) || lines[line - 2]?.trim().startsWith(`// ${marker}`);
}

/** Children of a node, in source order. */
function children(node)
{
  const out = [];
  for (const key of Object.keys(node))
  {
    if (key === "loc" || key === "start" || key === "end" || key.endsWith("Comments") || key === "extra") continue;
    const value = node[key];
    if (Array.isArray(value)) { for (const item of value) if (item && typeof item.type === "string") out.push(item); }
    else if (value && typeof value.type === "string") out.push(value);
  }
  return out;
}

/** Whether a node is a numeric literal, signed or not. */
const isNumber = node => node?.type === "NumericLiteral" || (node?.type === "UnaryExpression" && node.operator === "-" && node.argument.type === "NumericLiteral");

/** `new <X>Array(<number>)` or `new <X>Array([ <numbers> ])`: a fixed-size value. */
function isFixedSize(node)
{
  if (node.type !== "NewExpression" || node.callee.type !== "Identifier" || !TYPED_ARRAY.test(node.callee.name) || node.arguments.length !== 1) return false;
  const [ argument ] = node.arguments;
  return isNumber(argument) || (argument.type === "ArrayExpression" && argument.elements.every(isNumber));
}

/** What one allocation inside a function body is, or null. */
function allocationKind(node)
{
  if (node.type === "NewExpression" && node.callee.type === "Identifier" && TYPED_ARRAY.test(node.callee.name)) return `new ${node.callee.name}`;
  if (node.type !== "CallExpression" || node.callee.type !== "MemberExpression") return null;
  const object = node.callee.object;
  const property = node.callee.property?.name;
  if (object.type === "Identifier" && MATH.has(object.name) && MATH_ALLOCATORS.has(property)) return `${object.name}.${property}`;
  return null;
}

/**
 * Scans one file's source.
 *
 * @param {string} code The module source.
 * @param {string} relativeFile The path reported with each finding.
 * @returns {{ allocations: { line: number, kind: string }[], scratchProblems: string[], poolProblems: string[], poolInfo: string[] }}
 */
export function scanTypedArrayAlloc(code, relativeFile)
{
  const lines = code.split(/\r?\n/u);
  const ast = parse(code, { sourceType: "module", plugins: [ "classProperties", "classStaticBlock", "decoratorAutoAccessors", "decorators", "importAttributes" ] });
  const allocations = [];
  const scratchProblems = [];
  const poolProblems = [];
  const poolInfo = [];

  // inFunction: inside a function or method body (not a field initialiser or
  // the top level); inScratch: inside a `static scratch = {...}` initialiser.
  (function walk(node, parent, inFunction, inScratch)
  {
    if (isFunction(node))
    {
      inFunction = true;
      CheckFunction(node, functionName(node, parent));
    }
    else if (isField(node))
    {
      inFunction = false;
      if (isScratchField(node))
      {
        inScratch = true;
        CheckSlotNames(node);
      }
    }

    const line = node.loc?.start.line;
    if (!marked(lines, line, "alloc:"))
    {
      if (isFixedSize(node))
      {
        if (!inScratch) allocations.push({ line, kind: `${node.callee.name}(fixed size)` });
      }
      else if (inFunction)
      {
        const kind = allocationKind(node);
        if (kind) allocations.push({ line, kind });
      }
    }
    for (const child of children(node)) walk(child, node, inFunction, inScratch);
  })(ast.program, null, false, false);

  /** Slot keys in `static scratch = {...}` are named type_index. */
  function CheckSlotNames(field)
  {
    if (field.value?.type !== "ObjectExpression") return;
    for (const property of field.value.properties)
    {
      const key = property.key?.name ?? property.key?.value;
      if (property.type === "ObjectProperty" && !SLOT_NAME.test(String(key)))
      {
        scratchProblems.push(`${relativeFile}:${property.loc.start.line}: scratch slot "${key}" is not named type_index (vec3_0, box3_0)`);
      }
    }
  }

  /** Scratch naming and escape, and pool balance, for one function's own body. */
  function CheckFunction(fnNode, name)
  {
    const body = fnNode.body;
    if (!body || body.type !== "BlockStatement") return;
    const where = line => `${relativeFile}:${line} ${name || "(anonymous)"}`;
    const allocs = [];
    const unallocs = [];
    const exits = [];
    const bound = new Map();
    const nested = [];
    let recursive = false;

    (function visit(node, inFinally)
    {
      if (node !== body && isFunction(node)) { nested.push(node); return; }

      // Locals bound from scratch: `const { vec3_0 } = X.scratch` or `const vec3_0 = X.scratch.vec3_0`.
      if (node.type === "VariableDeclarator" && isScratchAccess(node.init) && node.id.type === "ObjectPattern")
      {
        for (const property of node.id.properties)
        {
          if (property.type !== "ObjectProperty" || property.value.type !== "Identifier") continue;
          const slot = property.key.name ?? property.key.value;
          bound.set(property.value.name, slot);
          if (property.value.name !== slot) scratchProblems.push(`${where(node.loc.start.line)}: local "${property.value.name}" renames scratch slot "${slot}"; keep the slot's name`);
        }
      }
      if (node.type === "VariableDeclarator" && node.id.type === "Identifier" && node.init?.type === "MemberExpression"
        && isScratchAccess(node.init.object) && !node.init.computed)
      {
        const slot = node.init.property.name;
        bound.set(node.id.name, slot);
        if (node.id.name !== slot) scratchProblems.push(`${where(node.loc.start.line)}: local "${node.id.name}" renames scratch slot "${slot}"; keep the slot's name`);
      }

      const [ target, value ] = node.type === "VariableDeclarator" ? [ node.id, node.init ]
        : node.type === "AssignmentExpression" ? [ node.left, node.right ] : [ null, null ];
      if (target?.type === "Identifier" && value?.type === "CallExpression" && value.callee.type === "MemberExpression"
        && value.callee.property?.name === "alloc" && value.callee.object.type === "Identifier" && !value.arguments.length)
      {
        allocs.push({ name: target.name, pool: value.callee.object.name, line: node.loc.start.line, at: node.end });
      }
      if (node.type === "AssignmentExpression" && target?.type === "MemberExpression" && target.object.type === "ThisExpression"
        && value?.type === "Identifier" && bound.has(value.name))
      {
        scratchProblems.push(`${where(node.loc.start.line)}: scratch "${value.name}" is stored in this.${target.property.name ?? "[]"}`);
      }
      if (node.type === "CallExpression" && node.callee.type === "MemberExpression" && node.callee.property?.name === "unalloc"
        && node.callee.object.type === "Identifier" && node.arguments[0]?.type === "Identifier")
      {
        unallocs.push({ name: node.arguments[0].name, pool: node.callee.object.name, line: node.loc.start.line, at: node.start, inFinally });
      }
      if (node.type === "ReturnStatement" || node.type === "ThrowStatement") exits.push({ line: node.loc.start.line, at: node.start, node });
      if (name && node.type === "CallExpression" && ((node.callee.type === "Identifier" && node.callee.name === name)
        || (node.callee.type === "MemberExpression" && node.callee.property?.name === name))) recursive = true;
      if (node.type === "TryStatement")
      {
        visit(node.block, inFinally);
        if (node.handler) visit(node.handler, inFinally);
        if (node.finalizer) visit(node.finalizer, true);
        return;
      }
      for (const child of children(node)) visit(child, inFinally);
    })(body, false);

    for (const exit of exits)
    {
      const argument = exit.node.argument;
      if (exit.node.type === "ReturnStatement" && argument?.type === "Identifier" && bound.has(argument.name))
      {
        scratchProblems.push(`${where(exit.line)}: scratch "${argument.name}" is returned`);
      }
    }
    if (bound.size)
    {
      for (const closure of nested)
      {
        const captured = new Set();
        (function find(node)
        {
          if (node.type === "Identifier" && bound.has(node.name)) captured.add(node.name);
          for (const child of children(node)) find(child);
        })(closure);
        for (const local of captured) scratchProblems.push(`${where(closure.loc.start.line)}: scratch "${local}" is captured by a closure`);
      }
    }

    for (const alloc of allocs)
    {
      if (marked(lines, alloc.line, "pool-return:")) continue;
      const releases = unallocs.filter(u => u.name === alloc.name);
      if (!releases.length) { poolProblems.push(`${where(alloc.line)}: ${alloc.pool}.alloc() for "${alloc.name}" is never given back`); continue; }
      for (const release of releases)
      {
        if (release.pool !== alloc.pool) poolProblems.push(`${where(alloc.line)}: "${alloc.name}" is ${alloc.pool}.alloc() but released with ${release.pool}.unalloc()`);
      }
      if (releases.some(u => u.inFinally)) continue;
      const first = Math.min(...releases.map(u => u.at));
      const early = exits.find(e => e.at > alloc.at && e.at < first);
      if (early) poolProblems.push(`${where(alloc.line)}: a ${early.node.type === "ThrowStatement" ? "throw" : "return"} at line ${early.line} leaves "${alloc.name}" unreleased`);
      const returnsIt = exits.find(e => e.node.type === "ReturnStatement" && e.node.argument?.type === "Identifier" && e.node.argument.name === alloc.name);
      if (returnsIt) poolProblems.push(`${where(alloc.line)}: "${alloc.name}" is returned to the caller without a // pool-return: marker`);
    }
    if (allocs.length && !recursive) poolInfo.push(`${where(allocs[0].line)}: ${allocs.length} pool value(s) in a function that does not call itself; a scratch candidate`);
  }

  return { allocations, scratchProblems, poolProblems, poolInfo };
}
