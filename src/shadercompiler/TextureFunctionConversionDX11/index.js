// Source: trinity/shadercompiler/TextureFunctionConversionDX11.h (declaration order)
//
// The texture-access passes Carbon's DX11 and Metal compilers run on a parsed
// shader: DX9 `tex*` intrinsics to DX10 texture methods
// (`ConvertTextureFunctionsDX11`), `SRGBTexture` sampler states to `Tr2sRGB`
// texture annotations (`TransferSRGBToTexturesDX11`), DX10 texture and buffer
// access to Metal's (`ConvertTextureFunctionsToMetal`), sampler merging
// (`MergeSamplers`), and `BindlessTextureType`. The functions after them have
// external linkage in Carbon's .cpp without a header declaration.
// `SamplerToTexture` and `ParameterInfo` are the .cpp's private structs.

export {
    ConvertTextureFunctionsDX11,
    TransferSRGBToTexturesDX11,
    ConvertTextureFunctionsToMetal,
    MergeSamplers,
    BindlessTextureType,
    SplitCoordVec,
    PatchMetalBufferCalls,
    PatchMetalTextureCall,
    PatchMetalTextureCalls
} from "./textureFunctionConversionDX11.js";
export { SamplerToTexture } from "./SamplerToTexture.js";
export { ParameterInfo } from "./ParameterInfo.js";
