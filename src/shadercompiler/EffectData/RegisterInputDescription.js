import { CjsSchema, meta } from "#schema";
// Source: trinity/shadercompiler/EffectData.h:488-508

/**
 * One register range a stage binds: Carbon's `RegisterInputDescription`.
 */
export class RegisterInputDescription
{
    /** A `RegisterInputType` value. */
    registerType = 0;

    registerIndex = 0;

    registerCount = 0;

    registerSpace = 0;

    /**
     * Carbon's `operator==`.
     *
     * @param {RegisterInputDescription} other The range to compare with.
     * @returns {boolean} Whether every field matches.
     */
    Equals(other)
    {
        return this.registerType === other.registerType && this.registerIndex === other.registerIndex &&
            this.registerCount === other.registerCount && this.registerSpace === other.registerSpace;
    }

    // Source: trinity/shadercompiler/EffectData.h:88-116

    /**
     * Carbon's `RegisterInputType`.
     */
    static RegisterInputType = Object.freeze({
        RT_CONSTANT_BUFFER: 0,
        RT_SAMPLER: 1,

        RT_SRV_BUFFER: 1 << 5,
        RT_SRV_STRUCTURED_BUFFER: (1 << 5) + 1,
        RT_SRV_TEXTURE1D: (1 << 5) + 2,
        RT_SRV_TEXTURE1DARRAY: (1 << 5) + 3,
        RT_SRV_TEXTURE2D: (1 << 5) + 4,
        RT_SRV_TEXTURE2DARRAY: (1 << 5) + 5,
        RT_SRV_TEXTURE2DMS: (1 << 5) + 6,
        RT_SRV_TEXTURE2DMSARRAY: (1 << 5) + 7,
        RT_SRV_TEXTURE3D: (1 << 5) + 8,
        RT_SRV_TEXTURECUBE: (1 << 5) + 9,
        RT_SRV_TEXTURECUBEARRAY: (1 << 5) + 10,

        RT_UAV_BUFFER: 1 << 6,
        RT_UAV_STRUCTURED_BUFFER: (1 << 6) + 1,
        RT_UAV_TEXTURE1D: (1 << 6) + 2,
        RT_UAV_TEXTURE1DARRAY: (1 << 6) + 3,
        RT_UAV_TEXTURE2D: (1 << 6) + 4,
        RT_UAV_TEXTURE2DARRAY: (1 << 6) + 5,
        RT_UAV_TEXTURE2DMS: (1 << 6) + 6,
        RT_UAV_TEXTURE2DMSARRAY: (1 << 6) + 7,
        RT_UAV_TEXTURE3D: (1 << 6) + 8,
        RT_UAV_TEXTURECUBE: (1 << 6) + 9,
        RT_UAV_TEXTURECUBEARRAY: (1 << 6) + 10
    });
}

CjsSchema.decorateMethod(RegisterInputDescription, "Equals", meta.renamed("operator=="));
CjsSchema.meta.carbon("RegisterInputDescription")(RegisterInputDescription);
