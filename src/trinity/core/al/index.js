// Carbon's abstraction layer (`trinity/trinityal`), as the runtime ports it.
//
// The render-context AL lives in `../context/` rather than here, because it is
// a render context first: Carbon's own `Tr2RenderContext` IS
// `Tr2RenderContextBase` + `Tr2RenderContextAL`, so the two belong together.
// This folder holds the RESOURCE family the context creates and binds.
export * from "./Tr2DeviceResourceAL.js";
