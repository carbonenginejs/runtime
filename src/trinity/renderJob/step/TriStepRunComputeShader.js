// Source: trinity/trinity/RenderJob/TriStepRunComputeShader.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, edit, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";

/** A render step that dispatches a compute shader over its configured group dimensions. */
@type.define({ className: "TriStepRunComputeShader", family: "renderJob" })
export class TriStepRunComputeShader extends TriRenderStep
{

  /** m_groupDimX (unsigned) [READWRITE] */
  @edit.readwrite
  @type.uint32
  groupDimX = 1;

  /** m_groupDimY (unsigned) [READWRITE] */
  @edit.readwrite
  @type.uint32
  groupDimY = 1;

  /** m_groupDimZ (unsigned) [READWRITE] */
  @edit.readwrite
  @type.uint32
  groupDimZ = 1;

  /** m_effect (Tr2MaterialPtr) [READWRITE] */
  @edit.readwrite
  @type.objectRef("Tr2Material")
  effect = null;

  /** m_indirectionBuffer (ITr2GpuBufferPtr) [READWRITE] */
  @edit.readwrite
  @type.objectRef("ITr2GpuBuffer")
  indirectionBuffer = null;

  /** m_offsetForArgs (uint32_t) [READWRITE] */
  @edit.readwrite
  @type.uint32
  offsetForArgs = 0;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.implemented
  __init__(effect = null, groupDimX = 1, groupDimY = 1, groupDimZ = 1)
  {
    this.effect = effect;
    this.groupDimX = Number(groupDimX) >>> 0;
    this.groupDimY = Number(groupDimY) >>> 0;
    this.groupDimZ = Number(groupDimZ) >>> 0;
  }

  /**
   * Carbon Execute (TriStepRunComputeShader.cpp:37-55): dispatches through
   * Tr2Renderer, indirectly from the provider's buffer when one is bound.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    if (this.indirectionBuffer)
    {
      const buffer = this.indirectionBuffer.GetGpuBuffer(0);
      if (buffer)
      {
        Tr2Renderer.runComputeShaderIndirect(this.effect, buffer, this.offsetForArgs, renderContext);
      }
    }
    else
    {
      Tr2Renderer.runComputeShader(this.effect, this.groupDimX, this.groupDimY, this.groupDimZ, renderContext);
    }
    return TriRenderStep.Result.RS_OK;
  }

}
