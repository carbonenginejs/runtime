// Source: trinity/trinityal/metal/MetalWorkQueue.h
//
// NOT DROPPED AS A CONCEPT - only as a replica. Carbon's command-encoder backend
// splits into a render context that answers the abstraction layer's verbs and a
// work queue that owns the command buffer and the encoder lifetime
// (Tr2RenderContextMetal.h:299 holds m_workQueue). WebGPU has Metal's shape: one
// command encoder per frame, fixed-attachment render passes, and compute and
// copies that may not happen inside one.
//
// CjsWebgpuWorkQueue ports that split and declares `modelledOn: "MetalWorkQueue"`.
// It takes the ENCODER LIFETIME - BeginFrame/EndFrame, the current encoder, the
// deferred render-pass hint, the pending bindings a draw needs - and nothing
// else. Metal's queue is the whole command recorder (113 methods to that file's
// 27); the rest went to the pipeline, the resource sets and the render context's
// draw verbs, and CjsWebgpuWorkQueue's head comment maps each one.
//
// Written because a `modelledOn` declaration does not count as a port: until
// this file existed, donor coverage reported MetalWorkQueue as covered only by a
// class that declines to replicate it.
import { type } from "#schema";
import { CjsModel } from "#model";

/** Carbon's Metal command recorder; its encoder-lifetime half is ported as CjsWebgpuWorkQueue and the rest is distributed across the WebGPU backend. */
@type.define({ className: "MetalWorkQueue", carbon: "MetalWorkQueue", family: "trinityal" })
export class MetalWorkQueue extends CjsModel
{

}
