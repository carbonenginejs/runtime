import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/EffectData.h:312-315

/**
 * Carbon's `EffectData.h` `Vector4`: four floats, a sampler's border colour.
 */
export class Vector4
{
    x = 0;

    y = 0;

    z = 0;

    w = 0;
}

CjsSchema.blue.define(Vector4, {
    className: "Vector4"
});
