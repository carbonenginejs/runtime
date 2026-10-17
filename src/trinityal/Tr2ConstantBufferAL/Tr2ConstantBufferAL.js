// Source: trinity/trinityal/include/Tr2ConstantBufferAL.h
// Source: trinity/trinityal/src/Tr2ConstantBufferAL.cpp
//
// The backend-neutral constant buffer: Carbon's PIMPL value. A Trinity owner
// holds one BY VALUE (`Tr2ConstantBufferAL m_perFrameData;`), it is invalid
// until `Create` fills it, and every backend's render context reads the shared
// implementation behind it (`buffer.m_buffer->...`, `Tr2RenderContextDx11.cpp:1179-1184`).
//
// The render context allocates the implementation where Carbon includes the
// platform's `TrinityALImpl::Tr2ConstantBufferAL` at compile time
// (`TRINITY_AL_PLATFORM_INCLUDE`, `Tr2ConstantBufferAL.cpp:6`): we ship every backend at
// once, so the context that knows its backend is the factory
// (`CreateConstantBuffer(size, usage, initialData, true)`).
import { CjsSchema, meta, blue, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult, Failed } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";


/** `Tr2ConstantUsageAL` (`Tr2ConstantBufferAL.h:16-24`). */
export const Tr2ConstantUsageAL = Object.freeze({
  /** Written once at creation and never again. */
  IMMUTABLE: 0,

  /** Written and consumed within one frame. */
  ONE_SHOT: 1,

  /** Written repeatedly across frames. */
  REUSABLE: 2
});


/**
 * Carbon's `NullCB()` (`Tr2ConstantBufferAL.cpp:10-15`): the one shared
 * default implementation every uncreated handle points at. Carbon's is the
 * platform impl default-constructed; the handle here is backend-neutral, so
 * this answers as every backend's default-constructed impl does - invalid,
 * size 0, managed memory, and a refused lock (`Lock` on no storage,
 * `Tr2ConstantBufferALStub.cpp:44-54`, `Tr2ConstantBufferALDx11.cpp:78-91`).
 * Its share count is unbounded, so releasing a default handle never destroys it.
 */
const nullCB = {
  owners: Infinity,
  implementation: {
    IsValid: () => false,
    GetSize: () => 0,
    GetUsage: () => Tr2ConstantUsageAL.REUSABLE,
    GetMemoryClass: () => Tr2ALMemoryType.AL_MEMORY_MANAGED,
    Lock: () => ({ result: ALResult.E_FAIL, data: null }),
    Unlock: () => ALResult.E_FAIL,
    SetName: () => ALResult.E_INVALIDCALL,
    Destroy: () => undefined
  }
};


/** A constant buffer value sharing one backend implementation. */
export class Tr2ConstantBufferAL
{
  /** m_buffer: the shared implementation record; `nullCB` until created. */
  _buffer = nullCB;

  /**
   * Carbon's default constructor (`Tr2ConstantBufferAL.cpp:18-21`) leaves the
   * value on `NullCB()`. A `copy` replaces C++'s implicit copy construction,
   * sharing the implementation; plain JavaScript assignment aliases instead.
   *
   * @param {object} [options] Copy construction.
   * @param {Tr2ConstantBufferAL|null} [options.copy] The value to share.
   */
  constructor({ copy = null } = {})
  {
    if (copy)
    {
      this._buffer = copy._buffer;
      this._buffer.owners += 1;
    }
  }

  /**
   * Carbon's Create( size, renderContext ) (`Tr2ConstantBufferAL.h:32`): the
   * full overload with `REUSABLE` usage and no initial data
   * (`Tr2ConstantBufferAL.cpp:23-26`).
   *
   * @param {number} size Bytes.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  Create__Size(size, renderContext)
  {
    return this.Create(size, Tr2ConstantUsageAL.REUSABLE, null, renderContext);
  }

  /**
   * Carbon's full Create( size, usage, initialData, renderContext )
   * (`Tr2ConstantBufferAL.h:33`, `Tr2ConstantBufferAL.cpp:28-47`): a zero size
   * or an immutable buffer without data is refused, otherwise a fresh
   * implementation replaces this value's; any failure leaves it on the null
   * implementation.
   *
   * Adapted: the render context allocates the implementation instead of a
   * compile-time platform include, and also applies the size ceiling, because
   * `TRINITY_PLATFORM_MAX_CONSTANT_BUFFER_SIZE` is a per-backend define
   * (`Tr2CapsALDx11.h:17`, `Tr2CapsALStub.h:18`) that only the context's own
   * backend knows. The previous share is released explicitly because
   * JavaScript has no shared_ptr; existing copies keep it alive.
   *
   * @param {number} size Bytes.
   * @param {number} usage A `Tr2ConstantUsageAL` value.
   * @param {ArrayBufferView|null} initialData Initial contents, if any.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.adapted
  Create(size, usage, initialData, renderContext)
  {
    this.Destroy();

    if (size === 0) return ALResult.E_INVALIDARG;
    if (usage === Tr2ConstantUsageAL.IMMUTABLE && !initialData) return ALResult.E_INVALIDARG;

    const { result, implementation } = RenderContextALOf(renderContext).CreateConstantBuffer(size, usage, initialData, true);
    if (Failed(result)) return result;

    this._buffer = { implementation, owners: 1 };
    return result;
  }

  /**
   * Opens the constants for writing (`Tr2ConstantBufferAL.cpp:49-52`).
   *
   * Adapted: Carbon's `void** data` output becomes the returned `data`.
   *
   * @param {object} renderContext The context to lock against.
   * @returns {{result: number, data: Uint8Array|null}} The locked memory.
   */
  @blue.method
  @meta.adapted
  Lock(renderContext)
  {
    return this._buffer.implementation.Lock(renderContext);
  }

  /**
   * Closes the constants (`Tr2ConstantBufferAL.cpp:54-57`).
   *
   * @param {object} renderContext The context the lock was made against.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  Unlock(renderContext)
  {
    return this._buffer.implementation.Unlock(renderContext);
  }

  /**
   * Whether the implementation holds storage (`Tr2ConstantBufferAL.cpp:59-62`).
   *
   * @returns {boolean} True once created.
   */
  @blue.method
  @meta.implemented
  IsValid()
  {
    return this._buffer.implementation.IsValid();
  }

  /**
   * The implementation's size in bytes (`Tr2ConstantBufferAL.cpp:64-67`).
   *
   * @returns {number} Bytes; zero when uncreated.
   */
  @blue.method
  @meta.implemented
  GetSize()
  {
    return this._buffer.implementation.GetSize();
  }

  /**
   * The implementation's memory class (`Tr2ConstantBufferAL.cpp:69-72`).
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  @blue.method
  @meta.implemented
  GetMemoryClass()
  {
    return this._buffer.implementation.GetMemoryClass();
  }

  /**
   * Compares implementation identity (`Tr2ConstantBufferAL.cpp:74-77`).
   *
   * Adapted: JavaScript has no overloadable equality operator.
   *
   * @param {Tr2ConstantBufferAL} other The value to compare.
   * @returns {boolean} Whether both share one implementation.
   */
  @blue.method
  @meta.adapted
  Equals(other)
  {
    return this._buffer === other._buffer;
  }

  /**
   * Names valid storage; an invalid value or an absent name keeps Carbon's
   * errors (`Tr2ConstantBufferAL.cpp:79-90`).
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
    return this._buffer.implementation.SetName(name);
  }

  /**
   * The shared backend implementation, for the render context that binds it
   * (`Tr2ConstantBufferAL.cpp:92-95`). The null implementation when uncreated,
   * as Carbon returns `NullCB().get()`.
   *
   * @returns {object} The implementation.
   */
  @blue.method
  @meta.implemented
  TrinityALImpl_GetObject()
  {
    return this._buffer.implementation;
  }

  /**
   * Resets this value to the null implementation, Carbon's
   * `m_cb = Tr2ConstantBufferAL()` (`Tr2LightManager.cpp:645`).
   *
   * Ours (no blue stamp): JavaScript has no scope destructor or shared_ptr, so the share is
   * released explicitly; the implementation is destroyed with its last share.
   */
  Destroy()
  {
    const owned = this._buffer;
    this._buffer = nullCB;
    if (--owned.owners === 0) owned.implementation.Destroy();
  }
}

CjsSchema.decorateField(Tr2ConstantBufferAL, "_buffer", type.unknown);
CjsSchema.decorateMethod(Tr2ConstantBufferAL, "Equals", meta.renamed("operator=="));
CjsSchema.blue.define(Tr2ConstantBufferAL, { className: "Tr2ConstantBufferAL" });
