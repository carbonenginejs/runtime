// Source: trinity/trinityal/metal/MetalWorkQueue.h
//
// The load/store/clear triple for every colour target plus depth and stencil,
// held as parallel fixed-width arrays because Metal sets them on the pass
// descriptor.
//
// DROPPED AS A RECORD, LIVE AS BEHAVIOUR. WebGPU carries exactly these fields
// per attachment on GPURenderPassDescriptor, so ours are set at the attachment -
// CjsWebgpuRenderTarget emits `loadOp: clearColor ? "clear" : "load"` and
// CjsWebgpuRenderContextAL reads `loadOp === "clear"` back out. A separate
// state object holding them for the whole pass would be a second source of
// truth for something the descriptor already owns.
import { meta } from "#schema";

/** Carbon's per-pass load/store/clear state; dropped because WebGPU carries the same fields on each attachment. */
@meta.define({ className: "MetalClearState", carbon: "MetalClearState", family: "trinityal" })
export class MetalClearState
{

  /** colorLoadAction[METAL_MAX_RENDER_TARGETS] (MTLLoadAction) */
  @meta.type.unknown
  colorLoadAction = null;

  /** colorStoreAction[METAL_MAX_RENDER_TARGETS] (MTLStoreAction) */
  @meta.type.unknown
  colorStoreAction = null;

  /** clearColorValue[METAL_MAX_RENDER_TARGETS] (MTLClearColor) */
  @meta.type.unknown
  clearColorValue = null;

  /** depthLoadAction (MTLLoadAction) */
  @meta.type.unknown
  depthLoadAction = null;

  /** depthStoreAction (MTLStoreAction) */
  @meta.type.unknown
  depthStoreAction = null;

  /** clearDepthValue (float) */
  @meta.type.float32
  clearDepthValue = 1;

  /** stencilLoadAction (MTLLoadAction) */
  @meta.type.unknown
  stencilLoadAction = null;

  /** stencilStoreAction (MTLStoreAction) */
  @meta.type.unknown
  stencilStoreAction = null;

  /** clearStencilValue (uint32_t) */
  @meta.type.uint32
  clearStencilValue = 0;

}
