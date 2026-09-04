// Carbon's abstraction layer (`trinity/trinityal`), as the runtime ports it.
//
// The render-context AL lives in `../context/` rather than here, because it is
// a render context first: Carbon's own `Tr2RenderContext` IS
// `Tr2RenderContextBase` + `Tr2RenderContextAL`, so the two belong together.
// This folder holds the RESOURCE family the context creates and binds.
export * from "./ALResult.js";
export * from "./Tr2BitmapDimensions.js";
export * from "./Tr2BufferALStub.js";
export * from "./Tr2CapsALStub.js";
export * from "./Tr2ConstantBufferALStub.js";
export * from "./Tr2DeviceResourceAL.js";
export * from "./Tr2HalHelperStructures.js";
export * from "./Tr2SwapChainALStub.js";
export * from "./Tr2TextureALStub.js";
export * from "./Tr2VertexLayoutALStub.js";
