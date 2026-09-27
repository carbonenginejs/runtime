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
import { CjsSchema } from "#schema";
import { ALResult, Tr2ALMemoryType } from "#trinityal";
import { RenderContextALOf } from "../renderContextAL.js";

/** A frame fence: reached once the frame it was put in has been submitted. */
export class CjsWebgpuFenceAL
{
  /** m_frame */
  m_frame = 0;

  /** m_isValid */
  m_isValid = false;

  /** m_hasBeenPut */
  m_hasBeenPut = false;

  /** m_name */
  m_name = "";

  /**
   * Metal's `Create` (`mm:19-28`).
   *
   * @param {object} renderContext The primary context, Trinity's or the AL.
   * @returns {number} An `ALResult`.
   */
  Create(renderContext)
  {
    if (!RenderContextALOf(renderContext)?.IsValid()) return ALResult.E_INVALIDARG;

    this.m_isValid = true;
    this.m_hasBeenPut = false;

    return ALResult.S_OK;
  }

  /** Metal's `Destroy` (`mm:30-33`). */
  Destroy()
  {
    this.m_isValid = false;
  }

  /** @returns {boolean} Whether the fence was created. */
  IsValid()
  {
    return this.m_isValid;
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

    if (!this.m_isValid || !al?.IsValid()) return ALResult.E_FAIL;

    this.m_frame = al.GetRecordingFrameNumber();
    this.m_hasBeenPut = true;

    return ALResult.S_OK;
  }

  /**
   * Metal's `IsReached` (`mm:53-64`). Carbon's out-parameter is returned in
   * the stub's `{ result, isReached }` shape.
   *
   * @param {object} renderContext The context whose frames are counted.
   * @returns {{result: number, isReached: boolean}} The answer.
   */
  IsReached(renderContext)
  {
    const al = RenderContextALOf(renderContext);

    if (!this.m_isValid || !this.m_hasBeenPut || !al?.IsValid()) return { result: ALResult.E_FAIL, isReached: false };

    return { result: ALResult.S_OK, isReached: al.GetRenderedFrameNumber() >= this.m_frame };
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
    this.m_name = String(name ?? "");

    return ALResult.S_OK;
  }
}

// Declared as a call for the reason recorded in Tr2BitmapDimensions.js; the
// backend is on the class name, and `carbon` names the donor.
CjsSchema.define(CjsWebgpuFenceAL, { className: "CjsWebgpuFenceAL", carbon: "Tr2FenceAL" });
