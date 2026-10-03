// Source: trinity/trinityal/metal/MetalWorkQueue.h
// Source: trinity/trinityal/metal/MetalWorkQueue.mm
//
// MODELLED ON `MetalWorkQueue`, NOT A REPLICA OF IT - which is what the
// `modelledOn` declaration below says, and why the parity check does not hold
// this class to that class's surface. Metal's work queue declares 113 methods
// to this file's 27, because it is the whole command recorder; comparing them
// would report 101 absences as debt when the surface simply lives elsewhere
// here.
//
// What this file took, and where the rest of Metal's work queue went:
//
//   ENCODER LIFETIME              -> here. BeginFrame/EndFrame, SetCurrentEncoder,
//                                    GetRenderEncoder/ReleaseEncoder, the pass
//                                    hint and its attachments, the pending
//                                    bindings a draw needs.
//   Blend, depth, stencil, cull,  -> the PIPELINE. WebGPU has no per-state
//   fill, sample state               setter; `Tr2RenderStateSetup.GetWebgpuRecipe`
//                                    projects the authored setup and
//                                    `CjsWebgpuPsoDescription` resolves it once.
//   SetTextures/SetSamplers/      -> `CjsWebgpuResourceSetAL` and the bind
//   SetBuffers/SetConstants          groups the render context assembles.
//   Draw*/Dispatch*               -> `CjsWebgpuRenderContextAL`'s draw verbs.
//   Blit, mipmaps, MSAA resolve,  -> not ported, each recorded where it refuses.
//   visibility queries, parallel
//   encoding, the drawable blit
//
// The encoder the backend is currently writing into, and when it has to change.
//
// THIS IS A PORT, NOT A DESIGN. Carbon's command-encoder backend splits into a
// render context that answers the abstraction layer's verbs and a WORK QUEUE
// that owns the command buffer and the encoder lifetime - `Tr2RenderContextAL`
// holds `m_workQueue` (`Tr2RenderContextMetal.h:299`). WebGPU has the same
// shape as Metal: one command encoder per frame, render passes with fixed
// attachments, and compute and copies that may not happen inside one. So this
// carries Carbon's name and Carbon's responsibilities rather than a new noun.
//
// It replaces `framePlan.js`, which looks AHEAD over a recorded intent stream.
// That look-ahead exists only because the planner is not the thing issuing the
// calls - it reads them afterwards. A work queue is called verb by verb, in
// order, so every decision is about the call in hand. Metal's
// `SetCurrentEncoder` (`MetalWorkQueue.mm:840-900`) is lazy for that reason and
// has no look-ahead anywhere.
//
// NOT PORTED, deliberately: the blit and acceleration-structure encoders, the
// parallel render encoder, and the drawable blit. WebGPU takes copies on the
// command encoder directly rather than through a blit encoder, it has no
// parallel encoder, and ray tracing is absent from this backend as it is from
// Carbon's stub. `MTLENCODERTYPE_BLIT` therefore has no counterpart here and
// transfers are recorded against the command encoder itself.

import { CjsSchema } from "#schema";
import { Tr2LoadAction, Tr2StoreAction } from "#consts/render-context";


function fail(message)
{
  const error = new Error(`CjsWebgpuWorkQueue: ${message}`);
  error.code = "CJS_WEBGPU_WORK_QUEUE_INVALID";
  throw error;
}


/** Carbon's `MetalEncoderType`, less the encoders WebGPU does not have. */
export const EncoderType = Object.freeze({
  NONE: "none",
  RENDER: "render",
  COMPUTE: "compute"
});


/**
 * Owns the encoder lifetime for one frame, as Carbon's `MetalWorkQueue` does.
 *
 * DEVICE-FREE, for the reason Carbon's stub backend is: the rules are the part
 * worth testing, and they need no GPU. A caller applies the transitions this
 * reports to a real command encoder.
 */
export class CjsWebgpuWorkQueue
{
  /** m_currentEncoderType */
  _currentEncoderType = EncoderType.NONE;

  /** m_pendingRenderPassHint / m_hasPendingRenderPassHint */
  _pendingRenderPassHint = null;

  /**
   * m_pendingClear, with the clear actions Metal writes into its pass
   * descriptor (`ClearAttachment`), in the hint's `{ colors, depth }` form.
   */
  _pendingClear = null;

  /** Transitions since the last drain, in order. */
  _events = [];

  /** Render passes begun this frame. */
  _passCount = 0;

  /** Whether BeginFrame has run without a matching EndFrame. */
  _inFrame = false;

  /** m_currentRenderPassDescriptor.colorAttachments */
  _colorAttachments = [];

  /** m_currentRenderPassDescriptor.depthAttachment */
  _depthAttachment = null;

  /**
   * The encoder currently open.
   *
   * @returns {string} An `EncoderType`.
   */
  GetCurrentEncoderType()
  {
    return this._currentEncoderType;
  }

  /** Render passes begun this frame. @returns {number} */
  GetPassCount()
  {
    return this._passCount;
  }

  /** Whether a hint is waiting to be folded in. @returns {boolean} */
  HasPendingRenderPassHint()
  {
    return this._pendingRenderPassHint !== null;
  }

  /**
   * Opens the frame's command buffer. Carbon's `BeginFrame`.
   *
   * Returns its transitions like every other verb here, so a caller drains one
   * list per call and never carries events into the next one.
   *
   * @returns {object[]} The transitions this required.
   */
  BeginFrame()
  {
    if (this._inFrame) fail("BeginFrame without EndFrame");

    this._inFrame = true;
    this._passCount = 0;
    this._pendingClear = null;
    // Nothing named last frame is wanted this frame until a verb names it.
    this._pending = { pipeline: null, vertexBuffers: [], indexBuffer: null, bindGroups: [] };
    this._events.push({ type: "begin-frame" });

    return this._Drain();
  }

  /**
   * Closes any encoder and commits. Carbon's `EndFrame` plus
   * `CommitCommandBuffer`.
   *
   * @returns {object[]} The transitions this required, in order.
   */
  EndFrame()
  {
    if (!this._inFrame) fail("EndFrame without BeginFrame");

    if (this._pendingRenderPassHint || this._pendingClear) this._GetRenderEncoder(false);

    this._ReleaseEncoder();
    this._inFrame = false;
    this._events.push({ type: "commit" });

    return this._Drain();
  }

  /**
   * Declares what the next render pass does with its attachments.
   *
   * A SECOND HINT WHILE ONE IS PENDING OPENS AND IMMEDIATELY RELEASES A RENDER
   * ENCODER (`MetalWorkQueue.mm:3282-3291`). The first hint described a pass
   * that must still happen - its load and store actions are the point even when
   * nothing drew into it - so discarding it would lose a clear. WebGPU has
   * no DONT_CARE load action, so an unused pass preserves those attachments
   * instead of realizing their discard as a destructive clear.
   *
   * @param {object[]} colors `Tr2ColorAttachment`s, in slot order.
   * @param {object} [depth] A `Tr2DepthAttachment`.
   */
  RenderPassHint(colors, depth = null)
  {
    if (!Array.isArray(colors)) fail("RenderPassHint takes an array of colour attachments");

    if (this._pendingRenderPassHint)
    {
      this._GetRenderEncoder(false);
      this._ReleaseEncoder();
    }

    this._pendingRenderPassHint = { colors, depth };
  }

  /**
   * Ends the declared pass, so following work opens a new one.
   *
   * Carbon flushes rather than discards, for the reason above
   * (`MetalWorkQueue.mm:3293-3300`).
   *
   * @returns {object[]} The transitions this required.
   */
  EndRenderPassHint()
  {
    if (this._pendingRenderPassHint || this._pendingClear) this._GetRenderEncoder(false);

    this._ReleaseEncoder();

    return this._Drain();
  }

  /**
   * Carbon's `ClearAttachment` (`MetalWorkQueue.mm:2845-2881`): the clear
   * goes on the attachments bound NOW, as the load actions of the next pass
   * over them. Ignored while a hint is pending, whose actions govern that
   * pass; any open encoder is ended first, so the clear starts a pass.
   *
   * Changing an attachment runs a pending clear before the change
   * (`_FlushOutstandingOperations`), so a clear never lands on the targets
   * bound after it: that is the difference from a hint.
   *
   * @param {object[]} colors `Tr2ColorAttachment`s for the bound slots, in order.
   * @param {object|null} depth A `Tr2DepthAttachment`, or null.
   * @returns {object[]} The transitions this required.
   */
  ClearAttachment(colors, depth = null)
  {
    if (this._pendingRenderPassHint) return this._Drain();

    this._FlushOutstandingOperations();
    this._pendingClear = { colors, depth };

    return this._Drain();
  }

  /**
   * Carbon's `FlushOutstandingOperations` (`MetalWorkQueue.mm:380-405`):
   * ends the open encoder, then runs a pending clear in a pass of its own
   * over the current attachments. A pending hint is set aside for that pass
   * and stays pending, as Metal backs it up and restores it.
   */
  _FlushOutstandingOperations()
  {
    this._ReleaseEncoder();

    if (!this._pendingClear || !this._inFrame) return;

    const hint = this._pendingRenderPassHint;

    this._pendingRenderPassHint = null;
    this._GetRenderEncoder(false);
    this._ReleaseEncoder();
    this._pendingRenderPassHint = hint;
  }

  /** Carbon's `EndCurrentRenderPass`. @returns {object[]} The transitions. */
  EndCurrentRenderPass()
  {
    if (this._currentEncoderType === EncoderType.RENDER) this._ReleaseEncoder();

    return this._Drain();
  }

  /**
   * Makes an encoder of the given type current, as `SetCurrentEncoder` does.
   *
   * @param {string} encoderType An `EncoderType` other than NONE.
   * @returns {object[]} The transitions this required, in order.
   */
  SetCurrentEncoder(encoderType)
  {
    if (!this._inFrame) fail("SetCurrentEncoder outside a frame");
    if (encoderType === EncoderType.NONE) fail("SetCurrentEncoder needs a real encoder type");

    // Carbon flushes a pending hint before any NON-render encoder, because the
    // declared pass must happen before the work that follows it
    // (`MetalWorkQueue.mm:851-855`).
    if (encoderType !== EncoderType.RENDER && this._pendingRenderPassHint)
    {
      this._GetRenderEncoder(false);
      this._ReleaseEncoder();
    }

    if (this._currentEncoderType === encoderType)
    {
      // A pending hint describes the NEXT pass, so an open render encoder is
      // still the wrong one to keep drawing into.
      if (encoderType !== EncoderType.RENDER || !this._pendingRenderPassHint) return this._Drain();
    }

    if (encoderType === EncoderType.RENDER)
    {
      this._GetRenderEncoder();

      return this._Drain();
    }

    this._ReleaseEncoder();
    this._currentEncoderType = encoderType;
    this._events.push({ type: "open", encoderType });

    // Metal's compute encoder (`MetalWorkQueue.mm` GetComputeEncoder): a
    // compute pass on the frame's command encoder, starting with nothing bound.
    if (encoderType === EncoderType.COMPUTE && this._commandEncoder)
    {
      this._computePass = this._commandEncoder.beginComputePass({ label: "Tr2RenderContextAL compute" });
      this._encoderState = { pipeline: null, vertexBuffers: [], indexBuffer: null, bindGroups: [] };
    }

    return this._Drain();
  }

  /** The open compute pass, or null. */
  _computePass = null;

  /**
   * Regenerates a texture's mip chain, as Metal's work queue does on a blit
   * encoder: the open pass ends first, so the chain is encoded in order with
   * the work around it.
   *
   * @param {GPUTexture} texture The texture.
   * @param {CjsWebgpuMipGenerator} generator The context's generator.
   * @returns {object[]} The transitions this required.
   */
  GenerateMipMaps(texture, generator)
  {
    if (!this._inFrame) fail("GenerateMipMaps outside a frame");

    this._ReleaseEncoder();
    this._events.push({ type: "generate-mips" });

    if (this._commandEncoder) generator.Encode(this._commandEncoder, texture);

    return this._Drain();
  }

  /**
   * Copies one texture subresource region into another: Metal's
   * `MetalWorkQueue::CopyTextureToTexture` (`MetalWorkQueue.mm:1381-1405`),
   * which records a blit and releases the encoder. WebGPU copies on the
   * command encoder itself, so the open pass is released first, as
   * `GenerateMipMaps` does.
   *
   * @param {GPUTexture} source The texture to read.
   * @param {number} sourceSlice The source array layer.
   * @param {number} sourceMip The source mip level.
   * @param {{x: number, y: number, z: number}} sourceOrigin The source origin.
   * @param {{width: number, height: number, depthOrArrayLayers: number}} size The copy size.
   * @param {GPUTexture} destination The texture to write.
   * @param {number} destinationSlice The destination array layer.
   * @param {number} destinationMip The destination mip level.
   * @param {{x: number, y: number, z: number}} destinationOrigin The destination origin.
   * @returns {object[]} The transitions this required.
   */
  CopyTextureToTexture(source, sourceSlice, sourceMip, sourceOrigin, size, destination, destinationSlice, destinationMip, destinationOrigin)
  {
    if (!this._inFrame) fail("CopyTextureToTexture outside a frame");

    this._ReleaseEncoder();
    this._events.push({ type: "copy-texture" });

    if (this._commandEncoder)
    {
      this._commandEncoder.copyTextureToTexture(
        { texture: source, mipLevel: sourceMip, origin: { x: sourceOrigin.x, y: sourceOrigin.y, z: sourceOrigin.z + sourceSlice } },
        { texture: destination, mipLevel: destinationMip, origin: { x: destinationOrigin.x, y: destinationOrigin.y, z: destinationOrigin.z + destinationSlice } },
        size
      );
    }

    return this._Drain();
  }

  /**
   * Fills a buffer with zeros: the fast path of Metal's
   * `MetalWorkQueue::ClearBuffer` (`MetalWorkQueue.mm:1216-1225`), a blit
   * `fillBuffer` that then releases the encoder. WebGPU's `clearBuffer` is on
   * the command encoder, so the open pass is released first, as
   * `CopyTextureToTexture` does. Only zero is expressible; Metal's other
   * values go through a compute shader this queue does not have.
   *
   * @param {GPUBuffer} buffer The buffer to zero, whole.
   * @returns {object[]} The transitions this required.
   */
  ClearBuffer(buffer)
  {
    if (!this._inFrame) fail("ClearBuffer outside a frame");

    this._ReleaseEncoder();
    this._events.push({ type: "clear-buffer" });

    if (this._commandEncoder) this._commandEncoder.clearBuffer(buffer);

    return this._Drain();
  }

  /**
   * Copies a sampled depth texture into its float shadow
   * (`CjsWebgpuTextureAL.EncodeDepthShadowCopy`), on the command encoder and
   * so outside any pass. There is no Metal counterpart: Metal and D3D sample
   * depth through a view, which WebGPU cannot make.
   *
   * Complete pending render work before the copy, like Metal's non-render
   * encoder transition (MetalWorkQueue.mm:851-855). Otherwise an empty depth
   * pass leaves its discard hint for the next transparent draw, discarding
   * that draw's color; a pending clear must also precede the sampled copy.
   *
   * @param {object} texture The depth `Tr2TextureAL` that was just unbound.
   * @returns {object[]} The transitions this required.
   */
  CopyDepthShadow(texture)
  {
    if (!this._inFrame || !this._commandEncoder) return this._Drain();

    if (this._pendingRenderPassHint || this._pendingClear) this._GetRenderEncoder(false);
    this._ReleaseEncoder();

    if (texture.EncodeDepthShadowCopy(this._commandEncoder)) this._events.push({ type: "copy-depth-shadow" });

    return this._Drain();
  }

  /**
   * Names the compute pipeline the next dispatch runs.
   *
   * @param {object} pipeline A `GPUComputePipeline`.
   */
  SetComputePipeline(pipeline)
  {
    this._pending.computePipeline = pipeline;
  }

  /**
   * Dispatches thread groups on the compute encoder, opening one if another
   * encoder is current: Metal's `DispatchThreadgroups`, which binds the
   * pending pipeline and bind groups first.
   *
   * @param {number} x Thread groups along x.
   * @param {number} y Thread groups along y.
   * @param {number} z Thread groups along z.
   * @returns {object[]} The transitions this required.
   */
  DispatchThreadgroups(x, y, z)
  {
    const pass = this._EmitComputeEncoderState({ type: "dispatch", x, y, z });

    if (pass) pass.dispatchWorkgroups(x, y, z);

    return this._Drain();
  }

  /**
   * Dispatches thread groups whose counts the GPU reads from a buffer: Metal's
   * `Dispatch( indirectBuffer, indirectBufferOffset )` (`MetalWorkQueue.mm:3077`),
   * WebGPU's `dispatchWorkgroupsIndirect`. The buffer holds three u32 group
   * counts at `offset`, D3D's `D3D11_DISPATCH_INDIRECT_ARGS` layout.
   *
   * @param {object} indirectBuffer A `GPUBuffer` with INDIRECT usage.
   * @param {number} offset Byte offset of the arguments, a multiple of 4.
   * @returns {object[]} The transitions this required.
   */
  DispatchThreadgroupsIndirect(indirectBuffer, offset)
  {
    const pass = this._EmitComputeEncoderState({ type: "dispatch", indirect: true, offset });

    if (pass) pass.dispatchWorkgroupsIndirect(indirectBuffer, offset);

    return this._Drain();
  }

  /**
   * Metal's `EmitComputeEncoderState`: opens the compute encoder if another is
   * current, records the event, and binds the pending pipeline and bind groups.
   *
   * @param {object} event The dispatch event to record.
   * @returns {object|null} The live compute pass, or null when recording only.
   */
  _EmitComputeEncoderState(event)
  {
    if (!this._inFrame) fail("a dispatch outside a frame");

    const events = this._currentEncoderType === EncoderType.COMPUTE ? [] : this.SetCurrentEncoder(EncoderType.COMPUTE);

    this._events.push(...events, event);

    const pass = this._computePass;

    if (!pass) return null;

    pass.setPipeline(this._pending.computePipeline);

    for (const [ index, entry ] of this._pending.bindGroups.entries())
    {
      if (entry) pass.setBindGroup(index, entry.bindGroup, entry.dynamicOffsets ?? []);
    }

    return pass;
  }

  /**
   * Attaches a colour target at one slot.
   *
   * THREE BEHAVIOURS, ALL CARBON'S (`MetalWorkQueue.mm:2000-2030`), and none of
   * them guessable:
   *
   * 1. **Attaching the texture already there is a no-op.** A redundant target
   *    set is common - a step that re-binds what it inherited - and cutting a
   *    pass for it would double the pass count for nothing.
   * 2. **A real change flushes outstanding work**, because the attachments of
   *    an open pass are fixed and the next work needs a new encoder. Carbon's
   *    comment says exactly this.
   * 3. **A newly attached texture defaults to LOAD and STORE**, not clear. The
   *    caller has not said the previous contents are worthless, so discarding
   *    them would lose whatever is already there.
   *
   * @param {object|null} texture The target, or null to detach.
   * @param {number} [index] The slot.
   * @param {number} [slice] The array slice or cube face.
   * @returns {object[]} The transitions this required.
   */
  SetRenderAttachments(texture, index = 0, slice = 0)
  {
    if (!Number.isInteger(index) || index < 0) fail("a render attachment needs a slot index");

    const current = this._colorAttachments[index] ?? null;

    if (current?.texture === (texture ?? null)) return this._Drain();

    this._FlushOutstandingOperations();

    this._colorAttachments[index] = texture
      ? { texture, slice, loadOp: "load", storeOp: "store" }
      : null;

    return this._Drain();
  }

  /**
   * Attaches the depth-stencil target, with the same three behaviours.
   *
   * @param {object|null} texture The depth target, or null to detach.
   * @returns {object[]} The transitions this required.
   */
  SetDepthAttachment(texture)
  {
    if (this._depthAttachment?.texture === (texture ?? null)) return this._Drain();

    this._FlushOutstandingOperations();

    this._depthAttachment = texture ? { texture, loadOp: "load", storeOp: "store" } : null;

    return this._Drain();
  }

  /**
   * What is currently attached, for a caller building a pass descriptor.
   *
   * @returns {object} `{ colors, depth }`.
   */
  GetAttachments()
  {
    return {
      colors: this._colorAttachments.map(attachment => (attachment ? { ...attachment } : null)),
      depth: this._depthAttachment ? { ...this._depthAttachment } : null
    };
  }

  /**
   * Records an indexed draw, opening a render encoder if none is current.
   *
   * THE DRAW OPENS THE ENCODER, which is why this lives here rather than the
   * caller reaching for `SetCurrentEncoder` first. Carbon's
   * `MetalWorkQueue::DrawIndexedPrimitives` (`mm:2922-2945`) begins with
   * `GetRenderEncoder()` for exactly this reason: the abstraction layer's job
   * is to validate arguments and convert primitive counts, and the work
   * queue's job is to have somewhere to put the result.
   *
   * @param {number} indexCount Indices this draw reads.
   * @param {number} instanceCount Instances to draw.
   * @param {number} startIndex First index.
   * @param {number} baseVertex Value added to every index.
   * @param {number} startInstance First instance id.
   * @returns {object[]} The transitions this required, in order.
   */
  DrawIndexedPrimitives(indexCount, instanceCount, startIndex, baseVertex, startInstance)
  {
    this._RequireRenderEncoder();
    this._events.push({
      type: "draw",
      indexed: true,
      indexCount,
      instanceCount,
      startIndex,
      baseVertex,
      startInstance
    });

    if (this._renderPass)
    {
      this._EmitRenderEncoderState(true);
      this._renderPass.drawIndexed(indexCount, instanceCount, startIndex, baseVertex, startInstance);
    }

    return this._Drain();
  }

  /**
   * Records an indexed draw whose arguments the GPU reads from a buffer:
   * Metal's indirect `DrawIndexedPrimitives` (`MetalWorkQueue.mm:2946`),
   * WebGPU's `drawIndexedIndirect`. The buffer holds five u32 words at
   * `offset`, D3D's `D3D11_DRAW_INDEXED_INSTANCED_INDIRECT_ARGS` layout.
   *
   * @param {object} indirectBuffer A `GPUBuffer` with INDIRECT usage.
   * @param {number} offset Byte offset of the arguments, a multiple of 4.
   * @returns {object[]} The transitions this required, in order.
   */
  DrawIndexedPrimitivesIndirect(indirectBuffer, offset)
  {
    this._RequireRenderEncoder();
    this._events.push({ type: "draw", indexed: true, indirect: true, offset });

    if (this._renderPass)
    {
      this._EmitRenderEncoderState(true);
      this._renderPass.drawIndexedIndirect(indirectBuffer, offset);
    }

    return this._Drain();
  }

  // THE BINDINGS A DRAW NEEDS, HELD UNTIL THE DRAW. Metal's setters write
  // shadow state and a dirty bit (`MetalWorkQueue.mm:2570-2598`) and the
  // encoder is touched only from `EmitRenderEncoderState` inside the draw
  // (`:1750-1890`). These three do the same, and the live half below compares
  // against what the CURRENT encoder has already been told, which resets when
  // an encoder opens - a new pass starts with nothing bound.

  /** What the next draw must have bound. */
  _pending = { pipeline: null, computePipeline: null, vertexBuffers: [], indexBuffer: null, bindGroups: [] };

  /** What the open encoder has been told, reset per encoder. */
  _encoderState = { pipeline: null, vertexBuffers: [], indexBuffer: null, bindGroups: [] };

  /**
   * m_viewport, null until one is set (m_validViewport). It outlives passes
   * and frames, as Metal's does, and every new encoder applies it again.
   */
  _viewport = null;

  /**
   * Metal's `SetViewport` (`MetalWorkQueue.mm:2166-2171`): held until the next
   * draw, like the bindings above.
   *
   * @param {number} originX Left edge, in pixels.
   * @param {number} originY Top edge, in pixels.
   * @param {number} width Width, in pixels.
   * @param {number} height Height, in pixels.
   * @param {number} znear Depth the near plane maps to.
   * @param {number} zfar Depth the far plane maps to.
   */
  SetViewport(originX, originY, width, height, znear, zfar)
  {
    this._viewport = { originX, originY, width, height, znear, zfar };
  }

  /**
   * Names the bind group for one group index.
   *
   * @param {number} index The group index.
   * @param {object} bindGroup A `GPUBindGroup`.
   */
  SetBindGroup(index, bindGroup, dynamicOffsets = null)
  {
    this._pending.bindGroups[index] = { bindGroup, dynamicOffsets: dynamicOffsets?.length ? dynamicOffsets.slice() : null };
  }

  /**
   * Names the pipeline the next draw runs.
   *
   * @param {object} pipeline A `GPURenderPipeline`.
   */
  SetRenderPipeline(pipeline)
  {
    this._pending.pipeline = pipeline;
  }

  /**
   * Names a vertex buffer for one slot.
   *
   * @param {number} slot The vertex buffer slot.
   * @param {object} buffer A `GPUBuffer`.
   * @param {number} [offset] Byte offset into it.
   */
  SetVertexBuffer(slot, buffer, offset = 0)
  {
    this._pending.vertexBuffers[slot] = { buffer, offset };
  }

  /**
   * Names the index buffer.
   *
   * @param {object} buffer A `GPUBuffer`.
   * @param {string} format `"uint16"` or `"uint32"`.
   * @param {number} [offset] Byte offset into it.
   */
  SetIndexBuffer(buffer, format, offset = 0)
  {
    this._pending.indexBuffer = { buffer, format, offset };
  }

  /** Metal's `EmitRenderEncoderState`: bind what differs from the encoder's. */
  _EmitRenderEncoderState(indexed)
  {
    const pass = this._renderPass;
    const live = this._encoderState;
    const want = this._pending;

    if (want.pipeline && live.pipeline !== want.pipeline)
    {
      pass.setPipeline(want.pipeline);
      live.pipeline = want.pipeline;
    }

    if (this._viewport && live.viewport !== this._viewport)
    {
      this._EmitViewport(pass, this._viewport);
      live.viewport = this._viewport;
    }

    want.bindGroups.forEach((entry, index) =>
    {
      if (!entry) return;

      const bound = live.bindGroups[index];

      // Metal re-sets only the OFFSET when the page is unchanged
      // (`setVertexBufferOffset:`); WebGPU has no such call, so a changed
      // offset re-sets the group with its offsets.
      if (bound && bound.bindGroup === entry.bindGroup && sameOffsets(bound.dynamicOffsets, entry.dynamicOffsets)) return;

      if (entry.dynamicOffsets) pass.setBindGroup(index, entry.bindGroup, entry.dynamicOffsets);
      else pass.setBindGroup(index, entry.bindGroup);

      live.bindGroups[index] = entry;
    });

    want.vertexBuffers.forEach((entry, slot) =>
    {
      if (!entry) return;

      const bound = live.vertexBuffers[slot];

      if (bound && bound.buffer === entry.buffer && bound.offset === entry.offset) return;

      pass.setVertexBuffer(slot, entry.buffer, entry.offset);
      live.vertexBuffers[slot] = entry;
    });

    if (!indexed || !want.indexBuffer) return;

    const bound = live.indexBuffer;
    const entry = want.indexBuffer;

    if (bound && bound.buffer === entry.buffer && bound.format === entry.format && bound.offset === entry.offset) return;

    pass.setIndexBuffer(entry.buffer, entry.format, entry.offset);
    live.indexBuffer = entry;
  }

  /**
   * Applies a viewport to the open pass (`MetalWorkQueue.mm:1786-1795`).
   *
   * WebGPU refuses a viewport reaching outside the attachments, where D3D11
   * and Metal clip to them, so it is cut to the attachment rectangle first. A
   * viewport that only fits a previous, larger target is thereby rescaled
   * rather than clipped; one inside the attachments is unchanged.
   *
   * @param {object} pass The open `GPURenderPassEncoder`.
   * @param {object} viewport The held viewport.
   */
  _EmitViewport(pass, viewport)
  {
    const attachment = this._colorAttachments.find(Boolean) ?? this._depthAttachment;
    const width = attachment ? attachment.texture.GetWidth() : Infinity;
    const height = attachment ? attachment.texture.GetHeight() : Infinity;
    const x = Math.min(Math.max(viewport.originX, 0), width);
    const y = Math.min(Math.max(viewport.originY, 0), height);
    const minDepth = Math.min(Math.max(viewport.znear, 0), 1);
    const maxDepth = Math.min(Math.max(viewport.zfar, minDepth), 1);

    pass.setViewport(
      x,
      y,
      Math.max(Math.min(viewport.originX + viewport.width, width) - x, 0),
      Math.max(Math.min(viewport.originY + viewport.height, height) - y, 0),
      minDepth,
      maxDepth
    );
  }

  /**
   * Records a non-indexed draw, opening a render encoder if none is current.
   *
   * @param {number} vertexCount Vertices this draw reads.
   * @param {number} instanceCount Instances to draw.
   * @param {number} startVertex First vertex.
   * @param {number} startInstance First instance id.
   * @returns {object[]} The transitions this required, in order.
   */
  DrawPrimitives(vertexCount, instanceCount, startVertex, startInstance)
  {
    this._RequireRenderEncoder();
    this._events.push({
      type: "draw",
      indexed: false,
      vertexCount,
      instanceCount,
      startVertex,
      startInstance
    });

    if (this._renderPass)
    {
      this._EmitRenderEncoderState(false);
      this._renderPass.draw(vertexCount, instanceCount, startVertex, startInstance);
    }

    return this._Drain();
  }

  /**
   * Records a non-indexed draw whose arguments the GPU reads from a buffer:
   * Metal's indirect `DrawPrimitives` (`MetalWorkQueue.mm:2908`), WebGPU's
   * `drawIndirect`. The buffer holds four u32 words at `offset` (vertex count,
   * instance count, first vertex, first instance), D3D's
   * `D3D11_DRAW_INSTANCED_INDIRECT_ARGS` layout.
   *
   * @param {object} indirectBuffer A `GPUBuffer` with INDIRECT usage.
   * @param {number} offset Byte offset of the arguments, a multiple of 4.
   * @returns {object[]} The transitions this required, in order.
   */
  DrawPrimitivesIndirect(indirectBuffer, offset)
  {
    this._RequireRenderEncoder();
    this._events.push({ type: "draw", indexed: false, indirect: true, offset });

    if (this._renderPass)
    {
      this._EmitRenderEncoderState(false);
      this._renderPass.drawIndirect(indirectBuffer, offset);
    }

    return this._Drain();
  }

  // THE DEVICE IS OPTIONAL AND THAT IS THE WHOLE DESIGN. Everything above is
  // the RULES - when an encoder opens, what a hint folds into it, when it has
  // to close - and those need no GPU, which is why they are testable and why
  // Carbon ships a stub backend at all. What follows lets a real command
  // encoder ride along with the rules rather than reimplement them.
  //
  // Without one this queue reports transitions and draws nothing, exactly as
  // before. With one, opening an encoder also calls `beginRenderPass` and
  // closing it calls `end`, so a caller can hand the live pass to the batch
  // dispatcher. That is what stops the queue being a second recording layer.

  /** The live command encoder, when a frame is being encoded for real. */
  _commandEncoder = null;

  /** Turns folded attachments into a `GPURenderPassDescriptor`. */
  _describePass = null;

  /** The open `GPURenderPassEncoder`, or null. */
  _renderPass = null;

  /**
   * Attaches a real command encoder for this frame.
   *
   * @param {object|null} commandEncoder A `GPUCommandEncoder`, or null to detach.
   * @param {Function} [describePass] Maps folded attachments to a pass
   *   descriptor. IT IS CALLED WITH NULL WHEN NO HINT WAS DECLARED, which is
   *   not the same as DONT_CARE - Carbon applies load and store actions only
   *   when a hint is pending, and leaves the backend's own defaults alone
   *   otherwise. A describePass that assumes an object will crash on the
   *   first unhinted pass, which is most of them.
   * @returns {CjsWebgpuWorkQueue} This queue.
   */
  SetCommandEncoder(commandEncoder, describePass = null)
  {
    if (commandEncoder && typeof commandEncoder.beginRenderPass !== "function")
    {
      fail("a command encoder must be a GPUCommandEncoder");
    }

    if (commandEncoder && typeof describePass !== "function")
    {
      fail("a command encoder needs a describePass that returns a render-pass descriptor");
    }

    this._commandEncoder = commandEncoder ?? null;
    this._describePass = commandEncoder ? describePass : null;

    return this;
  }

  /**
   * The open render pass, if one is open and a device is attached.
   *
   * @returns {object|null} A `GPURenderPassEncoder`, or null.
   */
  GetRenderPass()
  {
    return this._renderPass;
  }

  /**
   * Opens a render pass if one is not already open, and returns it.
   *
   * This is the verb a draw path calls: Carbon's Metal backend asks for an
   * encoder at the moment it needs one and never before, so a frame that draws
   * nothing opens nothing.
   *
   * @returns {object|null} A `GPURenderPassEncoder`, or null with no device.
   */
  /**
   * Carbon's `GetRenderEncoder` (`MetalWorkQueue.mm:2922`): opens a render
   * encoder if none is current, BEFORE the draw verb asks whether it can draw.
   * Metal opens first and then tests `EmitRenderEncoderState()`, so a draw that
   * is then refused has still opened its pass - which is why a marker pushed
   * after a refused draw lands on a pass encoder.
   *
   * @returns {object[]} The transitions this required, in order.
   */
  GetRenderEncoder()
  {
    this._RequireRenderEncoder();

    return this._Drain();
  }

  /**
   * The open `GPURenderPassEncoder` for a caller that encodes on it directly.
   *
   * @returns {object|null} The pass, after forgetting what this queue had bound.
   */
  RequireRenderPass()
  {
    this._RequireRenderEncoder();

    // A caller that encodes on the pass directly binds what it likes, so what
    // this queue believes the encoder holds is no longer true.
    this._encoderState = { pipeline: null, vertexBuffers: [], indexBuffer: null, bindGroups: [] };

    return this._renderPass;
  }

  /** Carbon's `GetRenderEncoder`: the current one, or a new one. */
  _RequireRenderEncoder()
  {
    if (!this._inFrame) fail("a draw outside a frame");

    if (this._currentEncoderType === EncoderType.RENDER && !this._pendingRenderPassHint) return;

    this._GetRenderEncoder();
  }

  /**
   * Opens a render encoder, folding any pending hint into its descriptor.
   *
   * @param {boolean} [forDraw] False when flushing a pending pass without a
   * draw: explicit clears still execute, but DONT_CARE does not destroy data.
   */
  _GetRenderEncoder(forDraw = true)
  {
    this._ReleaseEncoder();

    // Metal applies the hint over a descriptor already holding the clear
    // (`MetalWorkQueue.mm:783-805`): an attachment the clear set to CLEAR stays
    // CLEAR, everything else takes the hint's load; opening the pass consumes
    // both (`ApplyRenderPassHint`, then `ResetClearState`).
    const hint = MergeHintOverClear(this._pendingRenderPassHint, this._pendingClear);
    const attachments = ApplyRenderPassHint(hint, forDraw);

    this._pendingRenderPassHint = null;
    this._pendingClear = null;
    this._passCount += 1;
    this._currentEncoderType = EncoderType.RENDER;
    this._events.push({ type: "open", encoderType: EncoderType.RENDER, attachments });

    if (this._commandEncoder)
    {
      this._renderPass = this._commandEncoder.beginRenderPass(this._describePass(attachments));
      this._encoderState = { pipeline: null, vertexBuffers: [], indexBuffer: null, bindGroups: [] };
    }
  }

  /** Carbon's `ReleaseEncoder( true )`. */
  _ReleaseEncoder()
  {
    if (this._currentEncoderType === EncoderType.NONE) return;

    // The pass ends BEFORE the close event, so a caller draining events after
    // a close can rely on the pass already being finished rather than racing it.
    if (this._renderPass)
    {
      this._renderPass.end();
      this._renderPass = null;
    }

    if (this._computePass)
    {
      this._computePass.end();
      this._computePass = null;
    }

    this._events.push({ type: "close", encoderType: this._currentEncoderType });
    this._currentEncoderType = EncoderType.NONE;
  }

  /** Takes the recorded events, leaving the queue's list empty. */
  _Drain()
  {
    const events = this._events;

    this._events = [];

    return events;
  }
}


/** Whether two dynamic-offset lists bind the same regions. */
function sameOffsets(first, second)
{
  if (first === second) return true;
  if (!first || !second || first.length !== second.length) return false;

  for (let index = 0; index < first.length; index += 1)
  {
    if (first[index] !== second[index]) return false;
  }

  return true;
}


/**
 * Turns a declared hint into load and store operations, as Carbon's
 * `ApplyRenderPassHint` writes them into its pass descriptor
 * (`MetalWorkQueue.mm:773-809`).
 *
 * NO HINT IS NOT DONT_CARE. Carbon only applies actions when a hint is pending
 * and otherwise leaves the descriptor as it was, so an absent hint returns null
 * and the caller keeps its own defaults rather than being told to discard.
 *
 * @param {object} [hint] A pending hint.
 * @returns {object|null} `{ colors, depth }` with `load`/`store` per attachment.
 */
/**
 * Carbon's hint application over a pending clear (`MetalWorkQueue.mm:783-805`).
 * Per attachment: a CLEAR load from the clear survives, any other load comes
 * from the hint, and the store action and clear value always come from the
 * hint. Quirk, reproduced: the hint's clear value replaces the clear's, so a
 * cleared attachment clears to the hint's value (Tr2ColorAttachment defaults
 * it to 0), not to the colour Clear asked for. An attachment the hint does not
 * describe keeps the clear's entry.
 *
 * @param {object|null} hint The pending hint, `{ colors, depth }`.
 * @param {object|null} clear The pending clear, `{ colors, depth }`.
 * @returns {object|null} The attachments the pass opens with.
 */
export function MergeHintOverClear(hint, clear)
{
  if (!hint) return clear;
  if (!clear) return hint;

  const merge = (fromHint, fromClear) =>
  {
    if (!fromHint) return fromClear;
    if (!fromClear || fromClear.load !== Tr2LoadAction.CLEAR) return fromHint;
    return { load: Tr2LoadAction.CLEAR, store: fromHint.store, clearColor: fromHint.clearColor ?? fromHint.clearValue };
  };

  const count = Math.max(hint.colors.length, clear.colors.length);
  const colors = [];
  for (let slot = 0; slot < count; slot++) colors.push(merge(hint.colors[slot], clear.colors[slot]));

  return { colors, depth: merge(hint.depth, clear.depth) };
}

/**
 * Converts color and optional depth attachment hints to WebGPU load/store
 * descriptions, or returns null for no hint. When an unused pending pass is
 * closed or replaced, preserve DONT_CARE attachments: WebGPU has no undefined
 * load action, and clearing them would erase data without a draw. Explicit
 * CLEAR remains observable even in an empty pass.
 *
 * @param {object|null} hint Pending attachment actions.
 * @param {boolean} [forDraw] Whether this pass is opened for rendering.
 * @returns {object|null} WebGPU attachment load/store descriptions.
 */
export function ApplyRenderPassHint(hint, forDraw = true)
{
  if (!hint) return null;

  return {
    colors: hint.colors.map(attachment => Describe(attachment, forDraw)),
    depth: hint.depth ? Describe(hint.depth, forDraw) : null
  };
}

function Describe(attachment, forDraw)
{
  return {
    loadOp: !forDraw && attachment.load === Tr2LoadAction.DONT_CARE ? "load" : LoadOp(attachment.load),
    storeOp: !forDraw || attachment.store === Tr2StoreAction.STORE ? "store" : "discard",
    clearValue: attachment.clearColor ?? attachment.clearValue ?? 0
  };
}

function LoadOp(action)
{
  if (action === Tr2LoadAction.CLEAR) return "clear";
  if (action === Tr2LoadAction.LOAD) return "load";

  // DONT_CARE has no WebGPU spelling - the API has no "contents are undefined"
  // load. `clear` is the honest mapping: `load` would promise to preserve
  // contents the caller has said it does not need, which costs a fetch on
  // exactly the tile-based hardware the hint exists for.
  return "clear";
}


// DECLARED AS A CALL, NOT A DECORATOR. The abstraction layer is imported
// straight from source by its tests - `#trinityal/...` resolves to `src/` - and
// raw Node cannot parse decorator syntax, so a decorator here breaks every test
// that reaches this file without a build first. `CjsSchema.define` is the same
// metadata through the door the schema already provides for exactly this, and
// it keeps the layer free of the decorator chain it has never carried.
CjsSchema.define(CjsWebgpuWorkQueue, { className: "CjsWebgpuWorkQueue", modelledOn: "MetalWorkQueue" });
