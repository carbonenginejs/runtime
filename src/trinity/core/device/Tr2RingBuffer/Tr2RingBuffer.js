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
// Carbon's device-resource base registers the logical arena before a device
// exists. Allocation failure leaves its CPU mirror/provider alive; preparation
// realizes the buffer later. These base obligations live on this original
// class because JavaScript has one prototype parent.
//
// The supplied context selects the backend; unlike Carbon's compile-time AL,
// it can change at runtime. Preparation recreates storage from the mirror when
// that backend changes, retaining the provider, offsets and frame fence.
//
// SetFrameNumbers erases the completed prefix even when all regions finish;
// Carbon only erases it when an incomplete region follows. The tail is the
// same, but the JS list stays bounded (documented native quirk).

import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
import { Tr2BufferDescriptionAL } from "../../../../trinityal/index.js";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { TriDevice } from "../TriDevice.js";
import { Tr2Renderer } from "../../Tr2Renderer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../context/Tr2RenderContext.js";


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
 * One upload arena per data type, fenced by frame.
 */
@type.define({ className: "Tr2RingBuffer", family: "trinityCore" })
export class Tr2RingBuffer extends CjsModel
{
  /** One arena per data type, as Carbon's typed `GetInstance` gives. */
  static _instances = new Map();

  /** m_name */
  @edit.persist
  @type.string
  name = "";

  /** m_stride - bytes per element; every upload must match it. */
  @edit.persist
  @type.uint32
  stride = 0;

  /** m_size - capacity in ELEMENTS, not bytes. */
  @edit.read
  @type.uint32
  size = 0;

  /** m_head - where the next upload lands, in elements. */
  @edit.read
  @type.uint32
  head = 0;

  /** m_tail - the oldest element the GPU may still be reading. */
  @edit.read
  @type.uint32
  tail = 0;

  /** m_frame - the frame being recorded. */
  _frame = 0;

  /** m_mirror - the CPU copy, and the authority until a backend uploads it. */
  _mirror = new Uint8Array(0);

  /** m_buffer */
  _buffer = null;

  /** m_dirtyRegions[2] - what changed since the last PrepareBuffer. */
  _dirtyRegions = [ { offset: 0, size: 0 }, { offset: 0, size: 0 } ];

  /** m_lockedRegions - uploads the GPU may still be reading, by frame. */
  _lockedRegions = [];

  /** Explicit context for isolated callers; null reacquires Carbon's current main-thread context. */
  _renderContext = null;

  /** Backend that owns the current storage; JS permits runtime AL replacement. */
  _bufferBackend = null;

  /** Registers the arena as Carbon's Tr2DeviceResource constructor does. */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
  }

  /**
   * The arena for one data type, created on first ask.
   *
   * Carbon keys this on the C++ type (`GetInstance<T>`); a key and a stride say
   * the same thing here, and the stride is checked on every ask so two callers
   * cannot disagree about what a row is. Ambient callers are recognized once
   * so preparation reacquires the current main-thread context; explicit
   * isolated contexts retain the existing JS argument adaptation.
   *
   * @param {string} key Names the data type, e.g. "ChildBoosterInstance".
   * @param {number} stride Bytes per row.
   * @param {object} renderContext The context to create the buffer through.
   * @returns {Tr2RingBuffer} The arena.
   */
  @carbon.method
  @impl.adapted
  static GetInstance(key, stride, renderContext)
  {
    if (typeof key !== "string" || !key) failRing("an instance needs a data-type key");
    if (!Number.isInteger(stride) || stride <= 0) failRing(`${key} needs a positive stride`);

    const existing = Tr2RingBuffer._instances.get(key);

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
    created._renderContext = renderContext === Tr2RenderContext_GetMainThreadRenderContext() ? null : renderContext;

    // Carbon seeds the fence from the context before the first sizing
    // (`Tr2RingBuffer.cpp:121`), so a ring created mid-session does not think
    // every frame ever recorded is still in flight.
    created.SetFrameNumbers(renderContext.GetRecordingFrameNumber(), renderContext.GetRenderedFrameNumber());
    created.Resize(INITIAL_SIZE);

    Tr2RingBuffer._instances.set(key, created);

    return created;
  }

  /** Destroys storage and unregisters arenas at test/teardown; Carbon's are process-lived. */
  @impl.custom
  static ResetInstances()
  {
    for (const ring of Tr2RingBuffer._instances.values())
    {
      ring._buffer?.Destroy();
      TriDevice.UnregisterResource(ring);
    }
    Tr2RingBuffer._instances.clear();
  }

  /**
   * Prepares every arena that exists.
   *
   * Carbon prepares each of its three typed instances at the top of
   * `RenderBatchesInOrder` (Tr2RenderContext.cpp:360-362). Those exist from
   * process start; here an arena is created on first ask, even before its
   * context has a device. Preparation walks only arenas already requested.
   *
   * @param {object} renderContext The context to update through.
   * @returns {void}
   */
  static prepareInstances(renderContext)
  {
    for (const ring of Tr2RingBuffer._instances.values()) ring.PrepareBuffer(renderContext);
  }

  /**
   * Fences every arena that exists by frame, as `EveSpaceScene::Update` does
   * for each typed instance (EveSpaceScene.cpp:441-444).
   *
   * @param {number} recordingFrame The frame being recorded.
   * @param {number} completedFrame The frame the device reports finished.
   * @returns {void}
   */
  static setInstanceFrameNumbers(recordingFrame, completedFrame)
  {
    for (const ring of Tr2RingBuffer._instances.values()) ring.SetFrameNumbers(recordingFrame, completedFrame);
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

    if (this._buffer && this._buffer.IsValid()) this._buffer.SetName(name);
  }

  /**
   * The backend buffer these rows live in.
   *
   * @returns {object|null} The buffer, or null until backend creation succeeds.
   */
  @carbon.method
  @impl.implemented
  GetGpuBuffer()
  {
    return this._buffer;
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

    this._mirror.set(new Uint8Array(data.buffer, data.byteOffset, bytes), this.head * this.stride);

    // The two regions exist so a wrap can be described without a third: one run
    // ends at the head, or the other does. Neither means the head moved without
    // this ring being told, which is a caller writing behind its back.
    const first = this._dirtyRegions[0];
    const second = this._dirtyRegions[1];

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
   * Adapted: a failed JS buffer factory leaves null rather than an invalid
   * inline buffer. Skip that failed update but retain Carbon's region/fence
   * bookkeeping; later preparation restores all bytes from the CPU mirror.
   *
   * @param {object} renderContext The context to update through.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  PrepareBuffer(renderContext)
  {
    for (const region of this._dirtyRegions)
    {
      if (!region.size) continue;

      if (this._buffer) this._buffer.UpdateBuffer(
        region.offset * this.stride,
        region.size * this.stride,
        this._mirror.subarray(region.offset * this.stride, (region.offset + region.size) * this.stride),
        renderContext
      );

      this._lockedRegions.push({ frame: this._frame, tail: region.offset + region.size });
    }

    this._dirtyRegions[0] = { offset: this.head, size: 0 };
    this._dirtyRegions[1] = { offset: 0, size: 0 };
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
    this._frame = recordingFrame;

    const completed = Math.min(completedFrame, recordingFrame - 2);
    let consumed = 0;

    for (const region of this._lockedRegions)
    {
      if (region.frame > completed) break;

      this.tail = region.tail;
      consumed += 1;
    }

    // See the head comment: Carbon erases only when it stops early, so a ring
    // whose regions all complete never erases any. Same tail, bounded list.
    if (consumed) this._lockedRegions.splice(0, consumed);
  }

  /**
   * Grows the ring, keeping what it already holds.
   *
   * Carbon marks the WHOLE old extent dirty and parks the head at the old size
   * with the tail at the new one, so the next upload lands in the fresh space
   * and everything already written is re-uploaded once.
   *
   * Adapted: a failed JS factory returns null instead of leaving Carbon's
   * inline buffer invalid. An unavailable context is deferred without asking
   * the factory to create an unreachable invalid resource. Both retain the
   * mirror for OnPrepareResources.
   *
   * @param {number} size The new capacity, in elements.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  Resize(size)
  {
    if (!Number.isInteger(size) || size <= 0) failRing("a ring needs a positive size");

    const previousSize = this.size;
    const grown = new Uint8Array(size * this.stride);

    grown.set(this._mirror.subarray(0, Math.min(this._mirror.length, grown.length)));

    this._dirtyRegions[0] = { offset: 0, size: previousSize };
    this._dirtyRegions[1] = { offset: 0, size: 0 };
    this._lockedRegions.length = 0;
    this._mirror = grown;
    this.head = previousSize;
    this.size = size;
    this.tail = size;

    this._CreateBuffer(null);
  }

  /**
   * Prepares the arena when resource creation is allowed (Tr2DeviceResource.cpp:21-32).
   *
   * @returns {boolean} Whether preparation succeeded or was deferred.
   */
  @carbon.method
  @impl.implemented
  PrepareResources()
  {
    if (Tr2Renderer.IsResourceCreationAllowed()) return this.OnPrepareResources();
    return true;
  }

  /**
   * Retains the mirror/provider; Carbon's ring release is empty (cpp:143-145).
   * The AL resource lifecycle invalidates the backing storage separately.
   *
   * @param {number} _storage Storage mask.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  ReleaseResources(_storage)
  {
  }

  /**
   * Recreates invalid backend storage from the retained CPU mirror (cpp:147-158).
   *
   * Adapted: the JS context may replace its AL at runtime, so an otherwise
   * valid buffer from the previous backend must also be recreated. Ambient
   * rings reacquire the current main-thread context, as Carbon does, including
   * after context destruction/recreation. Explicit isolated contexts remain
   * supported by the existing GetInstance argument. The ring
   * and its offsets remain unchanged. Failed allocation retains the mirror,
   * just as Carbon keeps its invalid inline buffer for another preparation.
   *
   * @returns {boolean} True, matching Carbon even if allocation fails.
   */
  @carbon.method
  @impl.adapted
  OnPrepareResources()
  {
    const renderContext = this._renderContext ?? Tr2RenderContext_GetMainThreadRenderContext();
    if (this._mirror.length && (!this._buffer || !this._buffer.IsValid()
      || this._bufferBackend !== renderContext.GetRenderContextAL()))
    {
      this._CreateBuffer(this._mirror);
    }
    return true;
  }

  /**
   * Creates the backend buffer at the current size.
   *
   * WRITE_OFTEN and NON_SYNCRONIZED_WRITE are Carbon's, and they are what a
   * ring is: written every frame, and never waited on, because the frame fence
   * already guarantees nobody is reading what is being written.
   */
  _CreateBuffer(initialData)
  {
    const renderContext = this._renderContext ?? Tr2RenderContext_GetMainThreadRenderContext();

    if (this._buffer) this._buffer.Destroy();
    this._buffer = null;
    if (!renderContext.IsValid()) return;

    const description = Tr2BufferDescriptionAL.FromStride(
      this.stride,
      this.size,
      Tr2GpuUsage.SHADER_RESOURCE,
      Tr2CpuUsage.WRITE_OFTEN | Tr2CpuUsage.NON_SYNCRONIZED_WRITE
    );

    // The context creates the running backend's buffer, as Carbon's
    // compile-time Tr2BufferAL is whichever backend was built.
    this._bufferBackend = renderContext.GetRenderContextAL();
    this._buffer = renderContext.CreateBuffer(description, initialData);
    // Carbon Resize ignores a failed Create: the provider/mirror survive it.
    if (this._buffer) this._buffer.SetName(this.name);
  }
}
