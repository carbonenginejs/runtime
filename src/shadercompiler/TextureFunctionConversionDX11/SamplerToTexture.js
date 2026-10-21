import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/TextureFunctionConversionDX11.cpp:12-16

/**
 * Carbon's `SamplerToTexture`, a struct private to
 * `TextureFunctionConversionDX11.cpp`: the texture a DX9 sampler was paired
 * with, and whether a function header has taken it as a new parameter.
 */
export class SamplerToTexture
{
    /** @type {import("../SymbolTable/Symbol.js").Symbol|null} Carbon leaves it unset. */
    texture = null;

    /** Carbon leaves it unset. */
    processed = false;
}

CjsSchema.meta.carbon("SamplerToTexture")(SamplerToTexture);
