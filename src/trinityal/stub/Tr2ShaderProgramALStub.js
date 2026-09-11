// Source: trinity/trinityal/stub/Tr2ShaderProgramALStub.cpp
// Source: trinity/trinityal/stub/Tr2ShaderProgramALStub.h
//
// A linked set of shaders: one program, at most one shader per stage.
//
// THE ONE RULE IT ENFORCES IS THE USEFUL ONE. Carbon builds a bit mask of the
// stages it has seen and refuses a second shader for a stage already filled
// (`Tr2ShaderProgramALStub.cpp:31-46`). Two vertex shaders in a program is a
// caller that assembled a pass wrongly, and without this it would link, bind,
// and draw with whichever the backend happened to keep.
//
// Carbon quirk: Create leaves the stub map empty (stub cpp:23-49; CE-26).
import { CjsSchema } from "#schema";
import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { Tr2RegisterMapAL } from "../Tr2ResourceSetAL/Tr2RegisterMapAL.js";


/**
 * A linked program over one shader per stage.
 */
export class Tr2ShaderProgramALStub extends Tr2DeviceResourceAL
{
  /** m_isValid */
  _isValid = false;

  /** The shaders the program linked, in the order they were given. */
  _shaders = [];

  m_registerMap = new Tr2RegisterMapAL();

  /** Returns the register map that Carbon's stub deliberately leaves empty. */
  GetRegisterMap()
  {
    return this.m_registerMap;
  }

  /**
   * Links the shaders into a program.
   *
   * @param {object[]} shaders The shaders to link.
   * @param {object} renderContext The context to link against.
   * @returns {number} An `ALResult` value.
   */
  Create(shaders, renderContext)
  {
    this._Reset();

    if (!renderContext.IsValid()) return ALResult.E_INVALIDCALL;

    if (shaders.length === 0) return ALResult.E_INVALIDARG;

    let mask = 0;

    for (const shader of shaders)
    {
      if (!shader.IsValid()) return ALResult.E_INVALIDARG;

      const bit = 1 << shader.GetType();

      if ((mask & bit) !== 0) return ALResult.E_INVALIDARG;

      mask |= bit;
    }

    this._shaders = shaders.slice();
    this._isValid = true;

    return ALResult.S_OK;
  }

  /** Carbon's impl `Destroy`: drops validity without unregistering. */
  _Reset()
  {
    this._isValid = false;
    this._shaders = [];
  }

  /** Releases the program and leaves the device-resource registry. */
  Destroy()
  {
    this._Reset();
    super.Destroy();
  }

  /**
   * Whether the program linked.
   *
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this._isValid;
  }

  /**
   * The linked shaders.
   *
   * @returns {object[]} The shaders, in the order they were given.
   */
  GetShaders()
  {
    return this._shaders;
  }

  /**
   * Which memory class this program occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Names the program for a debugger.
   *
   * @param {string} _name The name Carbon would attach; the stub discards it.
   * @returns {number} An `ALResult` value; the stub keeps no name.
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
CjsSchema.define(Tr2ShaderProgramALStub, { className: "Tr2ShaderProgramALStub", carbon: "Tr2ShaderProgramAL" });
