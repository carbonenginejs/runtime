// Private build entry for repository tests and the browser harness. This file
// is deliberately absent from package exports; renderer internals are not a
// supported consumer surface.
export { CjsWebgpuEncodeState } from "./core/CjsWebgpuEncodeState.js";
export { CjsWebgpuRenderTarget } from "./core/CjsWebgpuRenderTarget.js";
export { CjsWebgpuTrinityBatchDispatcher } from "./core/CjsWebgpuTrinityBatchDispatcher.js";
export { CjsWebgpuTrinityBatchResolver } from "./core/CjsWebgpuTrinityBatchResolver.js";
export { CjsWebgpuTextureSource } from "./core/CjsWebgpuTextureSource.js";
export { CjsWebgpuTrinityPassEncoder } from "./core/CjsWebgpuTrinityPassEncoder.js";
export { CarbonSamplerDescriptor, IsEmulatedAddressMode, EMULATED_ADDRESS_MODES } from "./core/samplerDescriptor.js";
export { CjsWebgpuSamplerSource } from "./core/CjsWebgpuSamplerSource.js";
export { CjsWebgpuPerFrameSource } from "./core/CjsWebgpuPerFrameSource.js";

export { CjsWebgpuWorkQueue, EncoderType, ApplyRenderPassHint } from "./core/CjsWebgpuWorkQueue.js";
export { CjsWebgpuRenderContextAL } from "./CjsWebgpuRenderContextAL.js";
export { CjsWebgpuBufferAL } from "./CjsWebgpuBufferAL.js";
export { CjsWebgpuConstantBufferAL } from "./CjsWebgpuConstantBufferAL.js";
export { CjsWebgpuSamplerStateAL } from "./CjsWebgpuSamplerStateAL.js";
export { CjsWebgpuResourceSetAL } from "./CjsWebgpuResourceSetAL.js";
export { CjsWebgpuTextureAL } from "./CjsWebgpuTextureAL.js";
export { CjsWebgpuCapsAL, CjsWebgpuPlatformCaps } from "./CjsWebgpuCapsAL.js";
export { CjsWebgpuShaderAL, CjsWebgpuShaderProgramAL } from "./CjsWebgpuShaderAL.js";
export { CjsWebgpuPsoDescription } from "./core/CjsWebgpuPsoDescription.js";
