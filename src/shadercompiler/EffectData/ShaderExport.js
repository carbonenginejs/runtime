// Source: trinity/shadercompiler/EffectData.h:744-755

/**
 * One ray-tracing shader a library exports: Carbon's `ShaderExport`.
 */
export class ShaderExport
{
    /** An `RtShaderType` value. */
    type = 0;

    name = "";

    // Source: trinity/shadercompiler/EffectData.h:118-125

    /**
     * Carbon's `enum class RtShaderType : uint8_t`.
     */
    static RtShaderType = Object.freeze({
        RAY_GEN: 0,
        MISS: 1,
        CLOSEST_HIT: 2,
        ANY_HIT: 3,
        INTERSECTION: 4
    });
}
