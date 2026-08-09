import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";

// Carbon: RenderJob/TriStepPopViewTransform.cpp — Execute pops the view
// transform (Tr2Renderer::PopViewTransform).

/**
 * Step that pops the executor's view-transform stack, restoring the view saved
 * by an earlier push.
 */
@type.define({ className: "TriStepPopViewTransform", family: "renderJob" })
export class TriStepPopViewTransform extends TriRenderStep
{
  /** Restores the view transform saved by the matching push step. */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, executor)
  {
    executor?.PopViewTransform?.();
    return TriRenderJob.StepResult.RS_OK;
  }
}
