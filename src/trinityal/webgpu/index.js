// Public surface of the WebGPU abstraction-layer backend.
//
// CjsWebgpuDevice owns the GPUDevice, its lifetime and loss. CjsWebgpuBackendCandidate is
// the WebGPU participant in backend selection. Live Trinity rendering goes through
// CjsWebgpuRenderContextAL in the private internal.js.

export { CjsWebgpuBackendCandidate } from "./CjsWebgpuBackendCandidate.js";
export { CjsWebgpuDevice } from "./CjsWebgpuDevice.js";
export {
  WebgpuVertexFormat,
  WebgpuVertexBufferLayout
} from "./core/vertexFormat.js";
export * from "./Tr2ReadbackALWebgpu.js";
