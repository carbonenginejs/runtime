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

import { CjsSchema, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";


/** A fence the backend has accepted.
 *
 * Carbon: Tr2FenceAL (trinity/trinityal/stub/Tr2FenceALStub.h:11)
 */
export class Tr2FenceALStub extends Tr2DeviceResourceAL
{
  /** m_isValid */
  _isValid = false;

  /** m_hasFence - whether a marker is outstanding. */
  _hasFence = false;

  /**
   * Creates the fence.
   *
   * @implemented
   * @param {object} renderContext The primary context to create against.
   * @returns {number} An `ALResult`.
   */
  Create(renderContext)
  {
    if (!renderContext?.IsValid()) return ALResult.E_INVALIDARG;

    this._isValid = true;

    return ALResult.S_OK;
  }

  /**
   * Releases the fence and drops any outstanding marker.
   *
   * @implemented
   */
  Destroy()
  {
    this._isValid = false;
    this._hasFence = false;
    super.Destroy();
  }

  /**
   * @implemented
   * @returns {boolean} Whether the fence was created.
   */
  IsValid()
  {
    return this._isValid;
  }

  /**
   * Puts a marker into the command stream.
   *
   * TWO MARKERS AT ONCE IS AN ERROR, not a replacement - Carbon returns
   * `E_INVALIDCALL` (`cpp:PutFence`). A fence names one point; putting a second
   * before waiting on the first means the caller has lost track of which point
   * it is waiting for.
   *
   * @implemented
   * @returns {number} An `ALResult`.
   */
  PutFence()
  {
    if (!this._isValid) return ALResult.E_FAIL;
    if (this._hasFence) return ALResult.E_INVALIDCALL;

    this._hasFence = true;

    return ALResult.S_OK;
  }

  /**
   * Whether the GPU has passed the marker.
   *
   * A stub device finishes instantly, so this is true whenever no marker is
   * outstanding.
   *
   * @adapted
   * @returns {object} `{ result, isReached }`.
   */
  IsReached()
  {
    if (!this._isValid) return { result: ALResult.E_FAIL, isReached: false };

    return { result: ALResult.S_OK, isReached: !this._hasFence };
  }

  /**
   * Waits for the marker and clears it.
   *
   * WAITING WITHOUT A MARKER IS AN ERROR (`E_INVALIDCALL`), because there is
   * nothing to wait for and a caller that thinks otherwise has mispaired its
   * calls.
   *
   * @implemented
   * @returns {number} An `ALResult`.
   */
  Wait()
  {
    if (!this._isValid) return ALResult.E_FAIL;
    if (!this._hasFence) return ALResult.E_INVALIDCALL;

    this._hasFence = false;

    return ALResult.S_OK;
  }

  /**
   * @implemented
   * @returns {number} A `Tr2ALMemoryType`.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_VIDEO;
  }


  /**
   * Describes this resource for a device inventory.
   *
   * Carbon: Tr2FenceAL::Describe (trinity/trinityal/stub/Tr2FenceALStub.cpp:81)
   *
   * Carbon's stub leaves the map untouched, so there is nothing to write
   * here either; it is stated rather than inherited from the base class so
   * the donor method has a counterpart on this class.
   *
   * @implemented
   * @param {object} _description Accumulator, keyed by name; left untouched.
   */
  Describe(_description)
  {
  }

  /**
   * Names the fence for a debugger.
   *
   * @implemented
   * @param {string} _name The name Carbon would attach; the stub discards it.
   * @returns {number} An `ALResult` value; the stub keeps no name
   *   (`Tr2FenceALStub.cpp:85-88`).
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
CjsSchema.decorateField(Tr2FenceALStub, "_isValid", type.boolean);
CjsSchema.decorateField(Tr2FenceALStub, "_hasFence", type.boolean);
// States against stub/Tr2FenceALStub.cpp:14-76 and .h:25-31; IsReached is adapted: the bool& comes back with the result as { result, isReached }. Destroy also runs the base resource's Destroy, which is the unregistering Carbon's Tr2DeviceResourceAL template does.
CjsSchema.meta.define("Tr2FenceALStub")(Tr2FenceALStub);
