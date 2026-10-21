import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/EffectData.h:312-315

/**
 * Carbon's `EffectData.h` `Vector4`: four floats, a sampler's border colour.
 */
export class Vector4
{
    /** Carbon leaves it unset. */
    x = 0;

    /** Carbon leaves it unset. */
    y = 0;

    /** Carbon leaves it unset. */
    z = 0;

    /** Carbon leaves it unset. */
    w = 0;
}

CjsSchema.meta.carbon("Vector4")(Vector4);
