// Source: trinity/trinity/Eve/EveOccluder.h:20-49 (Tr2OcclusionBuffer)
// Source: trinity/trinity/Eve/EveOccluder.cpp:15-122
//
// THE LENS-FLARE OCCLUSION BUFFER: one R32_UINT GPU buffer of 13-word slots,
// registered in the global store as "FlareOcclusionBuffer". Word 0 of a slot
// is its combined visibility (float bits), 1..4 the per-occluder visibilities,
// 5.. the occluder sprites' pixel counters. A new slot is Cleared to 1.0 by
// the management compute effect; CopyCounters folds the counters into the
// visibilities each frame. The god rays multiply by word 0 of a lens flare's
// BACKGROUND slot, indexed through LensflareFxOccScale (EveLensflare).
//
// Carbon keeps it as a function-local static singleton; getInstance is that.
import { carbon, impl, type } from "#schema";
import { CjsModel } from "#model";
import { PixelFormat } from "#consts/render-context";
import { OCCLUDER_MANAGEMENT_EFFECT_PATH } from "#consts/effectPaths";
import { Tr2Effect } from "../../../shader/Tr2Effect.js";
import { Tr2GpuBuffer } from "../../../core/device/Tr2GpuBuffer.js";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";
import { Tr2VariableStore } from "../../../core/variable/Tr2VariableStore.js";

/** `ELEMENT_SIZE` (EveOccluder.h:42): uint32 words per slot. */
const ELEMENT_SIZE = 13;

/** `INITIAL_SIZE` (EveOccluder.cpp:102): slots in the first allocation. */
const INITIAL_SIZE = 4;

/** The float whose bits are `value`, as Carbon's `*reinterpret_cast<float*>( &clear )`. */
const bitsAsFloat = value => new Float32Array(new Uint32Array([ value >>> 0 ]).buffer)[0];

/** Allocates GPU slots for lens-flare occlusion and runs the buffer's per-frame compute. */
@type.define({ className: "Tr2OcclusionBuffer", family: "eve/scene" })
export class Tr2OcclusionBuffer extends CjsModel
{

  /** m_management (Tr2EffectPtr): Clear and CopyCounters (cpp:17-18). */
  @type.objectRef("Tr2Effect")
  management = null;

  /** m_buffer (Tr2GpuBufferPtr), registered as "FlareOcclusionBuffer" (cpp:20-21). */
  @type.objectRef("Tr2GpuBuffer")
  buffer = null;

  /** m_free (std::vector<uint32_t>): free slot bases, handed out from the back. */
  @type.list("uint32_t")
  free = [];

  /** m_clear (std::vector<uint32_t>): slots waiting for the Clear compute. */
  @type.list("uint32_t")
  clear = [];

  /** m_size (uint32_t): the buffer's element count; 0 until the first slot. */
  @type.uint32
  size = 0;

  /** Carbon's constructor (cpp:15-22). */
  constructor(...args)
  {
    super(...args);
    this.management = new Tr2Effect();
    this.management.SetEffectPathName(OCCLUDER_MANAGEMENT_EFFECT_PATH);
    this.buffer = new Tr2GpuBuffer();
    Tr2VariableStore.GlobalStore().RegisterVariable("FlareOcclusionBuffer", this.buffer);
  }

  /**
   * Carbon AllocateOffset (cpp:24-39): a slot base, growing the buffer when
   * none is free, queued for Clear. Carbon returns a shared_ptr whose deleter
   * gives the slot back; JS has no RAII, so the holder calls DestroyOffset.
   *
   * The render context is an ADDED argument: ResizeBuffer creates the buffer,
   * which Carbon does on the main-thread context; the caller's is that one.
   *
   * @param {Tr2RenderContext} renderContext The context to create on.
   * @returns {number|null} The slot base, or null when none could be made.
   */
  @carbon.method
  @impl.adapted
  AllocateOffset(renderContext)
  {
    if (!this.free.length) this.ResizeBuffer(renderContext);
    if (!this.free.length) return null;

    const offset = this.free.pop();
    this.clear.push(offset);
    return offset;
  }

  /**
   * Carbon ProcessBuffer (cpp:41-57): Clear each queued slot (the offset goes
   * in as a FLOAT holding the slot's bits, OcclusionBufferOffset), then run
   * CopyCounters over every slot. Queued slots are only forgotten once every
   * Clear dispatched, so a frame whose compute is not ready retries.
   *
   * @param {Tr2RenderContext} renderContext The context to dispatch on.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  ProcessBuffer(renderContext)
  {
    let success = true;

    for (const offset of this.clear)
    {
      // Slot 0's offset is the float 0, which the store would type as an int
      // and refuse against the float registration; the variable is updated.
      const store = Tr2VariableStore.GlobalStore();
      const value = bitsAsFloat(offset);
      if (!store.RegisterVariable("OcclusionBufferOffset", value)) store.FindVariable("OcclusionBufferOffset").SetValue(value);
      success = Tr2Renderer.runComputeShader(this.management, "Clear", 1, 1, 1, renderContext) && success;
    }

    if (success) this.clear.length = 0;

    if (this.size > 0)
    {
      Tr2Renderer.runComputeShader(this.management, "CopyCounters", this.size / ELEMENT_SIZE, 1, 1, renderContext);
    }
  }

  /**
   * Carbon DestroyOffset (cpp:70-74), the shared_ptr deleter: the slot goes
   * back on the free list.
   *
   * @param {number|null} offset A slot base from AllocateOffset.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  DestroyOffset(offset)
  {
    if (offset !== null && offset !== undefined) this.free.push(offset);
  }

  /** Carbon OnPrepareResources (cpp:76-79): nothing to prepare; answers true. */
  @carbon.method
  @impl.implemented
  OnPrepareResources()
  {
    return true;
  }

  /**
   * Carbon ReleaseResources (cpp:81-91): on managed-memory loss every slot is
   * requeued for Clear.
   *
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  ReleaseResources()
  {
    this.clear.length = 0;
    for (let i = 0; i < this.size; i += ELEMENT_SIZE) this.clear.push(i);
  }

  /**
   * Carbon ResizeBuffer (cpp:93-122): four slots at first, doubled after;
   * the old contents are copied into the new buffer, and the new slots join
   * the free list in ascending order, so pop hands out the highest first.
   *
   * @param {Tr2RenderContext} renderContext The context to create on.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  ResizeBuffer(renderContext)
  {
    const oldSize = this.size;
    this.size = this.size ? this.size * 2 : INITIAL_SIZE * ELEMENT_SIZE;

    const old = this.buffer.GetGpuBuffer(0);

    this.buffer.Create(this.size, PixelFormat.PIXEL_FORMAT_R32_UINT, Tr2GpuBuffer.CreationFlags.GPU_WRITABLE, renderContext);

    if (old)
    {
      renderContext.GetRenderContextAL().CopySubBuffer(this.buffer.GetGpuBuffer(0), 0, old, 0, old.GetDesc().GetSizeInBytes());
    }

    for (let i = oldSize; i < this.size; i += ELEMENT_SIZE) this.free.push(i);
  }

  /** Carbon GetInstance (cpp:59-63). */
  @carbon.method
  @impl.implemented
  static getInstance()
  {
    Tr2OcclusionBuffer.#instance ??= new Tr2OcclusionBuffer();
    return Tr2OcclusionBuffer.#instance;
  }

  /**
   * Carbon GetOccluderOffset (cpp:65-68): occluder `index`'s counter pair in
   * a slot, or 0 with no slot.
   *
   * @param {number|null} offset A slot base.
   * @param {number} index The occluder index, 0-3.
   * @returns {number} The element index.
   */
  @carbon.method
  @impl.implemented
  static getOccluderOffset(offset, index)
  {
    return offset !== null && offset !== undefined ? offset + 5 + index * 2 : 0;
  }

  static ELEMENT_SIZE = ELEMENT_SIZE;

  static #instance = null;

}
