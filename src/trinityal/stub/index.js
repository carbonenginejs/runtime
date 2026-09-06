// The GPU-free backend, which Carbon ships as `trinityal/stub` and builds as a
// real target (`TrinityAL_stub`, `trinity_stub`) consumed by its VideoPlayer and
// by the AL's own tests. It is a supported configuration there, not scaffolding.
//
// Every one of these keeps REAL STATE and draws nothing: argument validation,
// per-slot render-target and depth-stencil stacks, real sizes read back, draws
// and clears counted. The bookkeeping is the feature - a headless Trinity that
// still carries correct data is the requirement, and a backend that did nothing
// at all would satisfy "runs without a GPU" while failing it.
//
// `Tr2RenderContextALStub` lives here rather than beside `Tr2RenderContext`
// because it is a BACKEND first. Carbon's `Tr2RenderContext` is
// `Tr2RenderContextBase` + `Tr2RenderContextAL`, and the AL half is what this
// is - selected there by a compile-time platform typedef, chosen here by which
// backend a context is given.
export * from "./Tr2BufferALStub.js";
export * from "./Tr2CapsALStub.js";
export * from "./Tr2ConstantBufferALStub.js";
export * from "./Tr2FenceALStub.js";
export * from "./Tr2QueryALStub.js";
export * from "./Tr2RenderContextALStub.js";
export * from "./Tr2SamplerStateALStub.js";
export * from "./Tr2ShaderALStub.js";
export * from "./Tr2ShaderProgramALStub.js";
export * from "./Tr2SwapChainALStub.js";
export * from "./Tr2TextureALStub.js";
export * from "./Tr2VertexLayoutALStub.js";
export * from "./Tr2VideoAdapterInfoALStub.js";
