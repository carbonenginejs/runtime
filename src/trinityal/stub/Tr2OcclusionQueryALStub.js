// Source: trinity/trinityal/stub/Tr2OcclusionQueryALStub.cpp
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
