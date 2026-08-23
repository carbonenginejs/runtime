const BINDING_DECLARATIONS = Object.freeze({
  dcl_constant_buffer: Object.freeze({
    resourceKind: "uniform-buffer",
    operandType: "constant_buffer"
  }),
  dcl_sampler: Object.freeze({
    resourceKind: "sampler",
    operandType: "sampler"
  }),
  dcl_resource: Object.freeze({
    resourceKind: "sampled-resource",
    operandType: "resource"
  }),
  dcl_resource_raw: Object.freeze({
    resourceKind: "sampled-resource",
    operandType: "resource"
  }),
  dcl_resource_structured: Object.freeze({
    resourceKind: "sampled-resource",
    operandType: "resource"
  }),
  dcl_unordered_access_view_typed: Object.freeze({
    resourceKind: "storage-resource",
    operandType: "uav"
  }),
  dcl_unordered_access_view_raw: Object.freeze({
    resourceKind: "storage-resource",
    operandType: "uav"
  }),
  dcl_unordered_access_view_structured: Object.freeze({
    resourceKind: "storage-resource",
    operandType: "uav"
  })
});
const RANGE_FIELDS = Object.freeze(["bindingModel", "rangeId", "lowerBound", "upperBound", "unbounded", "registerCount", "registerSpace"]);
const RETURN_TYPE_NAMES = Object.freeze({
  3: "sint",
  4: "uint",
  5: "float"
});
function fail(context, message) {
  throw new Error(`${context} ${message}`);
}
function hasOwn(value, property) {
  return Object.prototype.hasOwnProperty.call(value, property);
}
function isDenseArrayOfLength(value, length) {
  return Array.isArray(value) && value.length === length && Array.from({
    length
  }, (_, index) => hasOwn(value, index)).every(Boolean);
}
function rejectTailTokens(entries, kind, context) {
  for (const entry of entries) {
    if (entry?.tailTokens !== undefined && (!Array.isArray(entry.tailTokens) || entry.tailTokens.length !== 0)) {
      const location = kind === "declaration" ? `at DXBC offset ${entry?.dxbcOffset ?? "<unknown>"}` : `${entry?.index ?? "<unknown>"}`;
      fail(context, `has inconsistent envelope metadata: ${kind} ${location} has unconsumed tail tokens; exact compute programs must not contain trailing payload words`);
    }
  }
}
function fixedRegisterRange(data, binding, context) {
  const registerIndex = data?.registerIndex;
  if (!data || hasOwn(data, "bindingModel") || hasOwn(data, "bindingRange") || !Number.isInteger(registerIndex) || registerIndex < 0) {
    fail(context, `binding ${binding.id || "<unknown>"} has an invalid fixed register declaration`);
  }
  return {
    bindingModel: "sm5.0-register",
    rangeId: null,
    lowerBound: registerIndex,
    upperBound: registerIndex,
    unbounded: false,
    registerCount: 1,
    registerSpace: 0
  };
}
function finiteRange(data, binding, context) {
  const range = data?.bindingRange;
  if (!data || !hasOwn(data, "bindingModel") || !hasOwn(data, "bindingRange") || data.bindingModel !== "sm5.1-range" || range?.bindingModel !== "sm5.1-range" || !Number.isInteger(range.rangeId) || range.rangeId < 0 || !Number.isInteger(range.lowerBound) || range.lowerBound < 0 || !Number.isInteger(range.upperBound) || range.upperBound < range.lowerBound || range.unbounded !== false || range.registerCount !== range.upperBound - range.lowerBound + 1 || !Number.isInteger(range.registerSpace) || range.registerSpace < 0 || data.registerIndex !== range.lowerBound) {
    fail(context, `binding ${binding.id || "<unknown>"} has an invalid finite SM5.1 range declaration`);
  }
  return range;
}
function declarationRange(declaration, binding, context) {
  const data = declaration.data;
  return data && (hasOwn(data, "bindingModel") || hasOwn(data, "bindingRange")) ? finiteRange(declaration.data, binding, context) : fixedRegisterRange(declaration.data, binding, context);
}
function validateRangeIdentity(binding, range, context) {
  if (!binding.range || RANGE_FIELDS.some(field => binding.range[field] !== range[field]) || binding.registerIndex !== range.lowerBound) {
    fail(context, `binding ${binding.id || "<unknown>"} has inconsistent declaration range identity; array or unbounded range metadata is not canonical`);
  }
}
function isCanonicalIndex(index, dimension, value) {
  return index?.dimension === dimension && index.representation === 0 && index.relative === null && index.values?.length === 1 && index.values[0] === value;
}
function isCanonicalFixedIndex(index, dimension, value) {
  return (index?.dimension ?? dimension) === dimension && (index.representation ?? 0) === 0 && index.relative === null && index.values?.length === 1 && index.values[0] === value;
}
function validateHandleIdentity(declaration, binding, descriptor, range, context) {
  const operand = declaration.operands?.[0];
  const ranged = range.bindingModel === "sm5.1-range";
  const handleRegister = ranged ? range.rangeId : range.lowerBound;
  const indices = operand?.indices;
  const validIndices = ranged ? indices?.length === 3 && isCanonicalIndex(indices[0], 0, range.rangeId) && isCanonicalIndex(indices[1], 1, range.lowerBound) && isCanonicalIndex(indices[2], 2, range.upperBound) : descriptor.operandType === "constant_buffer" ? indices?.length === 2 && isCanonicalFixedIndex(indices[0], 0, range.lowerBound) && isCanonicalFixedIndex(indices[1], 1, declaration.data?.sizeInVec4) : indices?.length === 1 && isCanonicalFixedIndex(indices[0], 0, range.lowerBound);
  if (declaration.operands?.length !== 1 || operand?.typeName !== descriptor.operandType || binding.operandType !== descriptor.operandType || operand.registerIndex !== handleRegister || !validIndices) {
    fail(context, `binding ${binding.id || "<unknown>"} has inconsistent declaration handle identity`);
  }
}
function validateBinding(program, binding, context) {
  const declarations = program.declarations.filter(entry => entry?.dxbcOffset === binding?.declarationOffset);
  if (declarations.length !== 1) {
    fail(context, `binding ${binding?.id || "<unknown>"} has inconsistent declaration identity`);
  }
  const declaration = declarations[0];
  const descriptor = BINDING_DECLARATIONS[declaration.opcodeName];
  if (!descriptor || binding.resourceKind !== descriptor.resourceKind) {
    fail(context, `binding ${binding?.id || "<unknown>"} has inconsistent declaration resource kind`);
  }
  const range = declarationRange(declaration, binding, context);
  validateRangeIdentity(binding, range, context);
  validateHandleIdentity(declaration, binding, descriptor, range, context);
  const expectedId = `${descriptor.resourceKind}:space${range.registerSpace}:range${range.rangeId ?? range.lowerBound}`;
  if (binding.id !== expectedId) {
    fail(context, `binding ${binding.id || "<unknown>"} has noncanonical id; expected ${expectedId}`);
  }
}

/**
 * Validates the raw framing shared by exact compute profiles.
 *
 * The decoder is the sole canonical producer of this metadata. Lowering rejects
 * foreign or tampered envelopes instead of normalizing them.
 *
 * @param {object} program CJS shader IR program.
 * @param {string} [context] Error-message prefix.
 * @returns {true} True when the exact envelope is canonical.
 */
function validateExactComputeEnvelope(program, context = "WGSL exact compute") {
  if (!Array.isArray(program?.declarations) || !Array.isArray(program?.instructions) || !Array.isArray(program?.bindings)) {
    throw new TypeError(`${context} envelope requires declaration, instruction, and binding arrays`);
  }
  rejectTailTokens(program.declarations, "declaration", context);
  rejectTailTokens(program.instructions, "instruction", context);
  for (const binding of program.bindings) validateBinding(program, binding, context);
  return true;
}

/**
 * Validates the redundant numeric/name component records retained for a typed
 * resource declaration or binding.
 *
 * The exact scalar-word profiles consume the names, while the decoder also
 * retains their numeric DXBC component classes. Both copies must describe the
 * same four components.
 *
 * @param {object} returnType Typed resource return metadata.
 * @param {string} [context] Error-message prefix.
 * @returns {true} True when the two component records agree.
 */
function validateReturnTypeMirror(returnType, context = "WGSL exact compute return type") {
  const numeric = returnType?.returnTypes;
  const names = returnType?.returnTypeNames;
  if (!isDenseArrayOfLength(numeric, 4) || !isDenseArrayOfLength(names, 4) || numeric.some((entry, index) => !Number.isInteger(entry) || !Object.prototype.hasOwnProperty.call(RETURN_TYPE_NAMES, entry) || RETURN_TYPE_NAMES[entry] !== names[index])) {
    fail(context, "has inconsistent numeric/name return-type component mirrors");
  }
  return true;
}

/**
 * Validates one canonical SM5.0 resource-dimension/resource-return extension
 * pair, including both semantic fields and their redundant numeric words.
 *
 * @param {object[]} extensions Instruction opcode extensions.
 * @param {object} expected Expected semantic extension values.
 * @param {number} expected.resourceDimension Numeric resource dimension.
 * @param {string} expected.resourceDimensionName Resource dimension name.
 * @param {number} expected.structureStride Structured byte stride.
 * @param {number[]} expected.resourceReturnTypes Four numeric component types.
 * @param {string} [context] Error-message prefix.
 * @returns {true} True when the exact extension pair is canonical.
 */
function validateSm50ResourceExtensions(extensions, expected, context = "WGSL exact compute instruction") {
  const resourceReturnTypes = expected?.resourceReturnTypes;
  if (!Number.isInteger(expected?.resourceDimension) || !Number.isInteger(expected?.structureStride) || !isDenseArrayOfLength(resourceReturnTypes, 4)) {
    throw new TypeError(`${context} requires exact expected SM5.0 resource extensions`);
  }
  const dimensionToken = (0x80000000 | expected.structureStride << 11 | expected.resourceDimension << 6 | 2) >>> 0;
  const returnToken = (3 | resourceReturnTypes[0] << 6 | resourceReturnTypes[1] << 10 | resourceReturnTypes[2] << 14 | resourceReturnTypes[3] << 18) >>> 0;
  const dimension = extensions?.[0];
  const returns = extensions?.[1];
  if (!Array.isArray(extensions) || extensions.length !== 2 || dimension?.token !== dimensionToken || dimension.type !== 2 || dimension.typeName !== "resource_dimension" || dimension.resourceDimension !== expected.resourceDimension || dimension.resourceDimensionName !== expected.resourceDimensionName || dimension.structureStride !== expected.structureStride || returns?.token !== returnToken || returns.type !== 3 || returns.typeName !== "resource_return_type" || !isDenseArrayOfLength(returns.resourceReturnTypes, 4) || returns.resourceReturnTypes.some((entry, index) => entry !== resourceReturnTypes[index])) {
    fail(context, "has inconsistent SM5.0 resource-extension semantic or numeric mirrors");
  }
  return true;
}

export { validateExactComputeEnvelope, validateReturnTypeMirror, validateSm50ResourceExtensions };
//# sourceMappingURL=validateExactComputeIr.js.map
