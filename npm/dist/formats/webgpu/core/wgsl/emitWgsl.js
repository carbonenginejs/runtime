import { lowerDxbcToIr } from '../ir/lowerDxbcToIr.js';
import { lowerComputeProgram } from './lowerComputeProgram.js';
import { lowerFragmentProgram } from './lowerFragmentProgram.js';
import { lowerVertexProgram } from './lowerVertexProgram.js';

const COMPONENTS = ["x", "y", "z", "w"];
const SAFE_WORKGROUP_IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]*$/u;
const WORKGROUP_ELEMENT_BYTES = 4;
const MAX_WORKGROUP_VARIABLE_BYTES = 16 * 1024;
const WGSL_RESERVED_IDENTIFIERS = new Set(["NULL", "Self", "abstract", "active", "alias", "alignas", "alignof", "array", "as", "asm", "asm_fragment", "async", "atomic", "attribute", "auto", "await", "become", "binding_array", "bool", "break", "case", "cast", "catch", "class", "co_await", "co_return", "co_yield", "coherent", "column_major", "common", "compile", "compile_fragment", "concept", "const", "const_assert", "const_cast", "consteval", "constexpr", "constinit", "continue", "continuing", "crate", "debug", "debugger", "decltype", "default", "delete", "demote", "demote_to_helper", "diagnostic", "discard", "do", "dynamic_cast", "else", "enable", "enum", "explicit", "export", "extends", "extern", "external", "f16", "f32", "fallthrough", "false", "filter", "final", "finally", "fn", "for", "friend", "from", "fxgroup", "get", "goto", "groupshared", "highp", "i32", "if", "impl", "implements", "import", "inline", "instanceof", "interface", "layout", "let", "loop", "lowp", "macro", "macro_rules", "match", "mediump", "meta", "mod", "module", "move", "mut", "mutable", "namespace", "new", "nil", "noexcept", "noinline", "nointerpolation", "noperspective", "null", "nullptr", "of", "operator", "override", "package", "packoffset", "partition", "pass", "patch", "pixelfragment", "precise", "precision", "premerge", "priv", "protected", "ptr", "pub", "public", "readonly", "ref", "regardless", "register", "reinterpret_cast", "require", "requires", "resource", "restrict", "return", "sampler", "sampler_comparison", "self", "set", "shared", "sizeof", "smooth", "snorm", "static", "static_assert", "static_cast", "std", "struct", "subroutine", "super", "switch", "target", "template", "this", "thread_local", "throw", "trait", "true", "try", "type", "typedef", "typeid", "typename", "typeof", "u32", "union", "unless", "unorm", "unsafe", "unsized", "use", "using", "var", "varying", "vec2", "vec3", "vec4", "virtual", "volatile", "wgsl", "where", "while", "with", "writeonly", "yield"]);
function attribute(field, invariantPosition = false) {
  if (field.attribute.kind !== "builtin") {
    const interpolate = field.interpolation ? ` @interpolate(${field.interpolation})` : "";
    return `@location(${field.attribute.index})${interpolate}`;
  }
  const invariant = invariantPosition && field.attribute.name === "position" ? "@invariant " : "";
  return `${invariant}@builtin(${field.attribute.name})`;
}
function access(base, field, components) {
  const natural = COMPONENTS.slice(0, field.components.length);
  const suffix = components.length === natural.length && components.every((component, index) => component === natural[index]) ? "" : `.${components.join("")}`;
  return `${base}.${field.name}${suffix}`;
}
function f32Literal(value) {
  const number = value.float32;
  if (!Number.isFinite(number) || Object.is(number, -0)) {
    return `bitcast<f32>(0x${(value.uint32 >>> 0).toString(16).padStart(8, "0")}u)`;
  }
  const text = String(number);
  return /[.eE]/u.test(text) ? text : `${text}.0`;
}
function emitImmediateConstantBuffer(lines, rows) {
  const vectors = rows.map(row => `vec4<f32>(${row.map(f32Literal).join(", ")})`);
  lines.push(`const icb = array<vec4<f32>, ${rows.length}>(${vectors.join(", ")});`, "");
}
function emitConstTables(lines, tables) {
  for (const table of tables) {
    const vectors = table.rows.map(row => `vec4<f32>(${row.map(f32Literal).join(", ")})`);
    lines.push(`const ${table.symbol} = array<vec4<f32>, ${table.rows.length}>(${vectors.join(", ")});`, "");
  }
}
function emitStruct(lines, name, fields, invariantPosition = false) {
  lines.push(`struct ${name}`, "{");
  for (const field of fields) {
    lines.push(`    ${attribute(field, invariantPosition)} ${field.name}: ${field.type},`);
  }
  lines.push("};", "");
}
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const entry of Object.values(value)) deepFreeze(entry);
  return Object.freeze(value);
}

/**
 * Formats the closed compute-builtin subset accepted by the WGSL emitter.
 *
 * @param {object} program Typed shader program.
 * @returns {string} WGSL entry-point parameter list.
 */
function computeEntryPointParameters(program) {
  const inputs = program?.builtinInputs;
  if (inputs === undefined) return "";
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error("WGSL compute builtinInputs must be a non-empty array");
  }
  const names = new Set();
  const builtins = new Set();
  for (const input of inputs) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("WGSL compute builtin input must be an object");
    }
    const keys = Object.keys(input).sort();
    if (keys.length !== 3 || keys[0] !== "builtin" || keys[1] !== "name" || keys[2] !== "type") {
      throw new Error("WGSL compute builtin input contains unsupported metadata");
    }
    if (typeof input.builtin !== "string" || typeof input.name !== "string" || typeof input.type !== "string") {
      throw new Error("WGSL compute builtin input fields must be strings");
    }
    if (builtins.has(input.builtin)) {
      throw new Error(`WGSL compute builtin input duplicates ${input.builtin}`);
    }
    if (names.has(input.name)) {
      throw new Error(`WGSL compute builtin input duplicates parameter ${input.name}`);
    }
    builtins.add(input.builtin);
    names.add(input.name);
  }
  const signature = inputs.map(input => `${input.builtin}:${input.name}:${input.type}`).join("|");
  if (signature === "global_invocation_id:dispatch_thread_id:vec3<u32>") {
    return "@builtin(global_invocation_id) dispatch_thread_id: vec3<u32>";
  }
  if (signature === "local_invocation_id:local_invocation_id:vec3<u32>") {
    return "@builtin(local_invocation_id) local_invocation_id: vec3<u32>";
  }
  if (signature === "local_invocation_index:local_invocation_index:u32") {
    return "@builtin(local_invocation_index) local_invocation_index: u32";
  }
  if (signature === "local_invocation_id:local_invocation_id:vec3<u32>|" + "global_invocation_id:dispatch_thread_id:vec3<u32>") {
    return "@builtin(local_invocation_id) local_invocation_id: vec3<u32>, " + "@builtin(global_invocation_id) dispatch_thread_id: vec3<u32>";
  }
  if (signature === "workgroup_id:workgroup_id:vec3<u32>|" + "local_invocation_id:local_invocation_id:vec3<u32>") {
    return "@builtin(workgroup_id) workgroup_id: vec3<u32>, " + "@builtin(local_invocation_id) local_invocation_id: vec3<u32>";
  }
  if (signature === "workgroup_id:workgroup_id:vec3<u32>|" + "local_invocation_id:local_invocation_id:vec3<u32>|" + "global_invocation_id:dispatch_thread_id:vec3<u32>") {
    return "@builtin(workgroup_id) workgroup_id: vec3<u32>, " + "@builtin(local_invocation_id) local_invocation_id: vec3<u32>, " + "@builtin(global_invocation_id) dispatch_thread_id: vec3<u32>";
  }
  throw new Error("WGSL compute builtinInputs contains an unsupported ordered schema");
}
function collectStatementNames(statements, names) {
  for (const statement of statements || []) {
    if (typeof statement?.name === "string") names.add(statement.name);
    if (Array.isArray(statement?.statements)) collectStatementNames(statement.statements, names);
    if (Array.isArray(statement?.elseStatements)) collectStatementNames(statement.elseStatements, names);
    if (Array.isArray(statement?.continuing)) collectStatementNames(statement.continuing, names);
    for (const clause of statement?.clauses || []) {
      collectStatementNames(clause.statements, names);
    }
  }
}

/**
 * Validates and formats the closed module-scope workgroup-variable schema.
 * The 16 KiB cap is deliberately the WebGPU baseline workgroup-storage limit,
 * applied cumulatively so admitted modules remain portable without querying
 * device-specific limits.
 *
 * @param {object} program Typed shader program.
 * @returns {string[]} Canonical WGSL workgroup variable declarations.
 */
function computeWorkgroupVariableDeclarations(program) {
  const variables = program?.workgroupVariables;
  if (variables === undefined) return [];
  if (program?.stage !== "compute") {
    throw new Error("WGSL workgroupVariables metadata is compute-only");
  }
  if (!Array.isArray(variables) || variables.length === 0) {
    throw new Error("WGSL compute workgroupVariables must be a non-empty array");
  }
  const occupied = new Set();
  if (typeof program.entryPoint === "string") occupied.add(program.entryPoint);
  for (const input of program.builtinInputs || []) {
    if (typeof input?.name === "string") occupied.add(input.name);
  }
  for (const binding of program.bindings || []) {
    if (typeof binding?.generatedSymbol === "string") occupied.add(binding.generatedSymbol);
  }
  if (program.immediateConstantBuffer?.length) occupied.add("icb");
  for (const table of program.constTables || []) {
    if (typeof table?.symbol === "string") occupied.add(table.symbol);
  }
  collectStatementNames(program.statements, occupied);
  const names = new Set();
  const declarations = [];
  let footprint = 0;
  for (const variable of variables) {
    if (!variable || typeof variable !== "object" || Array.isArray(variable)) {
      throw new Error("WGSL compute workgroup variable must be an object");
    }
    const keys = Object.keys(variable).sort();
    if (keys.length !== 3 || keys[0] !== "elementCount" || keys[1] !== "elementType" || keys[2] !== "name") {
      throw new Error("WGSL compute workgroup variable contains unsupported metadata");
    }
    const {
      name,
      elementType,
      elementCount
    } = variable;
    if (typeof name !== "string" || !SAFE_WORKGROUP_IDENTIFIER.test(name) || name.includes("__") || WGSL_RESERVED_IDENTIFIERS.has(name)) {
      throw new Error(`WGSL compute workgroup variable has unsafe name ${JSON.stringify(name)}`);
    }
    if (elementType !== "u32" && elementType !== "atomic<u32>") {
      throw new Error(`WGSL compute workgroup variable ${name} has unsupported element type`);
    }
    if (!Number.isSafeInteger(elementCount) || elementCount < 1) {
      throw new Error(`WGSL compute workgroup variable ${name} requires a positive safe-integer elementCount`);
    }
    if (names.has(name)) {
      throw new Error(`WGSL compute workgroup variable duplicates ${name}`);
    }
    if (occupied.has(name)) {
      throw new Error(`WGSL compute workgroup variable ${name} collides with another shader symbol`);
    }
    footprint += elementCount * WORKGROUP_ELEMENT_BYTES;
    if (footprint > MAX_WORKGROUP_VARIABLE_BYTES) {
      throw new Error("WGSL compute workgroupVariables exceed the conservative 16 KiB footprint");
    }
    names.add(name);
    declarations.push(`var<workgroup> ${name}: array<${elementType}, ${elementCount}>;`);
  }
  return declarations;
}

/**
 * Builds deterministic WGSL and a DXBC-offset source map for the supported IR.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView|object} input DXBC or CJS IR.
 * @param {object} [options] Source/provenance options.
 * @returns {object} Frozen WGSL shader descriptor.
 */
function buildWgsl(input, options = {}) {
  if (options.precisionPolicy !== undefined) {
    throw new TypeError("WGSL precisionPolicy is not supported; precise controls require exact lowering");
  }
  const ir = input?.format === "CJS_SHADER_IR" ? input : lowerDxbcToIr(input, options);
  let program;
  if (ir.stage === "vertex") program = lowerVertexProgram(ir, options);else if (ir.stage === "pixel") program = lowerFragmentProgram(ir, options);else if (ir.stage === "compute") program = lowerComputeProgram(ir, options);else throw new Error(`WGSL lowering does not support the ${ir.stage || "unknown"} shader stage`);
  const lines = [];
  const sourceMap = [];
  const compute = program.stage === "compute";
  if (!compute && program.builtinInputs !== undefined) {
    throw new Error("WGSL render lowering cannot emit compute builtinInputs");
  }
  const prefix = program.stage === "vertex" ? "Vertex" : "Fragment";
  if (program.requiresDerivativeUniformityOptOut) {
    // This shader computes a screen-space derivative / implicit-LOD sample
    // inside non-uniform control flow, which WGSL forbids by default. The
    // DXBC source relied on D3D11's permissive behavior; this module-level
    // filter reproduces it (a standard WGSL opt-out) rather than rejecting
    // the shader. Neighbor lanes that skip the branch yield undefined
    // derivatives there, exactly as under D3D11.
    lines.push("diagnostic(off, derivative_uniformity);", "");
  }
  const interfaceInputs = compute ? [] : program.interface.inputs;
  const interfaceOutputs = compute ? [] : program.interface.outputs;
  const hasInputs = interfaceInputs.length > 0;
  if (hasInputs) emitStruct(lines, `${prefix}Input`, interfaceInputs);
  if (!compute) emitStruct(lines, `${prefix}Output`, interfaceOutputs, program.stage === "vertex");
  if (program.immediateConstantBuffer?.length) emitImmediateConstantBuffer(lines, program.immediateConstantBuffer);
  if (program.constTables?.length) emitConstTables(lines, program.constTables);
  const workgroupDeclarations = computeWorkgroupVariableDeclarations(program);
  if (workgroupDeclarations.length) lines.push(...workgroupDeclarations, "");
  for (const binding of program.bindings || []) {
    lines.push(`@group(${binding.group}) @binding(${binding.binding}) ${binding.declaration} ${binding.generatedSymbol}: ${binding.type};`);
  }
  if (program.bindings?.length) lines.push("");
  if (compute) {
    const size = program.threadGroupSize;
    if (!Array.isArray(size) || size.length !== 3 || size.some(value => !Number.isSafeInteger(value) || value < 1)) {
      throw new Error("WGSL compute lowering requires a positive three-dimensional threadGroupSize");
    }
    const parameters = computeEntryPointParameters(program);
    lines.push(`@compute @workgroup_size(${size.join(", ")})`, `fn ${program.entryPoint}(${parameters})`, "{");
  } else {
    const parameters = hasInputs ? `input: ${prefix}Input` : "";
    lines.push(`@${program.stage}`, `fn ${program.entryPoint}(${parameters}) -> ${prefix}Output`, "{", `    var output: ${prefix}Output;`);
  }
  const inputById = new Map(interfaceInputs.map(field => [field.id, field]));
  const outputById = new Map(interfaceOutputs.map(field => [field.id, field]));
  function emitStatement(statement, depth) {
    const indent = "    ".repeat(depth);
    const line = lines.length + 1;
    if (statement.kind === "assignment") {
      if (compute) throw new Error("WGSL compute lowering cannot emit a render-interface assignment");
      const targetField = outputById.get(statement.target.fieldId);
      if (statement.expression.fieldId) {
        const sourceField = inputById.get(statement.expression.fieldId);
        lines.push(`${indent}${access("output", targetField, statement.target.components)} = ${access("input", sourceField, statement.expression.components)};`);
      } else {
        lines.push(`${indent}${access("output", targetField, statement.target.components)} = ${statement.expression.code};`);
      }
    } else if (statement.kind === "let") {
      lines.push(`${indent}let ${statement.name}: ${statement.type} = ${statement.expression.code};`);
    } else if (statement.kind === "var") {
      lines.push(statement.expression ? `${indent}var ${statement.name}: ${statement.type} = ${statement.expression.code};` : `${indent}var ${statement.name}: ${statement.type};`);
    } else if (statement.kind === "value-assignment") {
      lines.push(`${indent}${statement.name} = ${statement.expression.code};`);
    } else if (statement.kind === "return") {
      lines.push(compute ? `${indent}return;` : `${indent}return output;`);
    } else if (statement.kind === "discard") {
      lines.push(`${indent}discard;`);
    } else if (statement.kind === "call") {
      lines.push(`${indent}${statement.expression.code};`);
    } else if (statement.kind === "if") {
      lines.push(`${indent}if (${statement.condition.code})`, `${indent}{`);
      sourceMap.push({
        line,
        instructionIndex: statement.instructionIndex,
        dxbcOffset: statement.dxbcOffset
      });
      for (const child of statement.statements) emitStatement(child, depth + 1);
      lines.push(`${indent}}`);
      if (statement.elseStatements?.length) {
        lines.push(`${indent}else`, `${indent}{`);
        for (const child of statement.elseStatements) emitStatement(child, depth + 1);
        lines.push(`${indent}}`);
      }
      return;
    } else if (statement.kind === "break") {
      lines.push(`${indent}break;`);
    } else if (statement.kind === "continue") {
      lines.push(`${indent}continue;`);
    } else if (statement.kind === "loop") {
      lines.push(`${indent}loop`, `${indent}{`);
      sourceMap.push({
        line,
        instructionIndex: statement.instructionIndex,
        dxbcOffset: statement.dxbcOffset
      });
      for (const child of statement.statements) emitStatement(child, depth + 1);
      if (statement.continuing?.length) {
        lines.push(`${indent}    continuing`, `${indent}    {`);
        for (const child of statement.continuing) emitStatement(child, depth + 2);
        lines.push(`${indent}    }`);
      }
      lines.push(`${indent}}`);
      return;
    } else if (statement.kind === "switch") {
      lines.push(`${indent}switch (${statement.selector.code})`, `${indent}{`);
      sourceMap.push({
        line,
        instructionIndex: statement.instructionIndex,
        dxbcOffset: statement.dxbcOffset
      });
      for (const clause of statement.clauses) {
        const selectors = clause.selectors.map(value => `${value}u`);
        if (clause.isDefault) selectors.push("default");
        const label = selectors.length === 1 && clause.isDefault ? "default" : `case ${selectors.join(", ")}`;
        lines.push(`${indent}    ${label}:`, `${indent}    {`);
        for (const child of clause.statements) emitStatement(child, depth + 2);
        lines.push(`${indent}    }`);
      }
      if (!statement.clauses.some(clause => clause.isDefault)) {
        lines.push(`${indent}    default:`, `${indent}    {`, `${indent}    }`);
      }
      lines.push(`${indent}}`);
      return;
    }
    if (Number.isInteger(statement.instructionIndex) && Number.isInteger(statement.dxbcOffset)) {
      sourceMap.push({
        line,
        instructionIndex: statement.instructionIndex,
        dxbcOffset: statement.dxbcOffset
      });
    }
  }
  for (const statement of program.statements) emitStatement(statement, 1);
  lines.push("}", "");
  return deepFreeze({
    kind: "wgsl-shader",
    format: "CJS_WGSL_SHADER",
    formatVersion: 1,
    source: program.source,
    stage: program.stage,
    entryPoint: program.entryPoint,
    code: lines.join("\n"),
    sourceMap,
    ...(compute ? {
      threadGroupSize: program.threadGroupSize
    } : {}),
    program
  });
}

export { buildWgsl, computeEntryPointParameters, computeWorkgroupVariableDeclarations };
//# sourceMappingURL=emitWgsl.js.map
