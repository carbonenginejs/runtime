import { carbon, impl, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";

// Carbon: RenderJob/TriStepPushViewTransform.cpp — Execute pushes the current
// view transform (Tr2Renderer::PushViewTransform).

/** Step that saves the current view transform so a later pop can restore it. */
@type.define({ className: "TriStepPushViewTransform", family: "renderJob" })
export class TriStepPushViewTransform extends TriRenderStep
{
  /**
   * Pushes the executor's current view transform; the value is not supplied by
   * the step, only the intent to save it.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, executor)
  {
    executor?.PushViewTransform?.();
    return TriRenderJob.StepResult.RS_OK;
  }
}
