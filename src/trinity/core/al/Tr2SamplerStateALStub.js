// Source: trinity/trinityal/stub/Tr2SamplerStateALStub.cpp
// Source: trinity/trinityal/stub/Tr2SamplerStateALStub.h
//
// A created sampler state.
//
// Carbon's stub is the thinnest type in the family: `Create` sets a flag and
// returns success, because the whole meaning of a sampler lives in a driver
// object there is none of here. It is still a real resource - it registers,
// it destroys, it reports a memory class - which is what a resource set will
// bind.
//
// ONE DEPARTURE, the same one the buffer makes: the description IS STORED.
// Carbon's stub ignores its argument entirely (`Tr2SamplerStateALStub.cpp:16`);
// its real backends turn it into a driver object. Keeping it costs one field
// and means a headless caller can read back the state it asked for.
//
// The description type itself is NOT redefined here. This runtime already
// spells Carbon's sampler state in the places that own it - `Tr2SamplerOverride`
// for authored overrides and `Tr2RenderContext.TextureAddressMode` for the
// address vocabulary - so the AL takes the description as given.

import { Tr2ALMemoryType, Tr2BaseDeviceResourceAL } from "./Tr2DeviceResourceAL.js";
import { ALResult } from "./ALResult.js";


/** Carbon's "no descriptor heap index". */
const NO_HEAP_INDEX = 0xffffffff;


/**
 * A sampler state the backend has accepted.
 */
export class Tr2SamplerStateALStub extends Tr2BaseDeviceResourceAL
{
  /** m_isValid */
  #isValid = false;

  /** The description this state was created from. */
  #description = null;

  /**
   * Creates the sampler state.
   *
   * @param {object} description The sampler description.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  Create(description, renderContext)
  {
    this.#description = description;
    this.#isValid = true;

    return ALResult.S_OK;
  }

  /** Releases the state and leaves the device-resource registry. */
  Destroy()
  {
    this.#isValid = false;
    this.#description = null;
    super.Destroy();
  }

  /**
   * Whether the state was created.
   *
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this.#isValid;
  }

  /**
   * The description this state was created from.
   *
   * @returns {object|null} The description.
   */
  GetDescription()
  {
    return this.#description;
  }

  /**
   * Where the sampler sits in the descriptor heap.
   *
   * @returns {number} Carbon's "no index".
   */
  GetIndexInHeap()
  {
    return NO_HEAP_INDEX;
  }

  /**
   * Which memory class this state occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Names the state for a debugger.
   *
   * @returns {number} An `ALResult` value; the stub keeps no name.
   */
  SetName()
  {
    return ALResult.S_OK;
  }
}
