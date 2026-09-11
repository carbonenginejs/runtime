// Source: trinity/trinityal/stub/Tr2VertexLayoutALStub.cpp
// Source: trinity/trinityal/stub/Tr2VertexLayoutALStub.h
//
// The input layout: a vertex definition the backend has accepted.
//
// Carbon's stub keeps a copy of the definition and validates one thing - that
// it has elements. An empty definition is a layout that matches no shader
// input, so it fails rather than binding nothing.
//
// ONE PORT NOTE. Since 2026-09-06 the runtime's `Tr2VertexDefinition` is the
// real Carbon class (m_items plus the per-stream offset ledger), and the
// intern table lives where Carbon keeps it, on `Tr2EffectStateManager`
// (s_vertexLayoutMap). What reaches this stub may still be a plain element
// array where a payload owns one; `Create` accepts either.
//
// AND ONE CARBON ODDITY, transcribed: the definition is stored BEFORE the empty
// check, so a stub layout that failed still reports itself valid. Left as it
// stands rather than quietly reordered - a caller that ignores the result gets
// Carbon's behaviour, not a different one.

import { CjsSchema } from "#schema";
import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";


/**
 * An accepted vertex definition.
 */
export class Tr2VertexLayoutALStub extends Tr2DeviceResourceAL
{
  /** m_definition */
  _definition = null;

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

    this._definition = (definition?.items ?? definition).slice();

    if (this._definition.length === 0) return ALResult.E_FAIL;

    return ALResult.S_OK;
  }

  /** Releases the definition and leaves the device-resource registry. */
  Destroy()
  {
    this._definition = null;
    super.Destroy();
  }

  /**
   * Whether a definition was stored.
   *
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this._definition !== null;
  }

  /**
   * The stored vertex element list.
   *
   * @returns {object[]|null} The elements, or null before creation.
   */
  GetDefinition()
  {
    return this._definition;
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
CjsSchema.define(Tr2VertexLayoutALStub, { className: "Tr2VertexLayoutALStub", carbon: "Tr2VertexLayoutAL" });
