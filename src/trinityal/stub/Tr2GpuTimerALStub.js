// Source: trinity/trinityal/stub/Tr2GpuTimerALStub.cpp
import { CjsSchema } from "#schema";
import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";


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

// DECLARED AS A CALL, NOT A DECORATOR, for the reason recorded in
// Tr2BitmapDimensions.js: the layer is imported straight from source by its
// tests and raw Node cannot parse decorator syntax.
//
// The donor is NAMED rather than left to be derived from this class's name.
// Carbon calls every backend's class the same thing and carries the backend in
// the FILE name, because only one backend compiles at a time; we ship them
// together, so the backend moves onto the class name. That divergence is the
// author's to declare, never a checker's to guess.
CjsSchema.define(Tr2GpuTimerALStub, { className: "Tr2GpuTimerALStub", carbon: "Tr2GpuTimerAL" });
