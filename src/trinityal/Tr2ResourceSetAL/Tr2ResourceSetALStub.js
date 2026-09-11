// Source: trinity/trinityal/include/Tr2ResourceSetAL.h
// Source: trinity/trinityal/stub/Tr2ResourceSetALStub.cpp
// Source: trinity/trinityal/stub/Tr2ResourceSetALStub.h
import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { impl } from "#schema";
import { ALResult } from "../ALResult.js";

/**
 * A resource set the backend has accepted.
 *
 * Carbon's stub sets a flag and returns success, because the whole meaning of a
 * resource set lives in a descriptor heap or bind group there is none of here.
 * The description is kept, which is the departure every stub in this family
 * makes: a headless caller can read back what it asked to bind.
 */
export class Tr2ResourceSetALStub extends Tr2DeviceResourceAL
{
  /** m_isValid */
  _isValid = false;

  _description = null;

  _program = null;

  /**
   * Creates the resource set against a shader program.
   *
   * @param {Tr2ResourceSetDescriptionAL} description What to bind.
   * @param {object} program A `Tr2ShaderProgramAL`.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult`.
   */
  @impl.adapted
  @impl.reason("The native stub unconditionally succeeds; JS additionally retains description and program for headless inspection.")
  Create(description, program, _renderContext)
  {
    this._description = description ?? null;
    this._program = program ?? null;
    this._isValid = true;

    return ALResult.S_OK;
  }

  /** @returns {boolean} Whether the set was created. */
  IsValid()
  {
    return this._isValid;
  }

  /** Releases the set. */
  Destroy()
  {
    this._isValid = false;
    this._description = null;
    this._program = null;
    super.Destroy();
  }

  /** @returns {Tr2ResourceSetDescriptionAL|null} What this set binds. */
  GetDescription()
  {
    return this._description;
  }

  /** @returns {object|null} The program this set was created against. */
  GetProgram()
  {
    return this._program;
  }

  /** @returns {number} A `Tr2ALMemoryType`. */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }


  /**
   * Names the resource set for a debugger.
   *
   * @param {string} _name The name Carbon would attach; the stub discards it.
   * @returns {number} An `ALResult` value; the stub keeps no name
   *   (`Tr2ResourceSetALStub.cpp:41-44`).
   */
  SetName(_name)
  {
    return ALResult.S_OK;
  }
}
