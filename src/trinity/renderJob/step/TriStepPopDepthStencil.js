// Source: trinity/trinity/RenderJob/TriStepPopDepthStencil.h
// Source: trinity/trinity/RenderJob/TriStepPopDepthStencil.cpp
import { meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";


/** Step that pops the render context's depth-stencil stack, undoing an earlier push. */
@meta.define({ className: "TriStepPopDepthStencil", family: "renderJob" })
export class TriStepPopDepthStencil extends TriRenderStep
{
  /**
   * Pops the depth-stencil pushed earlier in the job; popping more than was
   * pushed trips the job's stack guard.
   */
  @meta.blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.GetEffectStateManager().PopDepthStencilBuffer();
    return TriRenderJob.StepResult.RS_OK;
  }
}
