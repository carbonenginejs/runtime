// Source: trinity/trinity/RenderJob/TriStepRunComputeShader.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that dispatches a compute shader over its configured group dimensions. */
@type.define({ className: "TriStepRunComputeShader", family: "renderJob" })
export class TriStepRunComputeShader extends TriRenderStep
{

  /** m_groupDimX (unsigned) [READWRITE] */
  @io.readwrite
  @type.uint32
  groupDimX = 1;

  /** m_groupDimY (unsigned) [READWRITE] */
  @io.readwrite
  @type.uint32
  groupDimY = 1;

  /** m_groupDimZ (unsigned) [READWRITE] */
  @io.readwrite
  @type.uint32
  groupDimZ = 1;

  /** m_effect (Tr2MaterialPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("Tr2Material")
  effect = null;

  /** m_indirectionBuffer (ITr2GpuBufferPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("ITr2GpuBuffer")
  indirectionBuffer = null;

  /** m_offsetForArgs (uint32_t) [READWRITE] */
  @io.readwrite
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
   * Dispatches the compute shader over its configured group dimensions, indirectly when an argument buffer is bound.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, executor)
  {
    if (this.indirectionBuffer)
    {
      executor?.RunComputeShaderIndirect?.(this.effect, this.indirectionBuffer, this.offsetForArgs);
    }
    else
    {
      executor?.RunComputeShader?.(this.effect, this.groupDimX, this.groupDimY, this.groupDimZ);
    }
    return TriRenderStep.Result.RS_OK;
  }

}
