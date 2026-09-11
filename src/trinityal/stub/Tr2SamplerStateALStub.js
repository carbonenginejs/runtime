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

import { CjsSchema } from "#schema";
import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";


/** Carbon's "no descriptor heap index". */
const NO_HEAP_INDEX = 0xffffffff;


/**
 * A sampler state the backend has accepted.
 */
export class Tr2SamplerStateALStub extends Tr2DeviceResourceAL
{
  /** m_isValid */
  _isValid = false;

  /** The description this state was created from. */
  _description = null;

  /**
   * Creates the sampler state.
   *
   * @param {object} description The sampler description.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  Create(description, renderContext)
  {
    this._description = description;
    this._isValid = true;

    return ALResult.S_OK;
  }

  /** Releases the state and leaves the device-resource registry. */
  Destroy()
  {
    this._isValid = false;
    this._description = null;
    super.Destroy();
  }

  /**
   * Whether the state was created.
   *
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this._isValid;
  }

  /**
   * The description this state was created from.
   *
   * @returns {object|null} The description.
   */
  GetDescription()
  {
    return this._description;
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
CjsSchema.define(Tr2SamplerStateALStub, { className: "Tr2SamplerStateALStub", carbon: "Tr2SamplerStateAL" });
