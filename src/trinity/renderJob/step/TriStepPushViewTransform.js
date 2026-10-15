// Source: trinity/trinity/RenderJob/TriStepPushViewTransform.h
// Source: trinity/trinity/RenderJob/TriStepPushViewTransform.cpp
import { meta, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";

// Carbon: RenderJob/TriStepPushViewTransform.cpp — Execute pushes the current
// view transform (Tr2Renderer::PushViewTransform).

/** Step that saves the current view transform so a later pop can restore it. */
@blue.define("TriStepPushViewTransform")
@blue.interface(TriRenderStep)
@blue.chainTo(TriRenderStep)
export class TriStepPushViewTransform extends TriRenderStep
{
  /**
   * Pushes the render context's current view transform; the value is not supplied by
   * the step, only the intent to save it.
   */
  @blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.PushViewTransform();
    return TriRenderJob.StepResult.RS_OK;
  }
}
