import { analyzeRegisterValues } from '../ir/analyzeRegisterValues.js';
import { buildControlFlow } from '../ir/buildControlFlow.js';
import { inferValueTypes } from '../ir/inferValueTypes.js';
import { resolveRegisterFlow } from '../ir/resolveRegisterFlow.js';
import { lowerBindingLayout } from './lowerBindingLayout.js';
import { requireRefactoringAllowed } from './precisionControls.js';
import { buildSelectionPlans } from './selectionPlans.js';

const DECLARATION_OPCODES = Object.freeze(["dcl_global_flags", "dcl_constant_buffer", "dcl_resource", "dcl_unordered_access_view_typed", "dcl_input", "dcl_input", "dcl_input", "dcl_temps", "dcl_thread_group_shared_memory_structured", "dcl_thread_group"]);
const BLOCK_BEFORE = new Set(["loop", "else", "endif", "endloop", "case", "default", "endswitch"]);
const BLOCK_AFTER = new Set(["if", "loop", "switch", "break", "breakc", "continue", "continuec", "ret", "retc", "discard", "else", "endif", "endloop", "case", "default", "endswitch"]);
const CONTROL_KIND = Object.freeze({
  if: "selection",
  endif: "selection",
  ret: "termination"
});
const SYNC_NAMES = Object.freeze(["threads_in_group", "thread_group_shared_memory"]);
function expectedOperand(typeName, registerIndex, selectionModeName, selector = "", immediateValues = [], modifierName = "none", componentCount = 4) {
  return Object.freeze({
    typeName,
    registerIndex,
    componentCount,
    selectionModeName,
    selector,
    immediateValues: Object.freeze(immediateValues),
    modifierName
  });
}
const mask = (typeName, registerIndex, selector) => expectedOperand(typeName, registerIndex, "mask", selector);
const swizzle = (typeName, registerIndex, selector, modifierName = "none") => expectedOperand(typeName, registerIndex, "swizzle", selector, [], modifierName);
const select = (typeName, registerIndex, selector, modifierName = "none") => expectedOperand(typeName, registerIndex, "select1", selector, [], modifierName);
const none = (typeName, registerIndex, componentCount = 0) => expectedOperand(typeName, registerIndex, "none", "", [], "none", componentCount);
const immediate = (...values) => expectedOperand("immediate32", null, values.length === 1 ? "none" : "mask", "", values, "none", values.length);
const body = (opcodeName, operands = [], options = {}) => Object.freeze({
  opcodeName,
  operands: Object.freeze(operands),
  saturate: options.saturate === true,
  testBoolean: options.testBoolean ?? null,
  resinfoReturnTypeName: options.resinfoReturnTypeName
});
const BODY_SM50 = Object.freeze([body("resinfo", [mask("temp", 0, "xy"), immediate(0), swizzle("resource", 0, "xyzw")], {
  resinfoReturnTypeName: "uint"
}), body("imad", [mask("temp", 0, "z"), select("input_thread_id_in_group", null, "y"), immediate(16), select("input_thread_id_in_group", null, "x")]), body("ult", [mask("temp", 1, "xy"), swizzle("temp", 0, "zzzz"), immediate(64, 16, 0, 0)]), body("if", [select("temp", 1, "x")], {
  testBoolean: "nonzero"
}), body("store_structured", [mask("thread_group_shared_memory", 0, "x"), select("temp", 0, "z"), immediate(0), immediate(0)]), body("endif"), body("sync"), body("ult", [mask("temp", 0, "xy"), swizzle("input_thread_id", null, "xyxx"), swizzle("temp", 0, "xyxx")]), body("and", [mask("temp", 0, "x"), select("temp", 0, "y"), select("temp", 0, "x")]), body("if", [select("temp", 0, "x")], {
  testBoolean: "nonzero"
}), body("mov", [mask("temp", 2, "xy"), swizzle("input_thread_id", null, "xyxx")]), body("mov", [mask("temp", 2, "zw"), immediate(0, 0, 0, 0)]), body("ld", [mask("temp", 0, "xyw"), swizzle("temp", 2, "xyzw"), swizzle("resource", 0, "xywz")]), body("lt", [mask("temp", 1, "xzw"), swizzle("temp", 0, "xxyw"), immediate(1025879765, 0, 1025879765, 1025879765)]), body("mul", [mask("temp", 2, "xyz"), swizzle("temp", 0, "xywx"), immediate(1033798545, 1033798545, 1033798545, 0)]), body("add", [mask("temp", 0, "xyw"), swizzle("temp", 0, "xyxw"), immediate(1029785518, 1029785518, 0, 1029785518)]), body("mul", [mask("temp", 0, "xyw"), swizzle("temp", 0, "xyxw"), immediate(1064478575, 1064478575, 0, 1064478575)]), body("log", [mask("temp", 0, "xyw"), swizzle("temp", 0, "xyxw", "abs")]), body("mul", [mask("temp", 0, "xyw"), swizzle("temp", 0, "xyxw"), immediate(1075419546, 1075419546, 0, 1075419546)]), body("exp", [mask("temp", 0, "xyw"), swizzle("temp", 0, "xyxw")]), body("movc", [mask("temp", 0, "xyw"), swizzle("temp", 1, "xzxw"), swizzle("temp", 2, "xyxz"), swizzle("temp", 0, "xyxw")]), body("dp3", [mask("temp", 0, "x"), swizzle("temp", 0, "xywx"), immediate(1046059418, 1060578420, 1033087274, 0)]), body("log", [mask("temp", 0, "x"), select("temp", 0, "x")]), body("mad", [mask("temp", 0, "x"), select("temp", 0, "x"), immediate(1060205080), select("constant_buffer", 0, "x", "neg")]), body("add", [mask("temp", 0, "y"), select("constant_buffer", 0, "x", "neg"), select("constant_buffer", 0, "y")]), body("div", [mask("temp", 0, "x"), select("temp", 0, "x"), select("temp", 0, "y")], {
  saturate: true
}), body("mul", [mask("temp", 0, "x"), select("temp", 0, "x"), immediate(1115684864)]), body("ftoi", [mask("temp", 0, "x"), select("temp", 0, "x")]), body("imin", [mask("temp", 0, "x"), select("temp", 0, "x"), immediate(63)]), body("mov", [mask("temp", 0, "y"), immediate(0)]), body("atomic_iadd", [none("thread_group_shared_memory", 0), swizzle("temp", 0, "xyxx"), immediate(1)]), body("endif"), body("sync"), body("if", [select("temp", 1, "y")], {
  testBoolean: "nonzero"
}), body("ftou", [mask("temp", 0, "x"), select("constant_buffer", 0, "z")]), body("imad", [mask("temp", 0, "x"), select("input_thread_group_id", null, "y"), select("temp", 0, "x"), select("input_thread_group_id", null, "x")]), body("ishl", [mask("temp", 0, "x"), select("temp", 0, "x"), immediate(4)]), body("ishl", [mask("temp", 0, "y"), select("input_thread_id_in_group", null, "x"), immediate(2)]), body("imad", [mask("temp", 0, "y"), select("input_thread_id_in_group", null, "y"), immediate(64), select("temp", 0, "y")]), body("iadd", [mask("temp", 0, "x"), select("temp", 0, "x"), select("temp", 0, "z")]), body("ld_structured", [mask("temp", 1, "x"), select("temp", 0, "y"), immediate(0), swizzle("thread_group_shared_memory", 0, "xxxx")]), body("iadd", [mask("temp", 0, "yw"), swizzle("temp", 0, "yyyy"), immediate(0, 1, 0, 3)]), body("ld_structured", [mask("temp", 1, "y"), select("temp", 0, "y"), immediate(0), swizzle("thread_group_shared_memory", 0, "xxxx")]), body("imad", [mask("temp", 0, "y"), select("temp", 0, "z"), immediate(4), immediate(2)]), body("ld_structured", [mask("temp", 1, "z"), select("temp", 0, "y"), immediate(0), swizzle("thread_group_shared_memory", 0, "xxxx")]), body("ld_structured", [mask("temp", 1, "w"), select("temp", 0, "w"), immediate(0), swizzle("thread_group_shared_memory", 0, "xxxx")]), body("store_uav_typed", [mask("uav", 0, "xyzw"), swizzle("temp", 0, "xxxx"), swizzle("temp", 1, "xyzw")]), body("endif"), body("ret")]);
const BODY_SM51 = Object.freeze([body("resinfo", [mask("temp", 0, "xy"), immediate(0), swizzle("resource", 0, "xyzw")], {
  resinfoReturnTypeName: "uint"
}), body("imad", [mask("temp", 0, "z"), select("input_thread_id_in_group", null, "y"), immediate(16), select("input_thread_id_in_group", null, "x")]), body("ftou", [mask("temp", 0, "w"), select("constant_buffer", 0, "z")]), body("ult", [mask("temp", 1, "xy"), swizzle("temp", 0, "zzzz"), immediate(64, 16, 0, 0)]), body("if", [select("temp", 1, "x")], {
  testBoolean: "nonzero"
}), body("store_structured", [mask("thread_group_shared_memory", 0, "x"), select("temp", 0, "z"), immediate(0), immediate(0)]), body("endif"), body("sync"), body("ult", [mask("temp", 0, "xy"), swizzle("input_thread_id", null, "xyxx"), swizzle("temp", 0, "xyxx")]), body("and", [mask("temp", 0, "x"), select("temp", 0, "y"), select("temp", 0, "x")]), body("if", [select("temp", 0, "x")], {
  testBoolean: "nonzero"
}), body("mov", [mask("temp", 2, "xy"), swizzle("input_thread_id", null, "xyxx")]), body("mov", [mask("temp", 2, "zw"), immediate(0, 0, 0, 0)]), body("ld", [mask("temp", 1, "xzw"), swizzle("temp", 2, "xyzw"), swizzle("resource", 0, "xwyz")]), body("lt", [mask("temp", 2, "xyz"), swizzle("temp", 1, "xzwx"), immediate(1025879765, 1025879765, 1025879765, 0)]), body("mul", [mask("temp", 3, "xyz"), swizzle("temp", 1, "xzwx"), immediate(1033798545, 1033798545, 1033798545, 0)]), body("add", [mask("temp", 1, "xzw"), swizzle("temp", 1, "xxzw"), immediate(1029785518, 0, 1029785518, 1029785518)]), body("mul", [mask("temp", 1, "xzw"), swizzle("temp", 1, "xxzw"), immediate(1064478575, 0, 1064478575, 1064478575)]), body("log", [mask("temp", 1, "xzw"), swizzle("temp", 1, "xxzw", "abs")]), body("mul", [mask("temp", 1, "xzw"), swizzle("temp", 1, "xxzw"), immediate(1075419546, 0, 1075419546, 1075419546)]), body("exp", [mask("temp", 1, "xzw"), swizzle("temp", 1, "xxzw")]), body("movc", [mask("temp", 1, "xzw"), swizzle("temp", 2, "xxyz"), swizzle("temp", 3, "xxyz"), swizzle("temp", 1, "xxzw")]), body("dp3", [mask("temp", 0, "x"), swizzle("temp", 1, "xzwx"), immediate(1046059418, 1060578420, 1033087274, 0)]), body("log", [mask("temp", 0, "x"), select("temp", 0, "x")]), body("mad", [mask("temp", 0, "x"), select("temp", 0, "x"), immediate(1060205080), select("constant_buffer", 0, "x", "neg")]), body("add", [mask("temp", 0, "y"), select("constant_buffer", 0, "x", "neg"), select("constant_buffer", 0, "y")]), body("div", [mask("temp", 0, "x"), select("temp", 0, "x"), select("temp", 0, "y")], {
  saturate: true
}), body("mul", [mask("temp", 0, "x"), select("temp", 0, "x"), immediate(1115684864)]), body("ftoi", [mask("temp", 0, "x"), select("temp", 0, "x")]), body("imin", [mask("temp", 0, "x"), select("temp", 0, "x"), immediate(63)]), body("mov", [mask("temp", 0, "y"), immediate(0)]), body("atomic_iadd", [none("thread_group_shared_memory", 0), swizzle("temp", 0, "xyxx"), immediate(1)]), body("endif"), body("sync"), body("if", [select("temp", 1, "y")], {
  testBoolean: "nonzero"
}), body("imad", [mask("temp", 0, "x"), select("input_thread_group_id", null, "y"), select("temp", 0, "w"), select("input_thread_group_id", null, "x")]), body("ishl", [mask("temp", 0, "x"), select("temp", 0, "x"), immediate(4)]), body("ishl", [mask("temp", 0, "y"), select("input_thread_id_in_group", null, "x"), immediate(2)]), body("imad", [mask("temp", 0, "y"), select("input_thread_id_in_group", null, "y"), immediate(64), select("temp", 0, "y")]), body("iadd", [mask("temp", 0, "x"), select("temp", 0, "x"), select("temp", 0, "z")]), body("ld_structured", [mask("temp", 1, "x"), select("temp", 0, "y"), immediate(0), swizzle("thread_group_shared_memory", 0, "xxxx")]), body("iadd", [mask("temp", 0, "yw"), swizzle("temp", 0, "yyyy"), immediate(0, 1, 0, 3)]), body("ld_structured", [mask("temp", 1, "y"), select("temp", 0, "y"), immediate(0), swizzle("thread_group_shared_memory", 0, "xxxx")]), body("imad", [mask("temp", 0, "y"), select("temp", 0, "z"), immediate(4), immediate(2)]), body("ld_structured", [mask("temp", 1, "z"), select("temp", 0, "y"), immediate(0), swizzle("thread_group_shared_memory", 0, "xxxx")]), body("ld_structured", [mask("temp", 1, "w"), select("temp", 0, "w"), immediate(0), swizzle("thread_group_shared_memory", 0, "xxxx")]), body("store_uav_typed", [mask("uav", 0, "xyzw"), swizzle("temp", 0, "xxxx"), swizzle("temp", 1, "xyzw")]), body("endif"), body("ret")]);
function clonePlain(value) {
  if (Array.isArray(value)) return value.map(clonePlain);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clonePlain(entry)]));
  }
  return value;
}
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const entry of Object.values(value)) deepFreeze(entry);
  return Object.freeze(value);
}
function buildBlocks(instructions) {
  const leaders = new Set([0]);
  for (let index = 0; index < instructions.length; index += 1) {
    if (BLOCK_BEFORE.has(instructions[index].opcodeName)) leaders.add(index);
    if (BLOCK_AFTER.has(instructions[index].opcodeName) && index + 1 < instructions.length) {
      leaders.add(index + 1);
    }
  }
  const starts = Array.from(leaders).sort((left, right) => left - right);
  return starts.map((start, blockIndex) => {
    const end = (starts[blockIndex + 1] ?? instructions.length) - 1;
    const last = instructions[end];
    return {
      kind: "basic-block",
      id: `block${blockIndex}`,
      index: blockIndex,
      startInstruction: start,
      endInstruction: end,
      startDxbcOffset: instructions[start].dxbcOffset,
      endDxbcOffset: last.dxbcOffset,
      instructionIndices: Array.from({
        length: end - start + 1
      }, (_, offset) => start + offset),
      terminator: CONTROL_KIND[last.opcodeName] ? last.opcodeName : null
    };
  });
}
function analysisSnapshot(program) {
  return {
    blocks: program.blocks,
    controlFlow: program.controlFlow,
    values: program.values,
    instructions: program.instructions.map(instruction => ({
      dataflow: instruction.dataflow,
      typeInfo: instruction.typeInfo
    }))
  };
}
function firstDifference(left, right, path = "$") {
  if (Object.is(left, right)) return null;
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return `${path}.length (${left.length} != ${right.length})`;
    }
    for (let index = 0; index < left.length; index += 1) {
      const difference = firstDifference(left[index], right[index], `${path}[${index}]`);
      if (difference) return difference;
    }
    return null;
  }
  if (left && right && typeof left === "object" && typeof right === "object") {
    const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort();
    for (const key of keys) {
      const difference = firstDifference(left[key], right[key], `${path}.${key}`);
      if (difference) return difference;
    }
    return null;
  }
  return `${path} (${JSON.stringify(left)} != ${JSON.stringify(right)})`;
}
function validateAnalysisMetadata(program) {
  const rebuilt = clonePlain(program);
  rebuilt.instructions = rebuilt.instructions.map(instruction => {
    delete instruction.dataflow;
    delete instruction.typeInfo;
    return instruction;
  });
  rebuilt.blocks = buildBlocks(rebuilt.instructions);
  delete rebuilt.controlFlow;
  delete rebuilt.values;
  buildControlFlow(rebuilt);
  analyzeRegisterValues(rebuilt);
  resolveRegisterFlow(rebuilt);
  inferValueTypes(rebuilt);
  const originalSnapshot = analysisSnapshot(program);
  const rebuiltSnapshot = analysisSnapshot(rebuilt);
  if (JSON.stringify(originalSnapshot) !== JSON.stringify(rebuiltSnapshot)) {
    const difference = firstDifference(originalSnapshot, rebuiltSnapshot);
    throw new Error("WGSL create-histograms compute CFG, SSA, or type metadata is inconsistent" + (difference ? ` at ${difference}` : ""));
  }
}
function selector(operand) {
  return operand.mask || operand.swizzle || operand.selected || "";
}
function isCanonicalIndex(entry, dimension, value) {
  return entry?.dimension === dimension && entry.representation === 0 && entry.relative === null && entry.values?.length === 1 && entry.values[0] === value;
}
function validateCanonicalIndices(operand, expected, context) {
  if (operand.indices?.length !== expected.length || expected.some((value, dimension) => !isCanonicalIndex(operand.indices[dimension], dimension, value))) {
    throw new Error(`WGSL create-histograms ${context} has non-canonical index metadata`);
  }
}
function validateSm51Range(data, context) {
  const range = data?.bindingRange;
  if (data?.bindingModel !== "sm5.1-range" || range?.bindingModel !== "sm5.1-range" || range.rangeId !== 0 || range.lowerBound !== 0 || range.upperBound !== 0 || range.unbounded !== false || range.registerCount !== 1 || range.registerSpace !== 0) {
    throw new Error(`WGSL create-histograms ${context} requires one finite SM5.1 range`);
  }
}
function expectedIndices(typeName, registerIndex, minor, declaration) {
  if (!Number.isInteger(registerIndex)) return [];
  if (typeName === "constant_buffer") {
    return minor === 0 ? [registerIndex, declaration ? 1 : 0] : [0, registerIndex, declaration ? 0 : 0];
  }
  if (["resource", "uav"].includes(typeName)) {
    return minor === 0 ? [registerIndex] : declaration ? [0, registerIndex, 0] : [0, registerIndex];
  }
  return [registerIndex];
}
function validateSm51Reference(operand, context) {
  const reference = operand.resourceReference;
  if (["resource", "uav"].includes(operand.typeName)) {
    if (reference?.bindingModel !== "sm5.1-range" || reference.rangeId !== 0 || reference.nonUniform !== false || !isCanonicalIndex(reference.absoluteIndex, 1, 0) || reference.bufferIndex !== null || reference.vectorOffset !== null) {
      throw new Error(`WGSL create-histograms ${context} has an invalid SM5.1 resource reference`);
    }
  } else if (operand.typeName === "constant_buffer") {
    if (reference?.bindingModel !== "sm5.1-range" || reference.rangeId !== 0 || reference.nonUniform !== false || reference.absoluteIndex !== null || !isCanonicalIndex(reference.bufferIndex, 1, 0) || !isCanonicalIndex(reference.vectorOffset, 2, 0)) {
      throw new Error(`WGSL create-histograms ${context} has an invalid SM5.1 constant-buffer reference`);
    }
  } else if (reference !== undefined && reference !== null) {
    throw new Error(`WGSL create-histograms ${context} has unexpected resource reference metadata`);
  }
}
function validateOperand(operand, expected, minor, context, declaration = false) {
  if (!operand || operand.typeName !== expected.typeName || operand.registerIndex !== expected.registerIndex || operand.componentCount !== expected.componentCount || operand.selectionModeName !== expected.selectionModeName || selector(operand) !== expected.selector || operand.modifierName !== expected.modifierName || operand.minPrecisionName !== "default" || operand.nonUniform !== false || operand.immediateValues?.length !== expected.immediateValues.length || expected.immediateValues.some((value, index) => operand.immediateValues[index]?.uint32 !== value)) {
    throw new Error(`WGSL create-histograms ${context} does not match the exact operand`);
  }
  validateCanonicalIndices(operand, expectedIndices(expected.typeName, expected.registerIndex, minor, declaration), context);
  if (declaration) {
    if (operand.resourceReference !== undefined && operand.resourceReference !== null) {
      throw new Error(`WGSL create-histograms ${context} has unexpected reference metadata`);
    }
  } else if (minor === 1) {
    validateSm51Reference(operand, context);
  } else if (operand.resourceReference !== undefined && operand.resourceReference !== null) {
    throw new Error(`WGSL create-histograms ${context} has unexpected SM5.1 reference metadata`);
  }
}

/**
 * Whether declarations select the isolated create-histograms compute family.
 * Detailed validation is final after this selector matches.
 *
 * @param {object} program CJS shader IR program.
 * @returns {boolean} True for the dedicated declaration family.
 */
function isCreateHistogramsComputeProfile(program) {
  return program?.stage === "compute" && program.declarations?.length === DECLARATION_OPCODES.length && program.instructions?.length === 49 && DECLARATION_OPCODES.every((opcodeName, index) => program.declarations[index]?.opcodeName === opcodeName);
}
function validateDeclarationOperand(operand, expected, minor, context) {
  validateOperand(operand, expected, minor, context, true);
}
function validateBuiltinDeclaration(declaration, typeName, operandType, minor) {
  if (declaration.data?.registerIndex !== null || declaration.data.operandType !== operandType || declaration.data.operandTypeName !== typeName || declaration.operands?.length !== 1) {
    throw new Error(`WGSL create-histograms compute requires exactly ${typeName}.xy`);
  }
  validateDeclarationOperand(declaration.operands[0], mask(typeName, null, "xy"), minor, `${typeName} declaration`);
}
function validateDeclarations(program) {
  const minor = program?.shaderModel?.minor;
  if (program?.format !== "CJS_SHADER_IR" || program.formatVersion !== 1 || program.stage !== "compute" || program.shaderModel?.major !== 5 || ![0, 1].includes(minor)) {
    throw new TypeError("WGSL create-histograms compute profile requires CJS SM5.0 or finite-range SM5.1 compute IR");
  }
  if (!isCreateHistogramsComputeProfile(program)) {
    throw new Error("WGSL create-histograms compute declaration shape is not supported");
  }
  if (program.declarations.some(declaration => declaration.tailTokens?.length)) {
    throw new Error("WGSL create-histograms compute declarations must not contain trailing payload words");
  }
  if ((program.signatures?.input || []).length || (program.signatures?.output || []).length || (program.signatures?.patch || []).length || program.immediateConstantBuffer || program.constTables) {
    throw new Error("WGSL create-histograms compute does not support signatures or constant tables");
  }
  requireRefactoringAllowed(program, "create-histograms compute");
  const [global, constants, input, output, groupId, localId, dispatchId, temps, shared, group] = program.declarations;
  if (global.data?.globalFlags !== 1 << 11 || global.data.refactoringAllowed !== true || global.operands?.length) {
    throw new Error("WGSL create-histograms compute requires only the refactoring-allowed global flag");
  }
  if (constants.data?.accessPattern !== "immediate_indexed" || constants.data.registerIndex !== 0 || constants.data.sizeInVec4 !== 1 || constants.operands?.length !== 1) {
    throw new Error("WGSL create-histograms compute requires immediate one-row cb0");
  }
  validateDeclarationOperand(constants.operands[0], swizzle("constant_buffer", 0, "xyzw"), minor, "cb0 declaration");
  if (input.data?.registerIndex !== 0 || input.data.resourceDimension !== 3 || input.data.resourceDimensionName !== "texture2d" || input.data.sampleCount !== 0 || input.data.returnType?.returnTypes?.length !== 4 || input.data.returnType.returnTypes.some(entry => entry !== 5) || input.data.returnType?.returnTypeNames?.length !== 4 || input.data.returnType.returnTypeNames.some(entry => entry !== "float") || input.operands?.length !== 1) {
    throw new Error("WGSL create-histograms compute requires float texture2d t0");
  }
  validateDeclarationOperand(input.operands[0], minor === 0 ? none("resource", 0) : swizzle("resource", 0, "xyzw"), minor, "t0 declaration");
  if (output.data?.registerIndex !== 0 || output.data.resourceDimension !== 1 || output.data.resourceDimensionName !== "buffer" || output.data.globallyCoherent !== false || output.data.returnType?.returnTypes?.length !== 4 || output.data.returnType.returnTypes.some(entry => entry !== 4) || output.data.returnType?.returnTypeNames?.length !== 4 || output.data.returnType.returnTypeNames.some(entry => entry !== "uint") || output.operands?.length !== 1) {
    throw new Error("WGSL create-histograms compute requires non-coherent typed uint Buffer u0");
  }
  validateDeclarationOperand(output.operands[0], minor === 0 ? none("uav", 0) : swizzle("uav", 0, "xyzw"), minor, "u0 declaration");
  validateBuiltinDeclaration(groupId, "input_thread_group_id", 33, minor);
  validateBuiltinDeclaration(localId, "input_thread_id_in_group", 34, minor);
  validateBuiltinDeclaration(dispatchId, "input_thread_id", 32, minor);
  if (temps.data?.tempCount !== (minor === 0 ? 3 : 4) || temps.operands?.length) {
    throw new Error(`WGSL create-histograms SM5.${minor} requires exactly ${minor === 0 ? "three" : "four"} temps`);
  }
  if (shared.data?.registerIndex !== 0 || shared.data.structureStride !== 4 || shared.data.structureCount !== 64 || shared.operands?.length !== 1) {
    throw new Error("WGSL create-histograms compute requires g0 with stride 4 and 64 records");
  }
  validateDeclarationOperand(shared.operands[0], none("thread_group_shared_memory", 0), minor, "g0 declaration");
  if (group.data?.threadGroupX !== 16 || group.data.threadGroupY !== 16 || group.data.threadGroupZ !== 1 || group.operands?.length) {
    throw new Error("WGSL create-histograms compute requires dcl_thread_group 16,16,1");
  }
  if (minor === 1) {
    validateSm51Range(constants.data, "cb0 declaration");
    validateSm51Range(input.data, "t0 declaration");
    validateSm51Range(output.data, "u0 declaration");
  } else if (constants.data.bindingModel || constants.data.bindingRange || input.data.bindingModel || input.data.bindingRange || output.data.bindingModel || output.data.bindingRange) {
    throw new Error("WGSL create-histograms SM5.0 declarations must use register bindings");
  }
}
function validTextureExtensions(program, instruction) {
  const extensions = instruction.extensions || [];
  if (program.shaderModel.minor === 1) return extensions.length === 0;
  if (!["resinfo", "ld"].includes(instruction.opcodeName)) {
    return extensions.length === 0;
  }
  return extensions.length === 2 && extensions[0]?.token === 2147483842 && extensions[0].type === 2 && extensions[0].typeName === "resource_dimension" && extensions[0].resourceDimension === 3 && extensions[0].resourceDimensionName === "texture2d" && extensions[0].structureStride === 0 && extensions[1]?.token === 1398083 && extensions[1].type === 3 && extensions[1].typeName === "resource_return_type" && extensions[1].resourceReturnTypes?.length === 4 && extensions[1].resourceReturnTypes.every(entry => entry === 5);
}
function validateBody(program) {
  const expectedBody = program.shaderModel.minor === 0 ? BODY_SM50 : BODY_SM51;
  if (program.instructions?.length !== expectedBody.length) {
    throw new Error("WGSL create-histograms compute requires the exact 49-instruction body");
  }
  for (const [index, expected] of expectedBody.entries()) {
    const instruction = program.instructions[index];
    if (instruction?.opcodeName !== expected.opcodeName || instruction.operands?.length !== expected.operands.length) {
      throw new Error("WGSL create-histograms compute requires the exact backend opcode and operand schedule");
    }
    for (const [operandIndex, expectedEntry] of expected.operands.entries()) {
      validateOperand(instruction.operands[operandIndex], expectedEntry, program.shaderModel.minor, `instruction ${index} operand ${operandIndex}`);
    }
    const sync = instruction.opcodeName === "sync";
    if (instruction.index !== index || index > 0 && instruction.dxbcOffset <= program.instructions[index - 1].dxbcOffset || instruction.controlKind !== (CONTROL_KIND[instruction.opcodeName] || null) || instruction.testBoolean !== expected.testBoolean || instruction.saturate !== expected.saturate || instruction.preciseMask !== "" || instruction.tailTokens?.length || instruction.resinfoReturnTypeName !== expected.resinfoReturnTypeName || !validTextureExtensions(program, instruction) || (sync ? instruction.syncFlags !== 3 || JSON.stringify(instruction.syncFlagNames) !== JSON.stringify(SYNC_NAMES) : instruction.syncFlags !== undefined || instruction.syncFlagNames !== undefined)) {
      throw new Error(`WGSL create-histograms instruction ${index} has inconsistent envelope metadata`);
    }
  }
  validateAnalysisMetadata(program);
  const origins = program.values.reduce((counts, value) => {
    counts[value.origin] = (counts[value.origin] || 0) + 1;
    return counts;
  }, {});
  const minor = program.shaderModel.minor;
  if (program.blocks.length !== 10 || program.controlFlow.edgeCount !== 12 || program.controlFlow.regions.length !== 3 || program.controlFlow.unreachableBlockIds.length || program.values.length !== 53 || origins["instruction-write"] !== 37 || origins["program-input"] !== 6 || origins["undefined-register"] !== (minor === 0 ? 6 : 7) || origins["control-flow-merge"] !== (minor === 0 ? 4 : 3)) {
    throw new Error("WGSL create-histograms compute requires the canonical CFG and register-value shape");
  }
  const values = new Map(program.values.map(value => [value.id, value]));
  for (const instruction of program.instructions) {
    for (const ref of instruction.dataflow.reads.flatMap(read => read.refs)) {
      if (values.get(ref.valueId)?.origin === "undefined-register") {
        throw new Error(`WGSL create-histograms instruction ${instruction.index} reads undefined register data`);
      }
    }
  }
  const starts = minor === 0 ? [3, 9, 33] : [4, 10, 34];
  const plans = buildSelectionPlans(program, "create-histograms compute");
  if (plans.size !== 3 || starts.some(start => plans.get(start)?.kind !== "selection" || plans.get(start).hasElse || plans.get(start).merges.length)) {
    throw new Error("WGSL create-histograms compute requires three canonical no-else selections without live merges");
  }
}
function validateBindings(bindings) {
  if (bindings.length !== 3) throw new Error("WGSL create-histograms compute binding layout does not match cb0/t0/u0");
  const [constants, input, output] = bindings;
  if (constants.resourceKind !== "uniform-buffer" || constants.generatedSymbol !== "cb0" || constants.registerIndex !== 0 || constants.registerSpace !== 0 || constants.declaration !== "var<uniform>" || constants.type !== "array<vec4<f32>, 1>" || constants.buffer?.type !== "uniform" || constants.buffer.hasDynamicOffset !== false || constants.buffer.minBindingSize !== 16 || input.resourceKind !== "sampled-resource" || input.generatedSymbol !== "t0" || input.registerIndex !== 0 || input.registerSpace !== 0 || input.declaration !== "var" || input.type !== "texture_2d<f32>" || input.texture?.sampleType !== "float" || input.texture.viewDimension !== "2d" || input.texture.multisampled !== false || output.resourceKind !== "storage-resource" || output.generatedSymbol !== "u0" || output.registerIndex !== 0 || output.registerSpace !== 0 || output.declaration !== "var<storage, read_write>" || output.type !== "array<atomic<u32>>" || output.buffer?.type !== "storage" || output.buffer.hasDynamicOffset !== false || output.buffer.minBindingSize !== 4) {
    throw new Error("WGSL create-histograms compute binding layout does not match cb0/t0/u0");
  }
}
function location(program, sm50Index, sm51Index = sm50Index) {
  const index = program.shaderModel.minor === 0 ? sm50Index : sm51Index;
  return {
    instructionIndex: index,
    dxbcOffset: program.instructions[index].dxbcOffset
  };
}
function expression(code, type) {
  return {
    code,
    type
  };
}
function letStatement(program, sm50Index, sm51Index, name, type, code) {
  return {
    kind: "let",
    ...location(program, sm50Index, sm51Index),
    name,
    type,
    expression: expression(code, type)
  };
}
function callStatement(program, sm50Index, sm51Index, code) {
  return {
    kind: "call",
    ...location(program, sm50Index, sm51Index),
    expression: expression(code, "void")
  };
}
function lowerBody(program, bindings) {
  const constants = bindings[0].generatedSymbol;
  const input = bindings[1].generatedSymbol;
  const output = bindings[2].generatedSymbol;
  const textureSize = `textureDimensions(${input}, 0)`;
  const inBounds = "all(dispatch_thread_id.xy < texture_size)";
  const sourceRgb = [letStatement(program, 10, 11, "safe_pixel", "vec2<u32>", "min(dispatch_thread_id.xy, texture_size - vec2<u32>(1u))"), letStatement(program, 12, 13, "source_rgba", "vec4<f32>", `select(vec4<f32>(), textureLoad(${input}, safe_pixel, 0), ${inBounds})`), letStatement(program, 12, 13, "source_rgb", "vec3<f32>", "source_rgba.xyz"), letStatement(program, 14, 15, "low_rgb", "vec3<f32>", "(source_rgb * vec3<f32>(bitcast<f32>(0x3d9e8391u)))"), letStatement(program, 19, 20, "high_rgb", "vec3<f32>", "exp2(log2(abs((source_rgb + vec3<f32>(bitcast<f32>(0x3d6147aeu)))" + " * vec3<f32>(bitcast<f32>(0x3f72a76fu))))" + " * vec3<f32>(bitcast<f32>(0x4019999au)))"), letStatement(program, 20, 21, "linear_rgb", "vec3<f32>", "select(high_rgb, low_rgb, source_rgb" + " < vec3<f32>(bitcast<f32>(0x3d25aed5u)))"), letStatement(program, 21, 22, "luminance", "f32", "dot(linear_rgb, vec3<f32>(" + "bitcast<f32>(0x3e59999au), " + "bitcast<f32>(0x3f372474u), " + "bitcast<f32>(0x3d93a92au)))"), letStatement(program, 23, 24, "log_luminance", "f32", `(log2(luminance) * bitcast<f32>(0x3f317218u)) - ${constants}[0u].x`), letStatement(program, 24, 25, "luminance_range", "f32", `${constants}[0u].y - ${constants}[0u].x`), letStatement(program, 25, 26, "normalized_luminance", "f32", "clamp(log_luminance / luminance_range, 0.0, 1.0)"), letStatement(program, 28, 29, "histogram_bin", "i32", "min(i32(normalized_luminance" + " * bitcast<f32>(0x42800000u)), 63)"), {
    kind: "if",
    ...location(program, 30, 31),
    condition: expression("histogram_bin >= 0 && histogram_bin < 64", "bool"),
    statements: [callStatement(program, 30, 31, "atomicAdd(&g0[u32(histogram_bin)], 1u)")]
  }];
  const outputStores = ["x", "y", "z", "w"].map((component, word) => callStatement(program, 46, 46, `atomicStore(&${output}[(output_element * 4u) + ${word}u], histogram_words.${component})`));
  return [letStatement(program, 0, 0, "texture_size", "vec2<u32>", textureSize), letStatement(program, 1, 1, "local_index", "u32", "(local_invocation_id.y * 16u) + local_invocation_id.x"),
  // DX12 hoists this pure uniform conversion. Canonical emission hoists
  // the DX11 form too; validation and the documented finite/in-range
  // ScreenTilesX premise make the extra evaluations unobservable.
  letStatement(program, 34, 2, "screen_tiles_x", "u32", `u32(${constants}[0u].z)`), letStatement(program, 2, 3, "initialize_bin", "bool", "local_index < 64u"), letStatement(program, 2, 3, "write_histogram", "bool", "local_index < 16u"), {
    kind: "if",
    ...location(program, 3, 4),
    condition: expression("initialize_bin", "bool"),
    statements: [callStatement(program, 4, 5, "atomicStore(&g0[local_index], 0u)")]
  }, callStatement(program, 6, 7, "workgroupBarrier()"), {
    kind: "if",
    ...location(program, 9, 10),
    condition: expression(inBounds, "bool"),
    statements: sourceRgb
  }, callStatement(program, 32, 33, "workgroupBarrier()"), {
    kind: "if",
    ...location(program, 33, 34),
    condition: expression("write_histogram", "bool"),
    statements: [letStatement(program, 35, 35, "group_linear", "u32", "(workgroup_id.y * screen_tiles_x) + workgroup_id.x"), letStatement(program, 39, 39, "output_element", "u32", "(group_linear << 4u) + local_index"), letStatement(program, 38, 38, "histogram_base", "u32", "local_index << 2u"), letStatement(program, 40, 40, "histogram_words", "vec4<u32>", "vec4<u32>(" + "atomicLoad(&g0[histogram_base + 0u]), " + "atomicLoad(&g0[histogram_base + 1u]), " + "atomicLoad(&g0[histogram_base + 2u]), " + "atomicLoad(&g0[histogram_base + 3u]))"), {
      kind: "if",
      ...location(program, 46, 46),
      condition: expression(`output_element < (arrayLength(&${output}) / 4u)`, "bool"),
      statements: outputStores
    }]
  }, {
    kind: "return",
    ...location(program, 48, 48)
  }];
}

/**
 * Lowers the two exact CreateHistograms backend schedules to one canonical
 * 16x16 atomic histogram program.
 *
 * @param {object} program CJS shader IR program.
 * @param {object} [options] Exact compute-only binding options.
 * @returns {object} Typed compute program.
 */
function lowerCreateHistogramsComputeProgram(program, options = {}) {
  validateDeclarations(program);
  validateBody(program);
  const bindings = lowerBindingLayout(program, options.bindingPlan ?? null);
  validateBindings(bindings);
  return deepFreeze({
    kind: "typed-shader-program",
    format: "CJS_TYPED_SHADER",
    formatVersion: 1,
    source: program.source,
    stage: "compute",
    entryPoint: "main",
    builtinInputs: [{
      builtin: "workgroup_id",
      name: "workgroup_id",
      type: "vec3<u32>"
    }, {
      builtin: "local_invocation_id",
      name: "local_invocation_id",
      type: "vec3<u32>"
    }, {
      builtin: "global_invocation_id",
      name: "dispatch_thread_id",
      type: "vec3<u32>"
    }],
    threadGroupSize: [16, 16, 1],
    workgroupVariables: [{
      name: "g0",
      elementType: "atomic<u32>",
      elementCount: 64
    }],
    bindings,
    statements: lowerBody(program, bindings)
  });
}

export { isCreateHistogramsComputeProfile, lowerCreateHistogramsComputeProgram };
//# sourceMappingURL=lowerCreateHistogramsComputeProgram.js.map
