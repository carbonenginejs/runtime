// Source: trinity/trinityal/metal/MetalWorkQueue.h
//
// NOT DROPPED AS A CONCEPT - only as a struct. Carbon's work queue defers the
// render pass until it knows the attachments, and carries them in this record:
// a depth attachment and METAL_MAX_RENDER_TARGETS colour attachments, each with
// a load action, a store action and a clear value.
//
// We port the behaviour and FLATTEN the record. CjsWebgpuRenderContextAL exposes
// RenderPassHint(...attachments)/EndRenderPassHint, and CjsWebgpuWorkQueue holds
// it as _pendingRenderPassHint - its comment names Carbon's own
// m_pendingRenderPassHint / m_hasPendingRenderPassHint members. The attachments
// travel as loose `colors` and `depth` arguments rather than one struct,
// because WebGPU's GPURenderPassDescriptor already has that shape.
//
// Writing this class is what surfaced the flattening: a search for the NAME
// finds nothing, and would have reported the concept as unported.
import { type } from "#schema";
import { CjsModel } from "#model";

/** Carbon's deferred render-pass attachment record; ported as flattened colors/depth arguments rather than a struct. */
@type.define({ className: "MetalRenderPassHint", carbon: "MetalRenderPassHint", family: "trinityal" })
export class MetalRenderPassHint extends CjsModel
{

  /** depth (DepthAttachment): load, store, clearValue. */
  @type.unknown
  depth = null;

  /** color[METAL_MAX_RENDER_TARGETS] (ColorAttachment): load, store, clearColor. */
  @type.unknown
  color = null;

}
