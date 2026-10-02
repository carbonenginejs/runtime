import { meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";

// Carbon: RenderJob/TriStepPopViewport.cpp — Execute pops the viewport off the
// render context's ESM stack.

/**
 * Step that pops the render context's viewport stack, restoring the viewport saved by
 * an earlier push.
 */
@meta.define({ className: "TriStepPopViewport", family: "renderJob" })
export class TriStepPopViewport extends TriRenderStep
{
  /** Restores the viewport saved by the matching push step. */
  @meta.blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    // The manager owns the viewport save stack (`TriStepPopViewport.cpp:9`).
    renderContext.GetEffectStateManager().PopViewport();
    return TriRenderJob.StepResult.RS_OK;
  }
}
