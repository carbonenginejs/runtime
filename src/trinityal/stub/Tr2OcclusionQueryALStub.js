// Source: trinity/trinityal/stub/Tr2OcclusionQueryALStub.cpp
import { CjsSchema, blue, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { Tr2OcclusionQueryAL } from "../Tr2OcclusionQueryAL/Tr2OcclusionQueryAL.js";


// Carbon's `Tr2OcclusionQueryAL::WaitMode` is declared on the handle, where
// Carbon nests it (`Tr2OcclusionQueryAL.h:20-24`). This file's own copy,
// `OcclusionWaitMode`, had WAIT and DO_NOT_WAIT swapped and is gone.


/**
 * Counts the pixels a bracketed draw passed.
 */
export class Tr2OcclusionQueryALStub extends Tr2DeviceResourceAL
{
  /** m_isValid */
  _isValid = false;

  /** m_isRunning */
  _isRunning = false;

  /**
   * Creates the query.
   *
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult`.
   */
  Create(renderContext)
  {
    if (!renderContext?.IsValid()) return ALResult.E_INVALIDARG;

    this._isValid = true;

    return ALResult.S_OK;
  }

  /** @returns {boolean} Whether the query was created. */
  IsValid()
  {
    return this._isValid;
  }

  /** Releases the query. */
  Destroy()
  {
    this._isValid = false;
    super.Destroy();
  }

  /**
   * Starts counting.
   *
   * @returns {number} An `ALResult`.
   */
  Begin()
  {
    if (!this._isValid) return ALResult.E_INVALIDCALL;

    this._isRunning = true;

    return ALResult.S_OK;
  }

  /**
   * Stops counting.
   *
   * ENDING A QUERY THAT NEVER BEGAN IS AN ERROR, which Carbon checks
   * (`cpp:End`) and which is the mispairing this class exists to catch.
   *
   * @returns {number} An `ALResult`.
   */
  End()
  {
    if (!this._isValid) return ALResult.E_INVALIDCALL;
    if (!this._isRunning) return ALResult.E_INVALIDCALL;

    this._isRunning = false;

    return ALResult.S_OK;
  }

  /**
   * How many pixels passed.
   *
   * Carbon's arguments (`Tr2OcclusionQueryALStub.cpp:67`), less the `count`
   * output, which comes back in the result.
   *
   * @param {object} _renderContext The context; the stub reads nothing from it.
   * @param {number} [_waitMode] A `WaitMode`; nothing to wait for here.
   * @returns {object} `{ result, count }`.
   */
  GetPixelCount(_renderContext, _waitMode = Tr2OcclusionQueryAL.WaitMode.DO_NOT_WAIT)
  {
    if (!this._isValid) return { result: ALResult.E_INVALIDCALL, count: 0 };

    return { result: ALResult.S_OK, count: 0 };
  }

  /** @returns {number} A `Tr2ALMemoryType`. */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_VIDEO;
  }


  /**
   * Names the query for a debugger.
   *
   * @param {string} _name The name Carbon would attach; the stub discards it.
   * @returns {number} An `ALResult` value; the stub keeps no name
   *   (`Tr2OcclusionQueryALStub.cpp:81-84`).
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
CjsSchema.decorateField(Tr2OcclusionQueryALStub, "_isValid", type.boolean);
CjsSchema.decorateField(Tr2OcclusionQueryALStub, "_isRunning", type.boolean);
CjsSchema.decorateMethod(Tr2OcclusionQueryALStub, "Create", blue.method);
CjsSchema.decorateMethod(Tr2OcclusionQueryALStub, "IsValid", blue.method);
CjsSchema.decorateMethod(Tr2OcclusionQueryALStub, "Destroy", blue.method);
CjsSchema.decorateMethod(Tr2OcclusionQueryALStub, "Begin", blue.method);
CjsSchema.decorateMethod(Tr2OcclusionQueryALStub, "End", blue.method);
CjsSchema.decorateMethod(Tr2OcclusionQueryALStub, "GetPixelCount", blue.method);
CjsSchema.decorateMethod(Tr2OcclusionQueryALStub, "GetMemoryClass", blue.method);
CjsSchema.decorateMethod(Tr2OcclusionQueryALStub, "SetName", blue.method);
CjsSchema.blue.define(Tr2OcclusionQueryALStub, { className: "Tr2OcclusionQueryALStub", donors: [ "Tr2OcclusionQueryAL" ] });
