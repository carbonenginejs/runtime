/** Number of shader stages Carbon's fixed-width stage array holds. */
const SHADER_STAGE_COUNT = 6;

/**
 * Require one of Carbon's six authored shader-stage indices.
 *
 * Carbon addresses stages positionally through a fixed-width array on the pass
 * (`Tr2EffectDescription.h`), so a stage type is an index into that array and
 * nothing outside `[0, 5]` addresses anything.
 *
 * @param {number} value Candidate stage type.
 * @returns {number} The validated stage type.
 */
function requireShaderStageType(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value >= SHADER_STAGE_COUNT) {
    throw new RangeError(`Shader stage type must be in [0, ${SHADER_STAGE_COUNT - 1}]`);
  }
  return value;
}

export { SHADER_STAGE_COUNT, requireShaderStageType };
//# sourceMappingURL=shaderStage.js.map
