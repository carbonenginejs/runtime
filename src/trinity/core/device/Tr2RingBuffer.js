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

import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { Tr2BufferALStub, Tr2BufferDescriptionAL } from "../al/index.js";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";


function failRing(message)
{
  const error = new Error(`Tr2RingBuffer: ${message}`);
  error.code = "CJS_RING_BUFFER_INVALID";
  throw error;
}


/** Carbon's `INITIAL_SIZE` (`Tr2RingBuffer.cpp:8`), in ELEMENTS rather than bytes. */
const INITIAL_SIZE = 16 * 1024;

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


/**
 * One upload arena per data type, fenced by frame.
 */
@type.define({ className: "Tr2RingBuffer", family: "trinityCore" })
export class Tr2RingBuffer extends CjsModel
{
  /** One arena per data type, as Carbon's typed `GetInstance` gives. */
  static #instances = new Map();

  /** m_name */
  @io.persist
  @type.string
  name = "";

  /** m_stride - bytes per element; every upload must match it. */
  @io.persist
  @type.uint32
  stride = 0;

  /** m_size - capacity in ELEMENTS, not bytes. */
  @io.read
  @type.uint32
  size = 0;

  /** m_head - where the next upload lands, in elements. */
  @io.read
  @type.uint32
  head = 0;

  /** m_tail - the oldest element the GPU may still be reading. */
  @io.read
  @type.uint32
  tail = 0;

  /** m_frame - the frame being recorded. */
  #frame = 0;

  /** m_mirror - the CPU copy, and the authority until a backend uploads it. */
  #mirror = new Uint8Array(0);

  /** m_buffer */
  #buffer = null;

  /** m_dirtyRegions[2] - what changed since the last PrepareBuffer. */
  #dirtyRegions = [ { offset: 0, size: 0 }, { offset: 0, size: 0 } ];

  /** m_lockedRegions - uploads the GPU may still be reading, by frame. */
  #lockedRegions = [];

  /** The render context this ring creates and updates its buffer through. */
  #renderContext = null;

  /**
   * The arena for one data type, created on first ask.
   *
   * Carbon keys this on the C++ type (`GetInstance<T>`); a key and a stride say
   * the same thing here, and the stride is checked on every ask so two callers
   * cannot disagree about what a row is.
   *
   * @param {string} key Names the data type, e.g. "ChildBoosterInstance".
   * @param {number} stride Bytes per row.
   * @param {object} renderContext The context to create the buffer through.
   * @returns {Tr2RingBuffer} The arena.
   */
  static GetInstance(key, stride, renderContext)
  {
    if (typeof key !== "string" || !key) failRing("an instance needs a data-type key");
    if (!Number.isInteger(stride) || stride <= 0) failRing(`${key} needs a positive stride`);

    const existing = Tr2RingBuffer.#instances.get(key);

    if (existing)
    {
      if (existing.stride !== stride)
      {
        failRing(`${key} was created with stride ${existing.stride}, not ${stride}`);
      }

      return existing;
    }

    const created = new Tr2RingBuffer();

    created.stride = stride;
    created.SetName(key);
    created.#renderContext = renderContext;

    // Carbon seeds the fence from the context before the first sizing
    // (`Tr2RingBuffer.cpp:121`), so a ring created mid-session does not think
    // every frame ever recorded is still in flight.
    created.SetFrameNumbers(renderContext.GetRecordingFrameNumber(), renderContext.GetRenderedFrameNumber());
    created.Resize(INITIAL_SIZE);

    Tr2RingBuffer.#instances.set(key, created);

    return created;
  }

  /** Forgets every arena. Test and teardown only; Carbon's are process-lived. */
  static ResetInstances()
  {
    Tr2RingBuffer.#instances.clear();
  }

  /**
   * Names the ring, and its buffer if one exists.
   *
   * @param {string} name The debug label.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = name;

    if (this.#buffer && this.#buffer.IsValid()) this.#buffer.SetName(name);
  }

  /**
   * The backend buffer these rows live in.
   *
   * @returns {object|null} The buffer, or null before the first size.
   */
  @carbon.method
  @impl.implemented
  GetGpuBuffer()
  {
    return this.#buffer;
  }

  /**
   * Copies rows in and returns where they landed, in elements.
   *
   * TWO RING RULES, IN CARBON'S ORDER. When the head is ahead of the tail and
   * the rows will not fit before the end, it wraps to zero. When the head is
   * BEHIND the tail and would reach it, the ring is full of frames the GPU may
   * still be reading, so it doubles instead of overwriting them.
   *
   * @param {ArrayBufferView} data The packed rows.
   * @param {number} count How many rows.
   * @returns {number} The element offset the rows landed at.
   */
  @carbon.method
  @impl.implemented
  UploadTransforms(data, count)
  {
    if (!ArrayBuffer.isView(data)) failRing("UploadTransforms needs a typed array of rows");
    if (!Number.isInteger(count) || count < 0) failRing("UploadTransforms needs a row count");

    const bytes = count * this.stride;

    if (data.byteLength < bytes)
    {
      failRing(`${count} rows of ${this.stride} bytes need ${bytes}, and ${data.byteLength} were given`);
    }

    if (this.head >= this.tail && this.head + count > this.size) this.head = 0;

    if (this.head < this.tail && this.head + count >= this.tail) this.Resize(this.size * 2);

    this.#mirror.set(new Uint8Array(data.buffer, data.byteOffset, bytes), this.head * this.stride);

    // The two regions exist so a wrap can be described without a third: one run
    // ends at the head, or the other does. Neither means the head moved without
    // this ring being told, which is a caller writing behind its back.
    const first = this.#dirtyRegions[0];
    const second = this.#dirtyRegions[1];

    if (first.offset + first.size === this.head) first.size += count;
    else if (second.offset + second.size === this.head) second.size += count;
    else failRing("neither dirty region ends at the head; the ring was written to behind its back");

    const offset = this.head;

    this.head += count;

    return offset;
  }

  /**
   * Pushes what changed to the backend and locks it for this frame.
   *
   * @param {object} renderContext The context to update through.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  PrepareBuffer(renderContext)
  {
    for (const region of this.#dirtyRegions)
    {
      if (!region.size) continue;

      this.#buffer.UpdateBuffer(
        region.offset * this.stride,
        region.size * this.stride,
        this.#mirror.subarray(region.offset * this.stride, (region.offset + region.size) * this.stride),
        renderContext
      );

      this.#lockedRegions.push({ frame: this.#frame, tail: region.offset + region.size });
    }

    this.#dirtyRegions[0] = { offset: this.head, size: 0 };
    this.#dirtyRegions[1] = { offset: 0, size: 0 };
  }

  /**
   * Moves the tail past every upload the device has finished with.
   *
   * CARBON DISTRUSTS THE COMPLETED NUMBER and clamps it to two frames behind
   * the one being recorded, whatever it is told. Freeing a frame the GPU is
   * still reading corrupts it, and the cost of being late is a slightly larger
   * ring.
   *
   * @param {number} recordingFrame The frame being recorded.
   * @param {number} completedFrame The frame the device reports finished.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  SetFrameNumbers(recordingFrame, completedFrame)
  {
    this.#frame = recordingFrame;

    const completed = Math.min(completedFrame, recordingFrame - 2);
    let consumed = 0;

    for (const region of this.#lockedRegions)
    {
      if (region.frame > completed) break;

      this.tail = region.tail;
      consumed += 1;
    }

    // See the head comment: Carbon erases only when it stops early, so a ring
    // whose regions all complete never erases any. Same tail, bounded list.
    if (consumed) this.#lockedRegions.splice(0, consumed);
  }

  /**
   * Grows the ring, keeping what it already holds.
   *
   * Carbon marks the WHOLE old extent dirty and parks the head at the old size
   * with the tail at the new one, so the next upload lands in the fresh space
   * and everything already written is re-uploaded once.
   *
   * @param {number} size The new capacity, in elements.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  Resize(size)
  {
    if (!Number.isInteger(size) || size <= 0) failRing("a ring needs a positive size");

    const previousSize = this.size;
    const grown = new Uint8Array(size * this.stride);

    grown.set(this.#mirror.subarray(0, Math.min(this.#mirror.length, grown.length)));

    this.#dirtyRegions[0] = { offset: 0, size: previousSize };
    this.#dirtyRegions[1] = { offset: 0, size: 0 };
    this.#lockedRegions.length = 0;
    this.#mirror = grown;
    this.head = previousSize;
    this.size = size;
    this.tail = size;

    this.#CreateBuffer(null);
  }

  /**
   * Recreates the backend buffer from the mirror after a device loss.
   *
   * @returns {boolean} True.
   */
  @carbon.method
  @impl.implemented
  OnPrepareResources()
  {
    if (this.#mirror.length && !(this.#buffer && this.#buffer.IsValid())) this.#CreateBuffer(this.#mirror);

    return true;
  }

  /**
   * Creates the backend buffer at the current size.
   *
   * WRITE_OFTEN and NON_SYNCRONIZED_WRITE are Carbon's, and they are what a
   * ring is: written every frame, and never waited on, because the frame fence
   * already guarantees nobody is reading what is being written.
   */
  #CreateBuffer(initialData)
  {
    if (!this.#renderContext) failRing(`${this.name} has no render context to create its buffer through`);

    if (this.#buffer) this.#buffer.Destroy();

    this.#buffer = new Tr2BufferALStub();

    const description = Tr2BufferDescriptionAL.FromStride(
      this.stride,
      this.size,
      Tr2GpuUsage.SHADER_RESOURCE,
      Tr2CpuUsage.WRITE_OFTEN | Tr2CpuUsage.NON_SYNCRONIZED_WRITE
    );

    this.#buffer.Create(description, initialData, this.#renderContext);
    this.#buffer.SetName(this.name);
  }
}
