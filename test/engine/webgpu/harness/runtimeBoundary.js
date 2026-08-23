// The browser harness consumes the built runtime through one bundled boundary.
// This keeps its nominal identities aligned with the npm artifact and prevents
// raw source aliases from becoming a second, independently translated runtime.
export { CjsWebgpuDevice } from "../../../../npm/dist/engine/webgpu/index.js";
export { CjsResource } from "../../../../npm/dist/resource/CjsResource.js";
export {
    CjsWebgpuTrinityBatchDispatcher,
    CjsWebgpuTrinityPassEncoder
} from "../../../../npm/dist/engine/webgpu/internal.js";
export {
    CjsTrinityBatchResolver
} from "../../../../npm/dist/trinity/core/batch/CjsTrinityBatchResolver.js";
export {
    ITriRenderBatchAccumulator
} from "../../../../npm/dist/trinity/core/batch/ITriRenderBatchAccumulator.js";
export { Tr2RenderBatch } from "../../../../npm/dist/trinity/core/batch/Tr2RenderBatch.js";
export { TriRenderBatchMap } from "../../../../npm/dist/trinity/core/batch/TriRenderBatchMap.js";
export { buildCopyblitDrawDescriptor } from "./support/packageDraw.js";
export {
    buildEveSpaceObjectMainUniformData,
    MaterialLayoutFromPackage
} from "./spaceObjectMainUniforms.js";
