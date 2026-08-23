import { carbon, impl, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";

// Carbon: RenderJob/TriStepPushProjection.cpp — Execute pushes the current
// projection (Tr2Renderer::PushProjection).

/** Step that saves the current projection so a later pop can restore it. */
@type.define({ className: "TriStepPushProjection", family: "renderJob" })
export class TriStepPushProjection extends TriRenderStep
{
  /**
   * Pushes the executor's current projection; the value is not supplied by the
   * step, only the intent to save it.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, executor)
  {
    executor?.PushProjection?.();
    return TriRenderJob.StepResult.RS_OK;
  }
}
