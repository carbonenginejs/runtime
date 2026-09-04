// Source: trinity/trinityal/stub/Tr2VertexLayoutALStub.cpp
// Source: trinity/trinityal/stub/Tr2VertexLayoutALStub.h
//
// The input layout: a vertex definition the backend has accepted.
//
// Carbon's stub keeps a copy of the definition and validates one thing - that
// it has elements. An empty definition is a layout that matches no shader
// input, so it fails rather than binding nothing.
//
// ONE PORT NOTE. Carbon's `Tr2VertexDefinition` is a class holding `m_items`;
// this runtime already has `Tr2VertexDefinition` as the static intern table
// over plain element arrays (`../vertex/Tr2VertexDefinition.js`), so the
// definition passed here IS that element array. Nothing new is introduced.
//
// AND ONE CARBON ODDITY, transcribed: the definition is stored BEFORE the empty
// check, so a stub layout that failed still reports itself valid. Left as it
// stands rather than quietly reordered - a caller that ignores the result gets
// Carbon's behaviour, not a different one.

import { Tr2ALMemoryType, Tr2BaseDeviceResourceAL } from "./Tr2DeviceResourceAL.js";
import { ALResult } from "./ALResult.js";


/**
 * An accepted vertex definition.
 */
export class Tr2VertexLayoutALStub extends Tr2BaseDeviceResourceAL
{
  /** m_definition */
  #definition = null;

  /**
   * Creates the layout.
   *
   * @param {object[]} definition The vertex element list.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  Create(definition, renderContext)
  {
    if (!renderContext.IsValid()) return ALResult.E_FAIL;

    this.#definition = definition.slice();

    if (this.#definition.length === 0) return ALResult.E_FAIL;

    return ALResult.S_OK;
  }

  /** Releases the definition and leaves the device-resource registry. */
  Destroy()
  {
    this.#definition = null;
    super.Destroy();
  }

  /**
   * Whether a definition was stored.
   *
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this.#definition !== null;
  }

  /**
   * The stored vertex element list.
   *
   * @returns {object[]|null} The elements, or null before creation.
   */
  GetDefinition()
  {
    return this.#definition;
  }

  /**
   * Which memory class this layout occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Names the layout for a debugger.
   *
   * @returns {number} An `ALResult` value; the stub keeps no name.
   */
  SetName()
  {
    return ALResult.S_OK;
  }
}
