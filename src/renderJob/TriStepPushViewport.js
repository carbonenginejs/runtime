import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "./TriRenderJob.js";

// Carbon: RenderJob/TriStepPushViewport.cpp — Execute pushes the current
// viewport onto the render context's ESM stack.
/** Step that saves the current viewport so a later pop can restore it. */
@type.define({ className: "TriStepPushViewport", family: "renderJob" })
export class TriStepPushViewport extends TriRenderStep
{
  /**
   * Pushes the executor's current viewport; the value is not supplied by the
   * step, only the intent to save it.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, executor)
  {
    executor?.PushViewport?.();
    return TriRenderJob.StepResult.RS_OK;
  }
}
