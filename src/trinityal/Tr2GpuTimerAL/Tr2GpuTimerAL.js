// Source: trinity/trinityal/include/Tr2GpuTimerAL.h
// Source: trinity/trinityal/src/Tr2GpuTimerAl.cpp
//
// The backend-neutral GPU timer: Carbon's PIMPL value. Owners hold one by
// value (`Tr2ProfileTimer::m_gpuTimer`, `Tr2ProfileTimer.h:31`;
// `Tr2GpuProfiler::Zone::timer`, `Tr2GpuProfiler.h:44`), it is invalid until
// `Create` fills it, and every call forwards to the shared implementation.
//
// The render context allocates the implementation where Carbon includes the
// platform's `TrinityALImpl::Tr2GpuTimerAL` at compile time
// (`TRINITY_AL_PLATFORM_INCLUDE`, `Tr2GpuTimerAl.cpp:6`): we ship every backend
// at once, so the context that knows its backend is the factory
// (`CreateGpuTimer(true)`). A backend that cannot time GPU work refuses there
// with `E_FAIL`, as Metal's `Create` does when the device cannot sample
// counters (`Tr2GpuTimerALMetal.mm:27-32`, `:48-51`), and the value stays on
// the null implementation.
import { CjsSchema, meta, blue, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult, Failed } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";


/**
 * Carbon's `g_gpuTimersEnabled` (`Tr2GpuTimerAl.cpp:8`). Carbon clears it from
 * the `gpuTimers` start-up argument (`trinity.cpp:271`), which this port's
 * `InitializeTrinity` does not take, so it stays at Carbon's default.
 */
const gpuTimersEnabled = true;

/**
 * Carbon's `nullGpuTimer` (`Tr2GpuTimerAl.cpp:10-13`): the one shared default
 * implementation every uncreated handle points at. Carbon's is the platform
 * impl default-constructed; the handle here is backend-neutral, so this
 * answers as the stub's default-constructed impl does - invalid, a `Begin`
 * that answers true, a time of -1, video memory (`Tr2GpuTimerALStub.cpp:11-58`,
 * `Tr2GpuTimerALStub.h:32-35`). Its share count is unbounded, so releasing a
 * default handle never destroys it.
 */
const nullGpuTimer = {
  owners: Infinity,
  implementation: {
    IsValid: () => false,
    Begin: () => true,
    End: () => undefined,
    GetTime: () => -1,
    GetMemoryClass: () => Tr2ALMemoryType.AL_MEMORY_VIDEO,
    SetName: () => ALResult.S_OK,
    Destroy: () => undefined
  }
};


/** A GPU timer value sharing one backend implementation. */
export class Tr2GpuTimerAL
{
  /** m_gpu_timer: the shared implementation record; `nullGpuTimer` until created. */
  _gpuTimer = nullGpuTimer;

  /**
   * Carbon's default constructor (`Tr2GpuTimerAl.cpp:15-18`) leaves the value
   * on `nullGpuTimer`. A `copy` replaces C++'s implicit copy construction,
   * sharing the implementation; plain JavaScript assignment aliases instead.
   *
   * @param {object} [options] Copy construction.
   * @param {Tr2GpuTimerAL|null} [options.copy] The value to share.
   */
  constructor({ copy = null } = {})
  {
    if (copy)
    {
      this._gpuTimer = copy._gpuTimer;
      this._gpuTimer.owners += 1;
    }
  }

  /**
   * Carbon's Create( renderContext ) (`Tr2GpuTimerAL.h:21`,
   * `Tr2GpuTimerAl.cpp:20-35`): refused with `E_FAIL` while GPU timers are
   * disabled, otherwise a fresh implementation replaces this value's; a
   * failure leaves it on the null implementation.
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

    if (!gpuTimersEnabled) return ALResult.E_FAIL;

    const { result, implementation } = RenderContextALOf(renderContext).CreateGpuTimer(true);
    if (Failed(result)) return result;

    this._gpuTimer = { implementation, owners: 1 };
    return result;
  }

  /**
   * Starts timing (`Tr2GpuTimerAl.cpp:38-41`).
   *
   * @param {object} renderContext The context recording.
   * @returns {boolean} Whether the timer started.
   */
  @blue.method
  @meta.implemented
  Begin(renderContext)
  {
    return this._gpuTimer.implementation.Begin(renderContext);
  }

  /**
   * Stops timing (`Tr2GpuTimerAl.cpp:43-46`).
   *
   * @param {object} renderContext The context recording.
   */
  @blue.method
  @meta.implemented
  End(renderContext)
  {
    this._gpuTimer.implementation.End(renderContext);
  }

  /**
   * The last measured time (`Tr2GpuTimerAl.cpp:48-51`).
   *
   * @param {object} renderContext The context whose results are read.
   * @returns {number} The backend's measurement; -1 without a timer.
   */
  @blue.method
  @meta.implemented
  GetTime(renderContext)
  {
    return this._gpuTimer.implementation.GetTime(renderContext);
  }

  /**
   * Whether the implementation exists (`Tr2GpuTimerAl.cpp:53-56`).
   *
   * @returns {boolean} True once created.
   */
  @blue.method
  @meta.implemented
  IsValid()
  {
    return this._gpuTimer.implementation.IsValid();
  }

  /**
   * Compares implementation identity (`Tr2GpuTimerAl.cpp:58-61`).
   *
   * Adapted: JavaScript has no overloadable equality operator.
   *
   * @param {Tr2GpuTimerAL} other The value to compare.
   * @returns {boolean} Whether both share one implementation.
   */
  @blue.method
  @meta.adapted
  Equals(other)
  {
    return this._gpuTimer === other._gpuTimer;
  }

  /**
   * The implementation's memory class (`Tr2GpuTimerAl.cpp:63-66`).
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  @blue.method
  @meta.implemented
  GetMemoryClass()
  {
    return this._gpuTimer.implementation.GetMemoryClass();
  }

  /**
   * Names valid storage; an invalid value or an absent name keeps Carbon's
   * errors (`Tr2GpuTimerAl.cpp:68-79`).
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
    return this._gpuTimer.implementation.SetName(name);
  }

  /**
   * Resets this value to the null implementation, Carbon's
   * `m_gpuTimer = Tr2GpuTimerAL()` (`Tr2ProfileTimer.cpp:38-40`).
   *
   * Ours (no blue stamp): JavaScript has no scope destructor or shared_ptr, so
   * the share is released explicitly; the implementation is destroyed with its
   * last share.
   */
  Destroy()
  {
    const owned = this._gpuTimer;
    this._gpuTimer = nullGpuTimer;
    if (--owned.owners === 0) owned.implementation.Destroy();
  }
}

CjsSchema.decorateField(Tr2GpuTimerAL, "_gpuTimer", type.unknown);
CjsSchema.decorateMethod(Tr2GpuTimerAL, "Equals", meta.renamed("operator=="));
CjsSchema.meta.carbon("Tr2GpuTimerAL")(Tr2GpuTimerAL);
