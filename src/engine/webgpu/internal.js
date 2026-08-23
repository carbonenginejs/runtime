// Private build entry for repository tests and the browser harness. This file
// is deliberately absent from package exports; renderer internals are not a
// supported consumer surface.
export { CjsWebgpuFrameExecutor } from "./core/frameExecutor.js";
export { CjsWebgpuEncodeState } from "./core/batchGroups.js";
export { CjsWebgpuRenderTarget } from "./core/renderTarget.js";
export { CjsWebgpuTrinityBatchDispatcher } from "./core/trinityBatchDispatcher.js";
export { CjsWebgpuTrinityPassEncoder } from "./core/trinityPassEncoder.js";
export { CjsWebgpuTrinityStepRecorder } from "./core/trinityStepRecorder.js";
