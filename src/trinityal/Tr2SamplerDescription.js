// Source: trinity/trinityal/include/Tr2SamplerStateAL.h
//   trinity/trinityal/include/Tr2SamplerAL.h (struct Tr2SamplerDescription)
//
// Carbon's `Tr2SamplerDescription`: the authored sampler state a
// `Tr2SamplerStateAL` is created from, and the KEY its factory dedupes on -
// `Tr2SamplerStateAL::Create` is a lookup in a `Tr2ObjectFactory<..., Tr2SamplerDescription>`
// owned by the primary context (`Tr2SamplerStateAL.cpp:25-28`), so two equal
// descriptions yield one state and `operator==` on states is identity.
//
// TWO SPELLINGS ARRIVE HERE. The effect reader keeps floats as their raw bits
// (`Tr2SamplerSetup.fromCarbonBinary`: `minLODRaw`, `maxLODRaw`,
// `mipLODBiasRaw`, `borderColorRaw`) so a round trip is byte-exact; an override
// built at runtime carries plain floats. The normal form below is the floats,
// and both spellings normalise to it, so the factory key is the same whichever
// road a description took.

const rawView = new DataView(new ArrayBuffer(4));

/** A float from its raw IEEE-754 bits, or the float itself. */
function floatOf(value, raw, fallback)
{
  if (Number.isFinite(value)) return value;

  if (Number.isInteger(raw))
  {
    rawView.setUint32(0, raw >>> 0, true);

    return rawView.getFloat32(0, true);
  }

  return fallback;
}

/** Carbon's `FLT_MAX`, the open upper LOD bound an author leaves unbounded. */
export const SAMPLER_LOD_UNBOUNDED = 3.4028234663852886e38;


/**
 * The normal form of a sampler description.
 *
 * @param {object|null} description Authored state in either spelling.
 * @returns {object|null} The normalised description, or null for nothing.
 */
export function NormalizeSamplerDescription(description)
{
  if (!description || typeof description !== "object") return null;

  const border = description.borderColor ?? description.borderColorRaw ?? [];
  const rawBorder = description.borderColor ? null : description.borderColorRaw ?? null;

  return {
    minFilter: description.minFilter ?? 0,
    magFilter: description.magFilter ?? 0,
    mipFilter: description.mipFilter ?? 0,
    comparison: Boolean(description.comparison),
    addressU: description.addressU ?? 0,
    addressV: description.addressV ?? 0,
    addressW: description.addressW ?? 0,
    mipLODBias: floatOf(description.mipLODBias, description.mipLODBiasRaw, 0),
    maxAnisotropy: description.maxAnisotropy ?? 1,
    comparisonFunc: description.comparisonFunc ?? 0,
    borderColor: [ 0, 1, 2, 3 ].map(index => floatOf(rawBorder ? undefined : border[index], rawBorder?.[index], 0)),
    minLOD: floatOf(description.minLOD, description.minLODRaw, 0),
    maxLOD: floatOf(description.maxLOD, description.maxLODRaw, SAMPLER_LOD_UNBOUNDED)
  };
}


/**
 * The factory key for a description: two descriptions with equal keys are one
 * sampler state.
 *
 * @param {object} description A description in either spelling.
 * @returns {string|null} The key, or null for nothing.
 */
export function SamplerDescriptionKey(description)
{
  const normalized = NormalizeSamplerDescription(description);

  return normalized ? JSON.stringify(normalized) : null;
}
