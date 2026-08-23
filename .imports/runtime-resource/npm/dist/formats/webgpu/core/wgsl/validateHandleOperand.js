/**
 * Requires one fixed, unmodified, default-precision resource-handle operand.
 *
 * @param {object} instruction Decoded instruction.
 * @param {number} operandIndex Handle operand index.
 * @param {string} expectedType Required operand type.
 * @param {string} stage Stage name used in diagnostics.
 * @returns {object} Validated operand.
 */
function validateFixedHandleOperand(instruction, operandIndex, expectedType, stage) {
  const operand = instruction.operands[operandIndex];
  const hasRelativeIdentity = operand?.indices?.some(entry => entry?.relative) || operand?.resourceReference?.absoluteIndex?.relative;
  if (operand?.typeName !== expectedType || (operand.modifierName ?? "none") !== "none" || (operand.minPrecisionName ?? "default") !== "default" || hasRelativeIdentity) {
    throw new Error(`WGSL ${stage} instruction ${instruction.index} requires a fixed, unmodified, default-precision ${expectedType} handle at operand ${operandIndex}`);
  }
  return operand;
}

/**
 * Confirms an operand's absolute handle index matches its resolved binding.
 *
 * @param {object} operand Validated handle operand.
 * @param {object|null} binding Resolved binding.
 * @param {string} stage Stage name used in diagnostics.
 * @returns {object|null} The unchanged binding.
 */
function validateFixedHandleBinding(operand, binding, stage) {
  const absoluteIndex = operand?.resourceReference?.absoluteIndex;
  if (!binding || absoluteIndex === undefined) return binding;
  if (absoluteIndex?.relative || absoluteIndex?.values?.length !== 1 || absoluteIndex.values[0] !== binding.registerIndex) {
    throw new Error(`WGSL ${stage} handle has an out-of-range fixed handle identity`);
  }
  return binding;
}

export { validateFixedHandleBinding, validateFixedHandleOperand };
//# sourceMappingURL=validateHandleOperand.js.map
