// Source: trinity/shadercompiler/EffectData.h:318-340

/**
 * One texture (shader resource) a stage reads: Carbon's `Texture`. Its
 * register is its key in `StageData.textures`.
 */
export class Texture
{
    name = "";

    /** A `TextureType` value. */
    type = 0;

    count = 1;

    isSRGB = false;

    isAutoregister = false;

    /**
     * Carbon's `operator==`.
     *
     * @param {Texture} other The texture to compare with.
     * @returns {boolean} Whether every field matches.
     */
    Equals(other)
    {
        return this.name === other.name && this.type === other.type && this.count === other.count && this.isSRGB === other.isSRGB &&
            this.isAutoregister === other.isAutoregister;
    }

    // Source: trinity/shadercompiler/EffectData.h:43-70

    /**
     * Carbon's `TextureType`.
     */
    static TextureType = Object.freeze({
        TEX_TYPE_1D: 1,
        TEX_TYPE_2D: 2,
        TEX_TYPE_3D: 3,
        TEX_TYPE_CUBE: 4,

        // valid but unknown dimensions
        TEX_TYPE_TYPELESS: 5,

        // buffers
        TEX_TYPE_BUFFER: 6,
        TEX_TYPE_STRUCTURED_BUFFER: 7,
        TEX_TYPE_TBUFFER: 8,
        TEX_TYPE_BYTEADDRESS_BUFFER: 9,

        // uavs
        TEX_TYPE_UAV_RWTYPED: 10,
        TEX_TYPE_UAV_RWSTRUCTURED: 11,
        TEX_TYPE_UAV_RWBYTEADDRESS: 12,
        TEX_TYPE_UAV_APPEND_STRUCTURED: 13,
        TEX_TYPE_UAV_CONSUME_STRUCTURED: 14,
        TEX_TYPE_UAV_RWSTRUCTURED_WITH_COUNTER: 15,

        // raytracing
        TEX_TYPE_RAYTRACING_ACCELERATION_STRUCTURE: 16,

        TEX_TYPE_INVALID: 17
    });
}
