// Source: trinity/trinity/RenderJob/TriStepPopRenderTarget.h
// Source: trinity/trinity/RenderJob/TriStepPopRenderTarget.cpp
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";


/**
 * Step that pops one slot off the render context's render-target stack, undoing an
 * earlier push.
 */
@type.define({ className: "TriStepPopRenderTarget", family: "renderJob" })
export class TriStepPopRenderTarget extends TriRenderStep
{
  @io.readwrite
  @type.uint32
  slot = 0;

  /** Stores the render-target slot to pop. */
  @carbon.method
  @impl.adapted
  __init__(slot = 0)
  {
    this.slot = Number(slot) >>> 0;
  }

  /**
   * Pops the recorded slot; the matching push must occur earlier in the same job
   * or the job's stack guard reports an underflow.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.PopRenderTarget(this.slot);
    return TriRenderJob.StepResult.RS_OK;
  }
}
