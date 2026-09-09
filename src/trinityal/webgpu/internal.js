// Private build entry for repository tests and the browser harness. This file
// is deliberately absent from package exports; renderer internals are not a
// supported consumer surface.
export { CjsWebgpuEncodeState } from "./core/batchGroups.js";
export { CjsWebgpuRenderTarget } from "./core/renderTarget.js";
export { CjsWebgpuTrinityBatchDispatcher } from "./core/trinityBatchDispatcher.js";
export { CjsWebgpuTrinityBatchResolver } from "./core/trinityBatchResolver.js";
export { CjsWebgpuTextureSource } from "./core/textureSource.js";
export { CjsWebgpuTrinityPassEncoder } from "./core/trinityPassEncoder.js";
export { CarbonSamplerDescriptor, IsEmulatedAddressMode, EMULATED_ADDRESS_MODES } from "./core/samplerDescriptor.js";
export { CjsWebgpuSamplerSource } from "./core/samplerSource.js";
export { CjsWebgpuPerFrameSource } from "./core/perFrameSource.js";

export { CjsWebgpuWorkQueue, EncoderType, ApplyRenderPassHint } from "./core/workQueue.js";
export { CjsWebgpuRenderContextAL } from "./CjsWebgpuRenderContextAL.js";
export { CjsWebgpuBufferAL } from "./CjsWebgpuBufferAL.js";
export { CjsWebgpuCapsAL, CjsWebgpuPlatformCaps } from "./CjsWebgpuCapsAL.js";
export { CjsWebgpuShaderAL, CjsWebgpuShaderProgramAL } from "./CjsWebgpuShaderAL.js";
export { CjsWebgpuPsoDescription } from "./core/psoDescription.js";
