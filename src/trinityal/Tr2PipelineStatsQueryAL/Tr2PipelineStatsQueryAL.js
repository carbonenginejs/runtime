// Source: trinity/trinityal/include/Tr2PipelineStatsQueryAL.h
// Source: trinity/trinityal/src/Tr2PipelineStatsQueryAL.cpp
//
// The backend-neutral pipeline statistics query: Carbon's PIMPL value
// (`Tr2GpuProfiler::Zone::query`, `Tr2GpuProfiler.h:43`), invalid until
// `Create` fills it, every call forwarding to the shared implementation.
//
// The render context allocates the implementation where Carbon includes the
// platform's `TrinityALImpl::Tr2PipelineStatsQueryAL` at compile time
// (`TRINITY_AL_PLATFORM_INCLUDE`, `Tr2PipelineStatsQueryAL.h:48`): we ship
// every backend at once, so the context that knows its backend is the factory
// (`CreatePipelineStatsQuery(true)`). A backend with no pipeline statistics
// refuses there with `E_FAIL`, as Metal's `Create` does when the device has no
// statistics counter set (`Tr2PipelineStatsQueryALMetal.mm:69-72`, `:88-91`,
// `:107-110`), and the value stays on the null implementation.
import { CjsSchema, meta, blue, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult, Failed } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";


/**
 * Carbon's `NullQuery()` (`Tr2PipelineStatsQueryAL.cpp:10-14`): the one shared
 * default implementation every uncreated handle points at. Carbon's is the
 * platform impl default-constructed, and here the backends disagree: the
 * stub's is always valid (`Tr2PipelineStatsQueryALStub.cpp:21-24`), dx11's and
 * Metal's are valid only with a device query (`Tr2PipelineStatsQueryALDx11.cpp:58-61`).
 * The handle is backend-neutral, so this answers as dx11's default does -
 * invalid, every verb refused with `E_INVALIDARG`, managed memory - and a
 * stub-created handle keeps the stub's always-valid answer.
 * Its share count is unbounded, so releasing a default handle never destroys it.
 */
const nullQuery = {
  owners: Infinity,
  implementation: {
    IsValid: () => false,
    Begin: () => ALResult.E_INVALIDARG,
    End: () => ALResult.E_INVALIDARG,
    GetStats: () => ({ result: ALResult.E_INVALIDARG, data: [] }),
    GetMemoryClass: () => Tr2ALMemoryType.AL_MEMORY_MANAGED,
    SetName: () => ALResult.S_OK,
    Destroy: () => undefined
  }
};

/**
 * Which backend's query class produced a statistics record, so the statics
 * below reach that backend's statics.
 */
const recordSource = new WeakMap();


/** A pipeline statistics query value sharing one backend implementation. */
export class Tr2PipelineStatsQueryAL
{
  /** m_query: the shared implementation record; `nullQuery` until created. */
  _query = nullQuery;

  /**
   * Carbon's default constructor (`Tr2PipelineStatsQueryAL.cpp:19-22`) leaves
   * the value on `NullQuery()`. A `copy` replaces C++'s implicit copy
   * construction, sharing the implementation; plain JavaScript assignment
   * aliases instead.
   *
   * @param {object} [options] Copy construction.
   * @param {Tr2PipelineStatsQueryAL|null} [options.copy] The value to share.
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
   * Carbon's Create( renderContext ) (`Tr2PipelineStatsQueryAL.h:24`,
   * `Tr2PipelineStatsQueryAL.cpp:24-33`): a fresh implementation replaces this
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

    const { result, implementation } = RenderContextALOf(renderContext).CreatePipelineStatsQuery(true);
    if (Failed(result)) return result;

    this._query = { implementation, owners: 1 };
    return result;
  }

  /**
   * Starts collecting (`Tr2PipelineStatsQueryAL.cpp:35-38`).
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
   * Stops collecting (`Tr2PipelineStatsQueryAL.cpp:40-43`).
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
   * The collected statistics (`Tr2PipelineStatsQueryAL.cpp:45-48`).
   *
   * Adapted: Carbon's `Tr2PipelineStatsDataAL&` output becomes the returned
   * `data`, and the record remembers which backend made it, for the statics.
   *
   * @param {object} renderContext The context whose results are read.
   * @returns {{result: number, data: object}} The statistics record.
   */
  @blue.method
  @meta.adapted
  GetStats(renderContext)
  {
    const implementation = this._query.implementation;
    const stats = implementation.GetStats(renderContext);

    if (stats.data !== null && typeof stats.data === "object") recordSource.set(stats.data, implementation.constructor);
    return stats;
  }

  /**
   * Whether the implementation exists (`Tr2PipelineStatsQueryAL.cpp:50-53`).
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
   * Compares implementation identity (`Tr2PipelineStatsQueryAL.cpp:55-58`).
   *
   * Adapted: JavaScript has no overloadable equality operator.
   *
   * @param {Tr2PipelineStatsQueryAL} other The value to compare.
   * @returns {boolean} Whether both share one implementation.
   */
  @blue.method
  @meta.adapted
  Equals(other)
  {
    return this._query === other._query;
  }

  /**
   * The implementation's memory class (`Tr2PipelineStatsQueryAL.cpp:60-63`).
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
   * How many values a record holds (`Tr2PipelineStatsQueryAL.cpp:65-68`).
   *
   * Adapted: Carbon forwards to the one compiled backend's static; ours
   * forwards to the static of the backend whose `GetStats` made the record.
   * A record no backend made holds no values.
   *
   * @param {object} data A statistics record from `GetStats`.
   * @returns {number} The value count.
   */
  @blue.method
  @meta.adapted
  static GetValueCount(data)
  {
    const source = recordSource.get(data);
    return source ? source.GetValueCount(data) : 0;
  }

  /**
   * One value's label (`Tr2PipelineStatsQueryAL.cpp:70-73`); see `GetValueCount`.
   *
   * @param {object} data A statistics record from `GetStats`.
   * @param {number} index Which value.
   * @returns {string} The label.
   */
  @blue.method
  @meta.adapted
  static GetLabel(data, index)
  {
    const source = recordSource.get(data);
    return source ? source.GetLabel(data, index) : "";
  }

  /**
   * One value's description (`Tr2PipelineStatsQueryAL.cpp:75-78`); see `GetValueCount`.
   *
   * @param {object} data A statistics record from `GetStats`.
   * @param {number} index Which value.
   * @returns {string} The description.
   */
  @blue.method
  @meta.adapted
  static GetDescription(data, index)
  {
    const source = recordSource.get(data);
    return source ? source.GetDescription(data, index) : "";
  }

  /**
   * One value (`Tr2PipelineStatsQueryAL.cpp:80-83`); see `GetValueCount`.
   *
   * @param {object} data A statistics record from `GetStats`.
   * @param {number} index Which value.
   * @returns {number} The value.
   */
  @blue.method
  @meta.adapted
  static GetValue(data, index)
  {
    const source = recordSource.get(data);
    return source ? source.GetValue(data, index) : 0;
  }

  /**
   * Names valid storage; an invalid value or an absent name keeps Carbon's
   * errors (`Tr2PipelineStatsQueryAL.cpp:85-96`).
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
   * `query = Tr2PipelineStatsQueryAL()`.
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

CjsSchema.decorateField(Tr2PipelineStatsQueryAL, "_query", type.unknown);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryAL, "Equals", meta.renamed("operator=="));
CjsSchema.meta.carbon("Tr2PipelineStatsQueryAL")(Tr2PipelineStatsQueryAL);
