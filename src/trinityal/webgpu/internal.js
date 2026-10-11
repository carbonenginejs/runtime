// Private build entry for repository tests and demos. This file
// is deliberately absent from package exports; renderer internals are not a
// supported consumer surface.
export { CjsWebgpuRenderTarget } from "./core/CjsWebgpuRenderTarget.js";
export { CjsWebgpuUtils } from "./core/CjsWebgpuUtils.js";
export { CarbonSamplerDescriptor, IsEmulatedAddressMode, EMULATED_ADDRESS_MODES } from "./core/samplerDescriptor.js";

export { CjsWebgpuWorkQueue, EncoderType, ApplyRenderPassHint } from "./core/CjsWebgpuWorkQueue.js";
export { CjsWebgpuRenderContextAL } from "./CjsWebgpuRenderContextAL.js";
export { CjsWebgpuBufferAL } from "./CjsWebgpuBufferAL.js";
export { CjsWebgpuConstantBufferAL } from "./CjsWebgpuConstantBufferAL.js";
export { CjsWebgpuFenceAL } from "./CjsWebgpuFenceAL.js";
export { CjsWebgpuSamplerStateAL } from "./CjsWebgpuSamplerStateAL.js";
export { CjsWebgpuResourceSetAL } from "./CjsWebgpuResourceSetAL.js";
export { CjsWebgpuTextureAL } from "./CjsWebgpuTextureAL.js";
export { CjsWebgpuCapsAL, CjsWebgpuPlatformCaps } from "./CjsWebgpuCapsAL.js";
export { CjsWebgpuShaderAL } from "./CjsWebgpuShaderAL.js";
export { CjsWebgpuShaderProgramAL } from "./CjsWebgpuShaderProgramAL.js";
export { CjsWebgpuPsoDescription } from "./core/CjsWebgpuPsoDescription.js";
