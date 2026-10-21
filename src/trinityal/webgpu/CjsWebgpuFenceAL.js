// Source: trinity/trinityal/metal/Tr2FenceALMetal.mm
//   trinity/trinityal/metal/Tr2FenceALMetal.h
//
// A `Tr2FenceAL` for WebGPU, ported from Metal's, which is already a frame
// fence: `PutFence` records the frame being recorded and `IsReached` asks
// whether the device has rendered that frame (`Tr2FenceALMetal.mm:40-62`).
//
// "Rendered" here is SUBMITTED, as `CjsWebgpuRenderContextAL.GetRenderedFrameNumber`
// records: WebGPU orders a later `writeBuffer` after every earlier submit, so
// a region whose frame has been submitted can be rewritten safely. That is
// what `Tr2DynamicRingBuffer` asks a fence.
import { CjsSchema, blue, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult } from "#trinityal";
import { RenderContextALOf } from "../renderContextAL.js";

/** A frame fence: reached once the frame it was put in has been submitted.
 *
 * Carbon: Tr2FenceAL (trinity/trinityal/metal/Tr2FenceALMetal.h:12)
 */
export class CjsWebgpuFenceAL
{
  /** m_frame */
  _frame = 0;

  /** m_isValid */
  _isValid = false;

  /** m_hasBeenPut */
  _hasBeenPut = false;

  /** m_name */
  _name = "";

  /**
   * Metal's `Create` (`mm:19-28`).
   *
   * @param {object} renderContext The primary context, Trinity's or the AL.
   * @returns {number} An `ALResult`.
   */
  Create(renderContext)
  {
    if (!RenderContextALOf(renderContext)?.IsValid()) return ALResult.E_INVALIDARG;

    this._isValid = true;
    this._hasBeenPut = false;

    return ALResult.S_OK;
  }

  /** Metal's `Destroy` (`mm:30-33`). */
  Destroy()
  {
    this._isValid = false;
  }

  /** @returns {boolean} Whether the fence was created. */
  IsValid()
  {
    return this._isValid;
  }

  /**
   * Metal's `PutFence` (`mm:40-51`): remembers the frame being recorded.
   *
   * @param {object} renderContext The context recording the frame.
   * @returns {number} An `ALResult`.
   */
  PutFence(renderContext)
  {
    const al = RenderContextALOf(renderContext);

    if (!this._isValid || !al?.IsValid()) return ALResult.E_FAIL;

    this._frame = al.GetRecordingFrameNumber();
    this._hasBeenPut = true;

    return ALResult.S_OK;
  }

  /**
   * Metal's `IsReached` (`mm:53-64`). Carbon's out-parameter is returned in
   * the stub's `{ result, isReached }` shape.
   *
   * Adapted: Metal compares against frames the GPU has COMPLETED; ours are
   * frames SUBMITTED (GetRenderedFrameNumber), because WebGPU reports
   * completion only through a promise. A later writeBuffer is ordered after
   * every earlier submit, so a submitted frame's region is safe to rewrite.
   *
   * @param {object} renderContext The context whose frames are counted.
   * @returns {{result: number, isReached: boolean}} The answer.
   */
  IsReached(renderContext)
  {
    const al = RenderContextALOf(renderContext);

    if (!this._isValid || !this._hasBeenPut || !al?.IsValid()) return { result: ALResult.E_FAIL, isReached: false };

    return { result: ALResult.S_OK, isReached: al.GetRenderedFrameNumber() >= this._frame };
  }

  /**
   * Metal's `Wait` (`mm:66-69`), which refuses: nothing can block for the GPU.
   *
   * @returns {number} `E_FAIL`.
   */
  Wait()
  {
    return ALResult.E_FAIL;
  }

  /**
   * Metal's `Describe` (`mm:71-75`): the type and the name.
   *
   * @param {object} description The description to fill.
   * @returns {object} The description, filled.
   */
  Describe(description)
  {
    if (!description) return description;

    description.type = "Tr2FenceAL";
    description.name = this._name;

    return description;
  }

  /** @returns {number} A `Tr2ALMemoryType`. */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_VIDEO;
  }

  /**
   * Metal's `SetName` (`mm:77-81`).
   *
   * @param {string} name A debugger name.
   * @returns {number} An `ALResult`.
   */
  SetName(name)
  {
    this._name = String(name ?? "");

    return ALResult.S_OK;
  }
}

// Declared as a call for the reason recorded in Tr2BitmapDimensions.js; the
// backend is on the class name, and `carbon` names the donor.
CjsSchema.decorateField(CjsWebgpuFenceAL, "_frame", type.uint64);
CjsSchema.decorateField(CjsWebgpuFenceAL, "_name", type.string);
CjsSchema.decorateField(CjsWebgpuFenceAL, "_isValid", type.boolean);
CjsSchema.decorateField(CjsWebgpuFenceAL, "_hasBeenPut", type.boolean);
CjsSchema.decorateMethod(CjsWebgpuFenceAL, "Create", blue.method);
CjsSchema.decorateMethod(CjsWebgpuFenceAL, "Destroy", blue.method);
CjsSchema.decorateMethod(CjsWebgpuFenceAL, "IsValid", blue.method);
CjsSchema.decorateMethod(CjsWebgpuFenceAL, "PutFence", blue.method);
CjsSchema.decorateMethod(CjsWebgpuFenceAL, "IsReached", blue.method);
CjsSchema.decorateMethod(CjsWebgpuFenceAL, "Wait", blue.method);
CjsSchema.decorateMethod(CjsWebgpuFenceAL, "Describe", blue.method);
CjsSchema.decorateMethod(CjsWebgpuFenceAL, "GetMemoryClass", blue.method);
CjsSchema.decorateMethod(CjsWebgpuFenceAL, "SetName", blue.method);
CjsSchema.blue.define(CjsWebgpuFenceAL, { className: "CjsWebgpuFenceAL" });
