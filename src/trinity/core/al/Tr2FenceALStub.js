// Source: trinity/trinityal/stub/Tr2FenceALStub.cpp
// Source: trinity/trinityal/stub/Tr2FenceALStub.h
//
// A GPU fence: one marker put into the command stream, and a way to ask whether
// the GPU has passed it.
//
// THE STUB IS NOT A NO-OP, and the reason matters. It tracks whether a fence is
// OUTSTANDING and answers `IsReached` with the negation of that. So a stub
// device behaves like a GPU that finishes everything instantly, which is a real
// and consistent answer rather than a shrug - and it makes the double-put and
// wait-without-put errors catchable without hardware.
//
// WHAT THIS IS FOR HERE. `Tr2RingBuffer` already fences, but on FRAME NUMBERS -
// rows recorded for a frame cannot be reused until the device reports that frame
// finished. That is the coarse version of the same idea. A fence is the fine
// one, and the two are not interchangeable: a frame number says "everything up
// to here is done", a fence says "this particular point is done".

import { Tr2ALMemoryType, Tr2BaseDeviceResourceAL } from "./Tr2DeviceResourceAL.js";
import { ALResult } from "./ALResult.js";


/** A fence the backend has accepted. */
export class Tr2FenceALStub extends Tr2BaseDeviceResourceAL
{
  /** m_isValid */
  #isValid = false;

  /** m_hasFence - whether a marker is outstanding. */
  #hasFence = false;

  /**
   * Creates the fence.
   *
   * @param {object} renderContext The primary context to create against.
   * @returns {number} An `ALResult`.
   */
  Create(renderContext)
  {
    if (!renderContext?.IsValid()) return ALResult.E_INVALIDARG;

    this.#isValid = true;

    return ALResult.S_OK;
  }

  /** Releases the fence and drops any outstanding marker. */
  Destroy()
  {
    this.#isValid = false;
    this.#hasFence = false;
  }

  /** @returns {boolean} Whether the fence was created. */
  IsValid()
  {
    return this.#isValid;
  }

  /**
   * Puts a marker into the command stream.
   *
   * TWO MARKERS AT ONCE IS AN ERROR, not a replacement - Carbon returns
   * `E_INVALIDCALL` (`cpp:PutFence`). A fence names one point; putting a second
   * before waiting on the first means the caller has lost track of which point
   * it is waiting for.
   *
   * @returns {number} An `ALResult`.
   */
  PutFence()
  {
    if (!this.#isValid) return ALResult.E_FAIL;
    if (this.#hasFence) return ALResult.E_INVALIDCALL;

    this.#hasFence = true;

    return ALResult.S_OK;
  }

  /**
   * Whether the GPU has passed the marker.
   *
   * A stub device finishes instantly, so this is true whenever no marker is
   * outstanding.
   *
   * @returns {object} `{ result, isReached }`.
   */
  IsReached()
  {
    if (!this.#isValid) return { result: ALResult.E_FAIL, isReached: false };

    return { result: ALResult.S_OK, isReached: !this.#hasFence };
  }

  /**
   * Waits for the marker and clears it.
   *
   * WAITING WITHOUT A MARKER IS AN ERROR (`E_INVALIDCALL`), because there is
   * nothing to wait for and a caller that thinks otherwise has mispaired its
   * calls.
   *
   * @returns {number} An `ALResult`.
   */
  Wait()
  {
    if (!this.#isValid) return ALResult.E_FAIL;
    if (!this.#hasFence) return ALResult.E_INVALIDCALL;

    this.#hasFence = false;

    return ALResult.S_OK;
  }

  /** @returns {number} A `Tr2ALMemoryType`. */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_VIDEO;
  }
}
