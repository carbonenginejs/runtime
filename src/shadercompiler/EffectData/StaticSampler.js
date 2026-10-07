// Source: trinity/shadercompiler/EffectData.h:510-568

const FIELDS = [
    "registerIndex", "registerSpace", "comparison", "minFilter", "magFilter", "mipFilter", "addressU", "addressV", "addressW",
    "mipLODBias", "maxAnisotropy", "comparisonFunc", "borderColor", "minLOD", "maxLOD"
];

/**
 * A sampler baked into the root signature: Carbon's `StaticSampler`.
 * `borderColor` is a code: 0 transparent black, 1 opaque black, 2 opaque
 * white (see `ConvertToStaticSampler`).
 */
export class StaticSampler
{
    registerIndex = 0;

    registerSpace = 0;

    comparison = 0;

    minFilter = 0;

    magFilter = 0;

    mipFilter = 0;

    addressU = 0;

    addressV = 0;

    addressW = 0;

    mipLODBias = 0;

    maxAnisotropy = 0;

    comparisonFunc = 0;

    borderColor = 0;

    minLOD = 0;

    maxLOD = 0;

    /**
     * Carbon's `operator==`.
     *
     * @param {StaticSampler} sampler The sampler to compare with.
     * @returns {boolean} Whether every field matches.
     */
    Equals(sampler)
    {
        return FIELDS.every(field => this[field] === sampler[field]);
    }
}
