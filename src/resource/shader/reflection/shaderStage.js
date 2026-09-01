/** Number of shader stages Carbon's fixed-width stage array holds. */
export const SHADER_STAGE_COUNT = 6;

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
export function requireShaderStageType(value)
{
  if (!Number.isSafeInteger(value) || value < 0 || value >= SHADER_STAGE_COUNT)
  {
    throw new RangeError(
      `Shader stage type must be in [0, ${SHADER_STAGE_COUNT - 1}]`
    );
  }
  return value;
}

/**
 * Carbon's authored shader stages, by the index a pass addresses them at.
 *
 * Source: trinity/trinityal/Tr2RenderContextEnum.h:31-43 (`ShaderType`). The
 * ordering is Carbon's and is not alphabetical or pipeline-ordered: compute
 * sits at 2, before geometry. `SHADER_TYPE_COUNT` is `INVALID_SHADER`, which is
 * why there are six slots rather than seven.
 *
 * This is why a pass's `stageOrder` of `0,3,1` reads as vertex, geometry,
 * pixel - an ordering the shipped corpus really contains.
 */
export const ShaderStageType = Object.freeze({
  VERTEX_SHADER: 0,
  PIXEL_SHADER: 1,
  COMPUTE_SHADER: 2,
  GEOMETRY_SHADER: 3,
  HULL_SHADER: 4,
  DOMAIN_SHADER: 5
});
