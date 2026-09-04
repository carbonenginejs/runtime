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
// Carbon's program also exposes a register map, and this does NOT, deliberately.
// `Tr2RegisterMapAL` belongs to `Tr2ResourceSetAL`, which is the next thing in
// the port order and the piece that actually reads it. A method returning an
// empty map would be a promise nothing keeps; a missing one fails loudly at the
// call that needs it.

import { Tr2ALMemoryType, Tr2BaseDeviceResourceAL } from "./Tr2DeviceResourceAL.js";
import { ALResult } from "./ALResult.js";


/**
 * A linked program over one shader per stage.
 */
export class Tr2ShaderProgramALStub extends Tr2BaseDeviceResourceAL
{
  /** m_isValid */
  #isValid = false;

  /** The shaders the program linked, in the order they were given. */
  #shaders = [];

  /**
   * Links the shaders into a program.
   *
   * @param {object[]} shaders The shaders to link.
   * @param {object} renderContext The context to link against.
   * @returns {number} An `ALResult` value.
   */
  Create(shaders, renderContext)
  {
    this.#Reset();

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

    this.#shaders = shaders.slice();
    this.#isValid = true;

    return ALResult.S_OK;
  }

  /** Carbon's impl `Destroy`: drops validity without unregistering. */
  #Reset()
  {
    this.#isValid = false;
    this.#shaders = [];
  }

  /** Releases the program and leaves the device-resource registry. */
  Destroy()
  {
    this.#Reset();
    super.Destroy();
  }

  /**
   * Whether the program linked.
   *
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this.#isValid;
  }

  /**
   * The linked shaders.
   *
   * @returns {object[]} The shaders, in the order they were given.
   */
  GetShaders()
  {
    return this.#shaders;
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
   * @returns {number} An `ALResult` value; the stub keeps no name.
   */
  SetName()
  {
    return ALResult.S_OK;
  }
}
