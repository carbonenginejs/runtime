// Public surface of the WebGPU abstraction-layer backend: explicit descriptors.
//
// CjsWebgpuPackage normalizes decoded Carbon WebGPU data into mutable
// descriptors. CjsWebgpuDevice owns every native object and the device
// lifetime; each object carries the device generation and throws once
// Recreate or Destroy advances it.
//
// Callers supply selected effect variants, render state, vertex layouts,
// geometry, texture pixels, samplers and complete uniform bytes. The device
// infers nothing from shader names, SOF or scene objects, and uploads uniform
// bytes unchanged (RawData is already register-row encoded). Live Trinity
// rendering goes through CjsWebgpuRenderContextAL in the private internal.js.

export { CjsWebgpuPackage } from "./CjsWebgpuPackage.js";
export { CjsWebgpuBackendCandidate } from "./CjsWebgpuBackendCandidate.js";
export { CjsWebgpuDevice } from "./CjsWebgpuDevice.js";
export { CjsWebgpuPipeline } from "./CjsWebgpuPipeline.js";
export { CjsWebgpuShaderModule } from "./CjsWebgpuShaderModule.js";
export { CjsWebgpuBindGroup } from "./CjsWebgpuBindGroup.js";
export { CjsWebgpuResource } from "./CjsWebgpuResource.js";
export { CjsWebgpuBuffer } from "./CjsWebgpuBuffer.js";
export { CjsWebgpuTexture } from "./CjsWebgpuTexture.js";
export { CjsWebgpuSampler } from "./CjsWebgpuSampler.js";
export {
  CollectPerObjectUploads,
  CommitPerObjectUploads,
  UploadPerObjectData
} from "./core/perObjectUploader.js";
export {
  WebgpuVertexFormat,
  WebgpuVertexBufferLayout
} from "./core/vertexFormat.js";
export { WebgpuGeometryOptions } from "./core/geometryPlan.js";
export {
  MaterialLayoutFromShader,
  NormalizeMaterialLayout,
  PackMaterialConstants
} from "./core/materialConstants.js";
