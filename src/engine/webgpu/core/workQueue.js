// Source: trinity/trinityal/metal/MetalWorkQueue.h
// Source: trinity/trinityal/metal/MetalWorkQueue.mm
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
  #currentEncoderType = EncoderType.NONE;

  /** m_pendingRenderPassHint / m_hasPendingRenderPassHint */
  #pendingRenderPassHint = null;

  /** Transitions since the last drain, in order. */
  #events = [];

  /** Render passes begun this frame. */
  #passCount = 0;

  /** Whether BeginFrame has run without a matching EndFrame. */
  #inFrame = false;

  /** m_currentRenderPassDescriptor.colorAttachments */
  #colorAttachments = [];

  /** m_currentRenderPassDescriptor.depthAttachment */
  #depthAttachment = null;

  /**
   * The encoder currently open.
   *
   * @returns {string} An `EncoderType`.
   */
  GetCurrentEncoderType()
  {
    return this.#currentEncoderType;
  }

  /** Render passes begun this frame. @returns {number} */
  GetPassCount()
  {
    return this.#passCount;
  }

  /** Whether a hint is waiting to be folded in. @returns {boolean} */
  HasPendingRenderPassHint()
  {
    return this.#pendingRenderPassHint !== null;
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
    if (this.#inFrame) fail("BeginFrame without EndFrame");

    this.#inFrame = true;
    this.#passCount = 0;
    this.#events.push({ type: "begin-frame" });

    return this.#Drain();
  }

  /**
   * Closes any encoder and commits. Carbon's `EndFrame` plus
   * `CommitCommandBuffer`.
   *
   * @returns {object[]} The transitions this required, in order.
   */
  EndFrame()
  {
    if (!this.#inFrame) fail("EndFrame without BeginFrame");

    if (this.#pendingRenderPassHint) this.#GetRenderEncoder();

    this.#ReleaseEncoder();
    this.#inFrame = false;
    this.#events.push({ type: "commit" });

    return this.#Drain();
  }

  /**
   * Declares what the next render pass does with its attachments.
   *
   * A SECOND HINT WHILE ONE IS PENDING OPENS AND IMMEDIATELY RELEASES A RENDER
   * ENCODER (`MetalWorkQueue.mm:3282-3291`). The first hint described a pass
   * that must still happen - its load and store actions are the point even when
   * nothing drew into it - so discarding it would lose a clear.
   *
   * @param {object[]} colors `Tr2ColorAttachment`s, in slot order.
   * @param {object} [depth] A `Tr2DepthAttachment`.
   */
  RenderPassHint(colors, depth = null)
  {
    if (!Array.isArray(colors)) fail("RenderPassHint takes an array of colour attachments");

    if (this.#pendingRenderPassHint)
    {
      this.#GetRenderEncoder();
      this.#ReleaseEncoder();
    }

    this.#pendingRenderPassHint = { colors, depth };
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
    if (this.#pendingRenderPassHint) this.#GetRenderEncoder();

    this.#ReleaseEncoder();

    return this.#Drain();
  }

  /** Carbon's `EndCurrentRenderPass`. @returns {object[]} The transitions. */
  EndCurrentRenderPass()
  {
    if (this.#currentEncoderType === EncoderType.RENDER) this.#ReleaseEncoder();

    return this.#Drain();
  }

  /**
   * Makes an encoder of the given type current, as `SetCurrentEncoder` does.
   *
   * @param {string} encoderType An `EncoderType` other than NONE.
   * @returns {object[]} The transitions this required, in order.
   */
  SetCurrentEncoder(encoderType)
  {
    if (!this.#inFrame) fail("SetCurrentEncoder outside a frame");
    if (encoderType === EncoderType.NONE) fail("SetCurrentEncoder needs a real encoder type");

    // Carbon flushes a pending hint before any NON-render encoder, because the
    // declared pass must happen before the work that follows it
    // (`MetalWorkQueue.mm:851-855`).
    if (encoderType !== EncoderType.RENDER && this.#pendingRenderPassHint)
    {
      this.#GetRenderEncoder();
      this.#ReleaseEncoder();
    }

    if (this.#currentEncoderType === encoderType)
    {
      // A pending hint describes the NEXT pass, so an open render encoder is
      // still the wrong one to keep drawing into.
      if (encoderType !== EncoderType.RENDER || !this.#pendingRenderPassHint) return this.#Drain();
    }

    if (encoderType === EncoderType.RENDER)
    {
      this.#GetRenderEncoder();

      return this.#Drain();
    }

    this.#ReleaseEncoder();
    this.#currentEncoderType = encoderType;
    this.#events.push({ type: "open", encoderType });

    return this.#Drain();
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

    const current = this.#colorAttachments[index] ?? null;

    if (current?.texture === (texture ?? null)) return this.#Drain();

    this.#ReleaseEncoder();

    this.#colorAttachments[index] = texture
      ? { texture, slice, loadOp: "load", storeOp: "store" }
      : null;

    return this.#Drain();
  }

  /**
   * Attaches the depth-stencil target, with the same three behaviours.
   *
   * @param {object|null} texture The depth target, or null to detach.
   * @returns {object[]} The transitions this required.
   */
  SetDepthAttachment(texture)
  {
    if (this.#depthAttachment?.texture === (texture ?? null)) return this.#Drain();

    this.#ReleaseEncoder();

    this.#depthAttachment = texture ? { texture, loadOp: "load", storeOp: "store" } : null;

    return this.#Drain();
  }

  /**
   * What is currently attached, for a caller building a pass descriptor.
   *
   * @returns {object} `{ colors, depth }`.
   */
  GetAttachments()
  {
    return {
      colors: this.#colorAttachments.map(attachment => (attachment ? { ...attachment } : null)),
      depth: this.#depthAttachment ? { ...this.#depthAttachment } : null
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
    this.#RequireRenderEncoder();
    this.#events.push({
      type: "draw",
      indexed: true,
      indexCount,
      instanceCount,
      startIndex,
      baseVertex,
      startInstance
    });

    return this.#Drain();
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
    this.#RequireRenderEncoder();
    this.#events.push({
      type: "draw",
      indexed: false,
      vertexCount,
      instanceCount,
      startVertex,
      startInstance
    });

    return this.#Drain();
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
  #commandEncoder = null;

  /** Turns folded attachments into a `GPURenderPassDescriptor`. */
  #describePass = null;

  /** The open `GPURenderPassEncoder`, or null. */
  #renderPass = null;

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

    this.#commandEncoder = commandEncoder ?? null;
    this.#describePass = commandEncoder ? describePass : null;

    return this;
  }

  /**
   * The open render pass, if one is open and a device is attached.
   *
   * @returns {object|null} A `GPURenderPassEncoder`, or null.
   */
  GetRenderPass()
  {
    return this.#renderPass;
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
  RequireRenderPass()
  {
    this.#RequireRenderEncoder();

    return this.#renderPass;
  }

  /** Carbon's `GetRenderEncoder`: the current one, or a new one. */
  #RequireRenderEncoder()
  {
    if (!this.#inFrame) fail("a draw outside a frame");

    if (this.#currentEncoderType === EncoderType.RENDER && !this.#pendingRenderPassHint) return;

    this.#GetRenderEncoder();
  }

  /** Opens a render encoder, folding any pending hint into its descriptor. */
  #GetRenderEncoder()
  {
    this.#ReleaseEncoder();

    const hint = this.#pendingRenderPassHint;
    const attachments = ApplyRenderPassHint(hint);

    this.#pendingRenderPassHint = null;
    this.#passCount += 1;
    this.#currentEncoderType = EncoderType.RENDER;
    this.#events.push({ type: "open", encoderType: EncoderType.RENDER, attachments });

    if (this.#commandEncoder)
    {
      this.#renderPass = this.#commandEncoder.beginRenderPass(this.#describePass(attachments));
    }
  }

  /** Carbon's `ReleaseEncoder( true )`. */
  #ReleaseEncoder()
  {
    if (this.#currentEncoderType === EncoderType.NONE) return;

    // The pass ends BEFORE the close event, so a caller draining events after
    // a close can rely on the pass already being finished rather than racing it.
    if (this.#renderPass)
    {
      this.#renderPass.end();
      this.#renderPass = null;
    }

    this.#events.push({ type: "close", encoderType: this.#currentEncoderType });
    this.#currentEncoderType = EncoderType.NONE;
  }

  #Drain()
  {
    const events = this.#events;

    this.#events = [];

    return events;
  }
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
export function ApplyRenderPassHint(hint)
{
  if (!hint) return null;

  return {
    colors: hint.colors.map(Describe),
    depth: hint.depth ? Describe(hint.depth) : null
  };
}

function Describe(attachment)
{
  return {
    loadOp: LoadOp(attachment.load),
    storeOp: attachment.store === Tr2StoreAction.STORE ? "store" : "discard",
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
