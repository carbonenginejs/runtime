// Source: trinity/shadercompiler/TextureFunctionConversionDX11.cpp:18-22

/**
 * Carbon's `ParameterInfo`, a struct private to
 * `TextureFunctionConversionDX11.cpp`: a texture parameter added to a
 * function header. `parameterIndex` is where the header now holds it;
 * `argumentIndex` is where each call must insert the matching texture
 * argument, counted in the call's arguments before any insertion.
 */
export class ParameterInfo
{
    parameterIndex = 0;

    argumentIndex = 0;
}
