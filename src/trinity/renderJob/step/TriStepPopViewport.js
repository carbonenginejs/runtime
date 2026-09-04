import { carbon, impl, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";

// Carbon: RenderJob/TriStepPopViewport.cpp — Execute pops the viewport off the
// render context's ESM stack.

/**
 * Step that pops the render context's viewport stack, restoring the viewport saved by
 * an earlier push.
 */
@type.define({ className: "TriStepPopViewport", family: "renderJob" })
export class TriStepPopViewport extends TriRenderStep
{
  /** Restores the viewport saved by the matching push step. */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.PopViewport();
    return TriRenderJob.StepResult.RS_OK;
  }
}
