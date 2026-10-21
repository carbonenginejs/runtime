// Source: trinity/trinityal/include/Tr2OcclusionQueryAL.h
// Source: trinity/trinityal/src/Tr2OcclusionQueryAL.cpp
//
// The backend-neutral occlusion query: Carbon's PIMPL value, invalid until
// `Create` fills it, every call forwarding to the shared implementation.
// `WaitMode` is declared here, on the handle, as Carbon nests it
// (`Tr2OcclusionQueryAL.h:20-24`); the backends read it from here.
//
// The render context allocates the implementation where Carbon includes the
// platform's `TrinityALImpl::Tr2OcclusionQueryAL` at compile time
// (`TRINITY_AL_PLATFORM_INCLUDE`, `Tr2OcclusionQueryAL.cpp:5`): we ship every
// backend at once, so the context that knows its backend is the factory
// (`CreateOcclusionQuery(true)`). A backend that has no occlusion query refuses
// there with `E_FAIL`, as Carbon's backends refuse a query the device cannot
// make (`Tr2GpuTimerALMetal.mm:48-51`), and the value stays on the null
// implementation.
import { CjsSchema, meta, blue, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult, Failed } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";


/**
 * Carbon's `NullQuery()` (`Tr2OcclusionQueryAL.cpp:10-14`): the one shared
 * default implementation every uncreated handle points at. Carbon's is the
 * platform impl default-constructed; the handle here is backend-neutral, so
 * this answers as the stub's default-constructed impl does - invalid, every
 * verb refused with `E_INVALIDCALL`, video memory
 * (`Tr2OcclusionQueryALStub.cpp:12-84`, `Tr2OcclusionQueryALStub.h:25-28`).
 * Its share count is unbounded, so releasing a default handle never destroys it.
 */
const nullQuery = {
  owners: Infinity,
  implementation: {
    IsValid: () => false,
    Begin: () => ALResult.E_INVALIDCALL,
    End: () => ALResult.E_INVALIDCALL,
    GetPixelCount: () => ({ result: ALResult.E_INVALIDCALL, count: 0 }),
    GetMemoryClass: () => Tr2ALMemoryType.AL_MEMORY_VIDEO,
    SetName: () => ALResult.S_OK,
    Destroy: () => undefined
  }
};


/** An occlusion query value sharing one backend implementation. */
export class Tr2OcclusionQueryAL
{
  /** `Tr2OcclusionQueryAL::WaitMode` (`Tr2OcclusionQueryAL.h:20-24`). */
  static WaitMode = Object.freeze({
    /** Block until the result is ready. */
    WAIT: 0,

    /** Answer with whatever is available now. */
    DO_NOT_WAIT: 1
  });

  /** m_query: the shared implementation record; `nullQuery` until created. */
  _query = nullQuery;

  /**
   * Carbon's default constructor (`Tr2OcclusionQueryAL.cpp:18-21`) leaves the
   * value on `NullQuery()`. A `copy` replaces C++'s implicit copy
   * construction, sharing the implementation; plain JavaScript assignment
   * aliases instead.
   *
   * @param {object} [options] Copy construction.
   * @param {Tr2OcclusionQueryAL|null} [options.copy] The value to share.
   */
  constructor({ copy = null } = {})
  {
    if (copy)
    {
      this._query = copy._query;
      this._query.owners += 1;
    }
  }

  /**
   * Carbon's Create( renderContext ) (`Tr2OcclusionQueryAL.h:28`,
   * `Tr2OcclusionQueryAL.cpp:23-32`): a fresh implementation replaces this
   * value's; a failure leaves it on the null implementation.
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

    const { result, implementation } = RenderContextALOf(renderContext).CreateOcclusionQuery(true);
    if (Failed(result)) return result;

    this._query = { implementation, owners: 1 };
    return result;
  }

  /**
   * Starts counting (`Tr2OcclusionQueryAL.cpp:34-37`).
   *
   * @param {object} renderContext The context recording.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  Begin(renderContext)
  {
    return this._query.implementation.Begin(renderContext);
  }

  /**
   * Stops counting (`Tr2OcclusionQueryAL.cpp:39-42`).
   *
   * @param {object} renderContext The context recording.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  End(renderContext)
  {
    return this._query.implementation.End(renderContext);
  }

  /**
   * How many pixels passed (`Tr2OcclusionQueryAL.h:32`,
   * `Tr2OcclusionQueryAL.cpp:44-47`); `S_FALSE` while the result is not ready.
   *
   * Adapted: Carbon's `uint32_t& count` output becomes the returned `count`.
   *
   * @param {object} renderContext The context whose results are read.
   * @param {number} [waitMode] A `WaitMode`; Carbon's default is `DO_NOT_WAIT`.
   * @returns {{result: number, count: number}} The answer.
   */
  @blue.method
  @meta.adapted
  GetPixelCount(renderContext, waitMode = Tr2OcclusionQueryAL.WaitMode.DO_NOT_WAIT)
  {
    return this._query.implementation.GetPixelCount(renderContext, waitMode);
  }

  /**
   * Whether the implementation exists (`Tr2OcclusionQueryAL.cpp:49-52`).
   *
   * @returns {boolean} True once created.
   */
  @blue.method
  @meta.implemented
  IsValid()
  {
    return this._query.implementation.IsValid();
  }

  /**
   * Compares implementation identity (`Tr2OcclusionQueryAL.cpp:54-57`).
   *
   * Adapted: JavaScript has no overloadable equality operator.
   *
   * @param {Tr2OcclusionQueryAL} other The value to compare.
   * @returns {boolean} Whether both share one implementation.
   */
  @blue.method
  @meta.adapted
  Equals(other)
  {
    return this._query === other._query;
  }

  /**
   * The implementation's memory class (`Tr2OcclusionQueryAL.cpp:59-62`).
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  @blue.method
  @meta.implemented
  GetMemoryClass()
  {
    return this._query.implementation.GetMemoryClass();
  }

  /**
   * Names valid storage; an invalid value or an absent name keeps Carbon's
   * errors (`Tr2OcclusionQueryAL.cpp:64-75`).
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
    return this._query.implementation.SetName(name);
  }

  /**
   * Resets this value to the null implementation, Carbon's
   * `m_query = Tr2OcclusionQueryAL()`.
   *
   * Ours (no blue stamp): JavaScript has no scope destructor or shared_ptr, so
   * the share is released explicitly; the implementation is destroyed with its
   * last share.
   */
  Destroy()
  {
    const owned = this._query;
    this._query = nullQuery;
    if (--owned.owners === 0) owned.implementation.Destroy();
  }
}

CjsSchema.decorateField(Tr2OcclusionQueryAL, "_query", type.unknown);
CjsSchema.decorateMethod(Tr2OcclusionQueryAL, "Equals", meta.renamed("operator=="));
CjsSchema.meta.carbon("Tr2OcclusionQueryAL")(Tr2OcclusionQueryAL);
