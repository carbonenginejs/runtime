// Source: trinity/trinityal/include/Tr2FenceAL.h
// Source: trinity/trinityal/src/Tr2FenceAL.cpp
//
// The backend-neutral fence: Carbon's PIMPL value. An owner holds one by value
// (`Tr2GpuProfiler::m_frameFence`, `Tr2GpuProfiler.cpp:44-60`) or by pointer
// (`Tr2DynamicRingBuffer::AllocateFence`, `Tr2DynamicRingBuffer.cpp:261-277`),
// it is invalid until `Create` fills it, and every call forwards to the shared
// implementation behind it.
//
// The render context allocates the implementation where Carbon includes the
// platform's `TrinityALImpl::Tr2FenceAL` at compile time
// (`TRINITY_AL_PLATFORM_INCLUDE`, `Tr2FenceAL.cpp:5`): we ship every backend at
// once, so the context that knows its backend is the factory
// (`CreateFence(true)`).
import { CjsSchema, meta, blue, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult, Failed } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";


/**
 * Carbon's `NullFence()` (`Tr2FenceAL.cpp:10-14`): the one shared default
 * implementation every uncreated handle points at. Carbon's is the platform
 * impl default-constructed; the handle here is backend-neutral, so this
 * answers as the stub's default-constructed impl does - invalid, every verb
 * refused with `E_FAIL`, video memory (`Tr2FenceALStub.cpp:12-79`,
 * `Tr2FenceALStub.h:26-29`). Its share count is unbounded, so releasing a
 * default handle never destroys it.
 */
const nullFence = {
  owners: Infinity,
  implementation: {
    IsValid: () => false,
    PutFence: () => ALResult.E_FAIL,
    IsReached: () => ({ result: ALResult.E_FAIL, isReached: false }),
    Wait: () => ALResult.E_FAIL,
    GetMemoryClass: () => Tr2ALMemoryType.AL_MEMORY_VIDEO,
    SetName: () => ALResult.S_OK,
    Destroy: () => undefined
  }
};


/** A fence value sharing one backend implementation. */
export class Tr2FenceAL
{
  /** m_fence: the shared implementation record; `nullFence` until created. */
  _fence = nullFence;

  /**
   * Carbon's default constructor (`Tr2FenceAL.cpp:17-20`) leaves the value on
   * `NullFence()`. A `copy` replaces C++'s implicit copy construction, sharing
   * the implementation; plain JavaScript assignment aliases instead.
   *
   * @param {object} [options] Copy construction.
   * @param {Tr2FenceAL|null} [options.copy] The value to share.
   */
  constructor({ copy = null } = {})
  {
    if (copy)
    {
      this._fence = copy._fence;
      this._fence.owners += 1;
    }
  }

  /**
   * Carbon's Create( renderContext ) (`Tr2FenceAL.h:21`, `Tr2FenceAL.cpp:22-31`):
   * a fresh implementation replaces this value's; a failure leaves it on the
   * null implementation.
   *
   * Adapted: the render context allocates the implementation instead of a
   * compile-time platform include. The previous share is released explicitly
   * because JavaScript has no shared_ptr; existing copies keep it alive.
   *
   * @param {object} renderContext The primary context to create against.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.adapted
  Create(renderContext)
  {
    this.Destroy();

    const { result, implementation } = RenderContextALOf(renderContext).CreateFence(true);
    if (Failed(result)) return result;

    this._fence = { implementation, owners: 1 };
    return result;
  }

  /**
   * Puts the fence into the command stream (`Tr2FenceAL.cpp:33-36`).
   *
   * @param {object} renderContext The context recording.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  PutFence(renderContext)
  {
    return this._fence.implementation.PutFence(renderContext);
  }

  /**
   * Whether the GPU has passed the fence (`Tr2FenceAL.cpp:38-41`).
   *
   * Adapted: Carbon's `bool& isReached` output becomes the returned `isReached`.
   *
   * @param {object} renderContext The context whose stream is asked.
   * @returns {{result: number, isReached: boolean}} The answer.
   */
  @blue.method
  @meta.adapted
  IsReached(renderContext)
  {
    return this._fence.implementation.IsReached(renderContext);
  }

  /**
   * Waits for the fence (`Tr2FenceAL.cpp:43-46`).
   *
   * @param {object} renderContext The context whose stream is waited on.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  Wait(renderContext)
  {
    return this._fence.implementation.Wait(renderContext);
  }

  /**
   * Whether the implementation exists on the device (`Tr2FenceAL.cpp:48-51`).
   *
   * @returns {boolean} True once created.
   */
  @blue.method
  @meta.implemented
  IsValid()
  {
    return this._fence.implementation.IsValid();
  }

  /**
   * Compares implementation identity (`Tr2FenceAL.cpp:53-56`).
   *
   * Adapted: JavaScript has no overloadable equality operator.
   *
   * @param {Tr2FenceAL} other The value to compare.
   * @returns {boolean} Whether both share one implementation.
   */
  @blue.method
  @meta.adapted
  Equals(other)
  {
    return this._fence === other._fence;
  }

  /**
   * The implementation's memory class (`Tr2FenceAL.cpp:58-61`).
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  @blue.method
  @meta.implemented
  GetMemoryClass()
  {
    return this._fence.implementation.GetMemoryClass();
  }

  /**
   * Names valid storage; an invalid value or an absent name keeps Carbon's
   * errors (`Tr2FenceAL.cpp:63-74`).
   *
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;
    if (name === null || name === undefined) return ALResult.E_INVALIDARG;
    return this._fence.implementation.SetName(name);
  }

  /**
   * Resets this value to the null implementation, Carbon's
   * `m_frameFence = Tr2FenceAL()` (`Tr2GpuProfiler.cpp:44`) and the `delete`
   * of a pooled fence (`Tr2DynamicRingBuffer.cpp:233-236`).
   *
   * Ours (no blue stamp): JavaScript has no scope destructor or shared_ptr, so
   * the share is released explicitly; the implementation is destroyed with its
   * last share.
   */
  Destroy()
  {
    const owned = this._fence;
    this._fence = nullFence;
    if (--owned.owners === 0) owned.implementation.Destroy();
  }
}

CjsSchema.decorateField(Tr2FenceAL, "_fence", type.unknown);
CjsSchema.decorateMethod(Tr2FenceAL, "Equals", meta.renamed("operator=="));
CjsSchema.blue.define(Tr2FenceAL, { className: "Tr2FenceAL" });
