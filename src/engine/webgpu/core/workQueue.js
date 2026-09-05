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

  /** Opens a render encoder, folding any pending hint into its descriptor. */
  #GetRenderEncoder()
  {
    this.#ReleaseEncoder();

    const hint = this.#pendingRenderPassHint;

    this.#pendingRenderPassHint = null;
    this.#passCount += 1;
    this.#currentEncoderType = EncoderType.RENDER;
    this.#events.push({ type: "open", encoderType: EncoderType.RENDER, attachments: ApplyRenderPassHint(hint) });
  }

  /** Carbon's `ReleaseEncoder( true )`. */
  #ReleaseEncoder()
  {
    if (this.#currentEncoderType === EncoderType.NONE) return;

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
