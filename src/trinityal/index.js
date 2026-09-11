// Carbon's abstraction layer, laid out as Carbon lays it out.
//
// Carbon's tree has `trinity/` and `trinityal/` as SIBLINGS - namespace
// `TrinityALImpl`, target `TrinityAL_stub` - with the interface at the root and
// one directory per backend (`stub/`, `dx11/`, `dx12/`, `metal/`). This mirrors
// that: shared types here, `stub/` for the headless backend Carbon ships, and
// `webgpu/` for ours.
//
// IT USED TO BE SPLIT ACROSS TWO TREES, NEITHER NAMED AFTER IT: the resource
// family under `trinity/core/al`, the render-context stub under
// `trinity/core/context`, and the WebGPU backend under `engine/`. That last
// name is why "the engine does device work" was read as a PACKAGE rather than
// as this layer - which produced the render-intent queue, four executor
// classes, and around sixty "device work this package does not do" comments,
// all since removed. The directory is named after the thing now.
export * from "./ALResult.js";
export * from "./Tr2BitmapDimensions.js";
export * from "./Tr2DeviceResourceAL/index.js";
export * from "./Tr2DrawUPHelper.js";
export * from "./Tr2HalHelperStructures/index.js";
export * from "./Tr2RenderPassAL/index.js";
export * from "./Tr2ResourceSetAL/index.js";
export * from "./renderContextAL.js";
export * from "./vertexLayoutMatch.js";
export * from "./stub/index.js";
