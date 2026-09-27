// The WebGL2 backend of the abstraction layer.
//
// Carbon has no GL backend (its backends are dx11, dx12, metal and stub), so
// this backend is our extension; its classes are Carbon's `Tr2*AL` classes,
// ported from dx11, the Carbon backend WebGL2 most resembles. Scope, the
// features WebGL2 cannot serve, and the order of work are in the organization
// research page `docs/research/webgl-trinityal-backend.md`.
//
// Every class here reaches its WebGL2 context through the render context:
// `RenderContextALOf(renderContext).GetWebgl2()`.
export * from "./Tr2BufferALWebgl2.js";
export * from "./Tr2ConstantBufferALWebgl2.js";
export * from "./Tr2SamplerStateALWebgl2.js";
export * from "./Tr2TextureALWebgl2.js";
export * from "./Tr2ShaderALWebgl2.js";
export * from "./Tr2ShaderProgramALWebgl2.js";
export * from "./Tr2VertexLayoutALWebgl2.js";
export * from "./Tr2ResourceSetALWebgl2.js";
export * from "./Tr2FenceALWebgl2.js";
export * from "./Tr2OcclusionQueryALWebgl2.js";
export * from "./Tr2GpuTimerALWebgl2.js";
export * from "./Tr2PipelineStatsQueryALWebgl2.js";
export * from "./Tr2CapsALWebgl2.js";
