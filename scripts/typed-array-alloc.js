// The scanner behind scripts/lint-typed-array-alloc.js, split out so the
// fixture test can run it on source text. What it flags and allows is in
// that script's head comment.

import { parse } from "@babel/parser";

const TYPED_ARRAY = /^(?:Int8|Uint8|Uint8Clamped|Int16|Uint16|Int32|Uint32|Float16|Float32|Float64|BigInt64|BigUint64)Array$/u;
const GL_MATRIX = new Set([ "vec2", "vec3", "vec4", "quat", "quat2", "mat2", "mat2d", "mat3", "mat4" ]);
const GL_ALLOCATORS = new Set([ "create", "clone", "fromValues" ]);
const ALLOCATOR_NAME = /^(?:create|alloc|clone)/iu;

const isFunction = node => /^(?:FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ClassMethod|ClassPrivateMethod|ObjectMethod)$/u.test(node?.type ?? "");

/** The name a function is known by, for the allocator-name allowance and recursion. */
function functionName(node, parent)
{
  if (node.id?.name) return node.id.name;
  if (node.key) return node.key.name ?? node.key.id?.name ?? node.key.value ?? "";
  if (parent?.type === "VariableDeclarator" && parent.id?.name) return parent.id.name;
  if (parent?.type === "AssignmentExpression" && parent.left?.type === "MemberExpression") return parent.left.property?.name ?? "";
  if (parent?.type === "ObjectProperty" || parent?.type === "ClassProperty") return parent.key?.name ?? "";
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

/** What one allocation expression is, or null. */
function allocationKind(node, typedNames)
{
  if (node.type === "NewExpression" && node.callee.type === "Identifier" && TYPED_ARRAY.test(node.callee.name)) return `new ${node.callee.name}`;
  if (node.type !== "CallExpression" || node.callee.type !== "MemberExpression") return null;
  const object = node.callee.object;
  const property = node.callee.property?.name;
  if (object.type === "Identifier" && TYPED_ARRAY.test(object.name) && property === "from") return `${object.name}.from`;
  if (object.type === "Identifier" && GL_MATRIX.has(object.name) && GL_ALLOCATORS.has(property)) return `${object.name}.${property}`;
  if (property === "subarray") return ".subarray";
  if (property === "slice" && object.type === "Identifier" && typedNames.has(object.name)) return ".slice";
  return null;
}

/**
 * Scans one file's source.
 *
 * @param {string} code The module source.
 * @param {string} relativeFile The path reported with each finding.
 * @returns {{ allocations: { line: number, kind: string }[], poolProblems: string[], poolInfo: string[] }}
 */
export function scanTypedArrayAlloc(code, relativeFile)
{
  const lines = code.split(/\r?\n/u);
  const ast = parse(code, { sourceType: "module", plugins: [ "classProperties", "classStaticBlock", "decoratorAutoAccessors", "decorators", "importAttributes" ] });
  const allocations = [];
  const poolProblems = [];
  const poolInfo = [];
  const typedNames = new Set();

  // Names this file assigns a typed array to, for the `.slice` detection.
  (function collect(node)
  {
    if (node.type === "VariableDeclarator" && node.id?.type === "Identifier" && node.init && allocationKind(node.init, new Set())) typedNames.add(node.id.name);
    for (const child of children(node)) collect(child);
  })(ast.program);

  // allowed: whether the nearest enclosing context permits allocation.
  (function walk(node, parent, allowed, fn)
  {
    let here = allowed;
    let currentFn = fn;
    if (isFunction(node))
    {
      const name = functionName(node, parent);
      here = node.kind === "constructor" || ALLOCATOR_NAME.test(name);
      currentFn = node;
      CheckPool(node, name);
    }
    else if (node.type === "StaticBlock" || node.type === "ClassProperty" || node.type === "ClassPrivateProperty" || node.type === "ClassAccessorProperty")
    {
      here = true;
    }
    const kind = currentFn && !here ? allocationKind(node, typedNames) : null;
    if (kind && !marked(lines, node.loc.start.line, "alloc:")) allocations.push({ line: node.loc.start.line, kind });
    for (const child of children(node))
    {
      // A function nested in an allowed region starts its own context.
      walk(child, node, here, currentFn);
    }
  })(ast.program, null, true, null);

  /** The pool balance for one function's own body (nested functions excluded). */
  function CheckPool(fnNode, name)
  {
    const body = fnNode.body;
    if (!body || body.type !== "BlockStatement") return;
    const allocs = [];
    const unallocs = [];
    const exits = [];
    let recursive = false;
    (function visit(node, inFinally)
    {
      if (node !== body && isFunction(node)) return;
      const [ target, value ] = node.type === "VariableDeclarator" ? [ node.id, node.init ]
        : node.type === "AssignmentExpression" ? [ node.left, node.right ] : [ null, null ];
      if (target?.type === "Identifier" && value?.type === "CallExpression" && value.callee.type === "MemberExpression"
        && value.callee.property?.name === "alloc" && value.callee.object.type === "Identifier" && !value.arguments.length)
      {
        allocs.push({ name: target.name, pool: value.callee.object.name, line: node.loc.start.line, at: node.end });
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

    for (const alloc of allocs)
    {
      if (marked(lines, alloc.line, "pool-return:")) continue;
      const releases = unallocs.filter(u => u.name === alloc.name);
      const where = `${relativeFile}:${alloc.line} ${name || "(anonymous)"}`;
      if (!releases.length) { poolProblems.push(`${where}: ${alloc.pool}.alloc() for "${alloc.name}" is never given back`); continue; }
      for (const release of releases)
      {
        if (release.pool !== alloc.pool) poolProblems.push(`${where}: "${alloc.name}" is ${alloc.pool}.alloc() but released with ${release.pool}.unalloc()`);
      }
      if (releases.some(u => u.inFinally)) continue;
      const first = Math.min(...releases.map(u => u.at));
      const early = exits.find(e => e.at > alloc.at && e.at < first);
      if (early) poolProblems.push(`${where}: a ${early.node.type === "ThrowStatement" ? "throw" : "return"} at line ${early.line} leaves "${alloc.name}" unreleased`);
      const returnsIt = exits.find(e => e.node.type === "ReturnStatement" && e.node.argument?.type === "Identifier" && e.node.argument.name === alloc.name);
      if (returnsIt) poolProblems.push(`${where}: "${alloc.name}" is returned to the caller without a // pool-return: marker`);
    }
    if (allocs.length && !recursive) poolInfo.push(`${relativeFile}:${allocs[0].line} ${name || "(anonymous)"}: ${allocs.length} pool scratch value(s) in a function that does not call itself`);
  }

  return { allocations, poolProblems, poolInfo };
}