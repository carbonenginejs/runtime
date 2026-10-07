// Source: trinity/shadercompiler/TextureFunctionConversionDX11.cpp:12-16

/**
 * Carbon's `SamplerToTexture`, a struct private to
 * `TextureFunctionConversionDX11.cpp`: the texture a DX9 sampler was paired
 * with, and whether a function header has taken it as a new parameter.
 */
export class SamplerToTexture
{
    /** @type {import("../SymbolTable/Symbol.js").Symbol|null} */
    texture = null;

    processed = false;
}
