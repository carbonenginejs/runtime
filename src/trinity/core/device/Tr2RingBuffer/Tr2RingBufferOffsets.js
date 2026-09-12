// Source: trinity/trinity/Tr2RingBuffer.h
// Source: trinity/trinity/Tr2RingBuffer.cpp
//
// One shared arena that many objects upload per-frame rows into, and a small
// per-consumer cursor that remembers where this frame's rows and last frame's
// rows landed.
//
// WHY A RING AND NOT A BUFFER EACH. Every booster set, every morph target, every
// skinned thing wants a handful of rows on the GPU each frame. A buffer each
// means an allocation each; one ring means one allocation and an offset each.
// The offset is what a shader is handed.
//
// WHY TWO OBJECTS, which is the part worth reading twice. `Tr2RingBuffer` is the
// arena and there is one per DATA TYPE. `Tr2RingBufferOffsets` is the cursor and
// there is one per CONSUMER, held by value. The cursor keeps the PREVIOUS
// frame's offset as well as this frame's, which is what a pass reading last
// frame's transforms needs - motion vectors, trails, anything comparing two
// frames. Collapsing the two into "upload and get an offset back" works today
// and quietly loses that.
//
// THE FRAME FENCE IS THE WHOLE DESIGN. Rows uploaded for a frame cannot be
// overwritten until the GPU has finished that frame, so the ring records a
// locked region per upload and only moves its tail past regions whose frame the
// device reports complete. `SetFrameNumbers` is deliberately pessimistic - it
// clamps "completed" to two frames behind "recording" no matter what it is
// told.
//
// THREE DIFFERENCES FROM CARBON, EACH FORCED:
//
// - Carbon reaches a process-wide render context through a macro; we have none,
//   so the context is supplied to `GetInstance` and kept. Same reason
//   `TriDevice`'s capability methods are still unimplemented.
// - Carbon drives the fence from EveSpaceScene::Update, which reaches the
//   process-wide render context (`EveSpaceScene.cpp:441-445`). We have no
//   process-wide context, so nothing ticks a ring per frame yet and a caller
//   must drive `SetFrameNumbers` itself. The seeding at creation IS Carbon's.
// - Carbon's `SetFrameNumbers` erases consumed locked regions only when it finds
//   an incomplete one, so a ring whose regions all complete erases none and the
//   list grows for the life of the process. That is survivable in a game
//   session and is not in a browser tab, so the consumed prefix is erased in
//   both cases. The tail it computes is identical either way.

/** Carbon's `Tr2RingBufferOffsets::INVALID_OFFSET`. */
const INVALID_OFFSET = 0xffffffff;

/**
 * Where one consumer's rows landed, this frame and last.
 *
 * Held by value in Carbon, so each consumer owns one rather than sharing.
 */
export class Tr2RingBufferOffsets
{
  /** Carbon's `INVALID_OFFSET`; the "nothing uploaded" state, and a no-draw. */
  static INVALID_OFFSET = INVALID_OFFSET;

  /** m_currentFrameOffset */
  #currentFrameOffset = INVALID_OFFSET;

  /** m_previousFrameOffset */
  #previousFrameOffset = INVALID_OFFSET;

  /**
   * Where this frame's rows start, in elements.
   *
   * @returns {number} The offset, or `INVALID_OFFSET` before an upload.
   */
  GetCurrentFrameOffset()
  {
    return this.#currentFrameOffset;
  }

  /**
   * Where last frame's rows start, in elements.
   *
   * @returns {number} The offset, or `INVALID_OFFSET` before a second frame.
   */
  GetPreviousFrameOffset()
  {
    return this.#previousFrameOffset;
  }

  /**
   * Uploads this consumer's rows, ONCE per frame.
   *
   * The early return is the interesting line: a second upload in the same frame
   * is ignored rather than appended, so an object updated twice does not eat
   * the ring twice. `AdvanceFrame` is what re-arms it.
   *
   * @param {Tr2RingBuffer} buffer The arena for this data type.
   * @param {ArrayBufferView} transforms The packed rows.
   * @param {number} count How many rows.
   * @returns {void}
   */
  UploadTransforms(buffer, transforms, count)
  {
    if (this.#currentFrameOffset !== INVALID_OFFSET) return;

    this.#currentFrameOffset = buffer.UploadTransforms(transforms, count);

    // First frame: last frame's rows are this frame's, so a shader reading the
    // previous offset reads something valid rather than nothing.
    if (this.#previousFrameOffset === INVALID_OFFSET)
    {
      this.#previousFrameOffset = this.#currentFrameOffset;
    }
  }

  /**
   * Rolls this frame's offset into last frame's and re-arms the upload.
   *
   * @returns {void}
   */
  AdvanceFrame()
  {
    this.#previousFrameOffset = this.#currentFrameOffset;
    this.#currentFrameOffset = INVALID_OFFSET;
  }
}
