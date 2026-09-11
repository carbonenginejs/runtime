// Source: trinity/trinityal/stub/Tr2OcclusionQueryALStub.cpp
// Source: trinity/trinityal/stub/Tr2GpuTimerALStub.cpp
// Source: trinity/trinityal/stub/Tr2PipelineStatsQueryALStub.cpp
//
// The three things a backend can be asked to measure: how many pixels a draw
// passed, how long the GPU took, and what the pipeline did.
//
// THREE CARBON FILES, ONE HERE, and that is the only liberty taken. They share
// a Begin/End/read shape, they are always ported and reviewed together, and
// none is large enough to carry a file. The classes keep Carbon's names and
// Carbon's separate behaviour - this is a file boundary, not a merged type.
//
// THE OCCLUSION QUERY IS NOT ACADEMIC HERE. Lens-flare occlusion has never
// worked in this organization's browser rendering, and the recorded reason is
// that the sample collection is absent. This is the interface that absence is
// measured against.
//
// EACH REPORTS AN HONEST EMPTY ANSWER RATHER THAN REFUSING. Carbon's stub
// returns zero pixels, a tiny fixed time, and no statistics - all with success -
// because a caller asking "how many pixels passed" on a device that draws
// nothing has a correct answer available, and it is zero.

import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";


/** Carbon's `Tr2OcclusionQueryAL::WaitMode`. */
export const OcclusionWaitMode = Object.freeze({
  /** Return whatever is available now. */
  DO_NOT_WAIT: 0,
  /** Block until the result is ready. */
  WAIT: 1
});


/**
 * Counts the pixels a bracketed draw passed.
 */
export class Tr2OcclusionQueryALStub extends Tr2DeviceResourceAL
{
  /** m_isValid */
  _isValid = false;

  /** m_isRunning */
  _isRunning = false;

  /**
   * Creates the query.
   *
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult`.
   */
  Create(renderContext)
  {
    if (!renderContext?.IsValid()) return ALResult.E_INVALIDARG;

    this._isValid = true;

    return ALResult.S_OK;
  }

  /** @returns {boolean} Whether the query was created. */
  IsValid()
  {
    return this._isValid;
  }

  /** Releases the query. */
  Destroy()
  {
    this._isValid = false;
    super.Destroy();
  }

  /**
   * Starts counting.
   *
   * @returns {number} An `ALResult`.
   */
  Begin()
  {
    if (!this._isValid) return ALResult.E_INVALIDCALL;

    this._isRunning = true;

    return ALResult.S_OK;
  }

  /**
   * Stops counting.
   *
   * ENDING A QUERY THAT NEVER BEGAN IS AN ERROR, which Carbon checks
   * (`cpp:End`) and which is the mispairing this class exists to catch.
   *
   * @returns {number} An `ALResult`.
   */
  End()
  {
    if (!this._isValid) return ALResult.E_INVALIDCALL;
    if (!this._isRunning) return ALResult.E_INVALIDCALL;

    this._isRunning = false;

    return ALResult.S_OK;
  }

  /**
   * How many pixels passed.
   *
   * @param {number} [_waitMode] An `OcclusionWaitMode`; nothing to wait for here.
   * @returns {object} `{ result, count }`.
   */
  GetPixelCount(_waitMode = OcclusionWaitMode.DO_NOT_WAIT)
  {
    if (!this._isValid) return { result: ALResult.E_INVALIDCALL, count: 0 };

    return { result: ALResult.S_OK, count: 0 };
  }

  /** @returns {number} A `Tr2ALMemoryType`. */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_VIDEO;
  }


  /**
   * Names the query for a debugger.
   *
   * @param {string} _name The name Carbon would attach; the stub discards it.
   * @returns {number} An `ALResult` value; the stub keeps no name
   *   (`Tr2OcclusionQueryALStub.cpp:81-84`).
   */
  SetName(_name)
  {
    return ALResult.S_OK;
  }
}


/**
 * Times a bracketed span of GPU work.
 */
export class Tr2GpuTimerALStub extends Tr2DeviceResourceAL
{
  /** m_isValid */
  _isValid = false;

  /**
   * Creates the timer, releasing any previous one first as Carbon does.
   *
   * @param {object} renderContext The primary context to create against.
   * @returns {number} An `ALResult`.
   */
  Create(renderContext)
  {
    this.Destroy();

    if (!renderContext?.IsValid()) return ALResult.E_INVALIDARG;

    this._isValid = true;

    return ALResult.S_OK;
  }

  /** Releases the timer. */
  Destroy()
  {
    this._isValid = false;
    super.Destroy();
  }

  /** @returns {boolean} Whether the timer was created. */
  IsValid()
  {
    return this._isValid;
  }

  /**
   * Starts timing.
   *
   * @returns {boolean} True, as Carbon's stub returns.
   */
  Begin()
  {
    return true;
  }

  /** Stops timing. */
  End()
  {
  }

  /**
   * The measured time in seconds.
   *
   * A TINY POSITIVE NUMBER RATHER THAN ZERO, which is Carbon's `0.0001f`
   * (`cpp:GetTime`), and negative one when there is no timer. Zero would divide
   * badly in a caller computing a rate; the negative distinguishes "no timer"
   * from "no time".
   *
   * @returns {number} Seconds, or -1 without a timer.
   */
  GetTime()
  {
    return this._isValid ? 0.0001 : -1;
  }

  /** @returns {number} A `Tr2ALMemoryType`. */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_VIDEO;
  }


  /**
   * Names the timer for a debugger.
   *
   * @param {string} _name The name Carbon would attach; the stub discards it.
   * @returns {number} An `ALResult` value; the stub keeps no name
   *   (`Tr2GpuTimerALStub.cpp:55-58`).
   */
  SetName(_name)
  {
    return ALResult.S_OK;
  }
}


/**
 * Collects pipeline statistics over a bracketed span.
 *
 * Carbon's stub is the most permissive of the three: it is always valid and
 * every call succeeds, because there is nothing to allocate and no state worth
 * mispairing.
 */
export class Tr2PipelineStatsQueryALStub extends Tr2DeviceResourceAL
{
  /**
   * Creates the query.
   *
   * @returns {number} An `ALResult`.
   */
  Create()
  {
    return ALResult.S_OK;
  }

  /** @returns {boolean} True, as Carbon's stub is always valid. */
  IsValid()
  {
    return true;
  }

  /** Releases the query. */
  Destroy()
  {
    super.Destroy();
  }

  /** @returns {number} An `ALResult`. */
  Begin()
  {
    return ALResult.S_OK;
  }

  /** @returns {number} An `ALResult`. */
  End()
  {
    return ALResult.S_OK;
  }

  /**
   * The collected statistics.
   *
   * @returns {object} `{ result, data }` with an empty data set.
   */
  GetStats()
  {
    return { result: ALResult.S_OK, data: [] };
  }

  /**
   * How many values a statistics set holds.
   *
   * @param {Array} data A statistics set.
   * @returns {number} The count.
   */
  static GetValueCount(data)
  {
    return data?.length ?? 0;
  }

  /**
   * One value's label.
   *
   * @param {Array} data A statistics set.
   * @param {number} index Which value.
   * @returns {string} The label, empty when absent.
   */
  static GetLabel(data, index)
  {
    return data?.[index]?.label ?? "";
  }

  /**
   * One value's description.
   *
   * @param {Array} data A statistics set.
   * @param {number} index Which value.
   * @returns {string} The description, empty when absent.
   */
  static GetDescription(data, index)
  {
    return data?.[index]?.description ?? "";
  }

  /**
   * One value.
   *
   * @param {Array} data A statistics set.
   * @param {number} index Which value.
   * @returns {number} The value, zero when absent.
   */
  static GetValue(data, index)
  {
    return data?.[index]?.value ?? 0;
  }

  /** @returns {number} A `Tr2ALMemoryType`; MANAGED, not VIDEO, as Carbon has it. */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }


  /**
   * Names the query for a debugger.
   *
   * @param {string} _name The name Carbon would attach; the stub discards it.
   * @returns {number} An `ALResult` value; the stub keeps no name
   *   (`Tr2PipelineStatsQueryALStub.cpp:70-73`).
   */
  SetName(_name)
  {
    return ALResult.S_OK;
  }


  /**
   * Describes this query for a device inventory.
   *
   * THE ONE NON-EMPTY `Describe` IN CARBON'S STUB TREE. Every other stub
   * resource leaves the map untouched; this one writes its own type name
   * (`Tr2PipelineStatsQueryALStub.cpp:65-68`). Overridden here for that reason
   * alone - the base class no-op would otherwise be silently wrong.
   *
   * @param {object} description Accumulator, keyed by name.
   */
  Describe(description)
  {
    description.type = "Tr2PipelineStatsQueryAL";
  }
}
