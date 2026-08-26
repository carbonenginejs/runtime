// Source: trinity/trinity/RenderJob/TriStepPopDepthStencil.h
// Source: trinity/trinity/RenderJob/TriStepPopDepthStencil.cpp
import { carbon, impl, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";


/** Step that pops the executor's depth-stencil stack, undoing an earlier push. */
@type.define({ className: "TriStepPopDepthStencil", family: "renderJob" })
export class TriStepPopDepthStencil extends TriRenderStep
{
  /**
   * Pops the depth-stencil pushed earlier in the job; popping more than was
   * pushed trips the job's stack guard.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, executor)
  {
    executor.PopDepthStencil();
    return TriRenderJob.StepResult.RS_OK;
  }
}
