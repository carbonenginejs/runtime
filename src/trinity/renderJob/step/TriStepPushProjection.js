// Source: trinity/trinity/RenderJob/TriStepPushProjection.h
// Source: trinity/trinity/RenderJob/TriStepPushProjection.cpp
import { meta, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";

// Carbon: RenderJob/TriStepPushProjection.cpp — Execute pushes the current
// projection (Tr2Renderer::PushProjection).

/** Step that saves the current projection so a later pop can restore it. */
@blue.define("TriStepPushProjection")
@blue.interface(TriRenderStep)
@blue.chainTo(TriRenderStep)
export class TriStepPushProjection extends TriRenderStep
{
  /**
   * Pushes the render context's current projection; the value is not supplied by the
   * step, only the intent to save it.
   */
  @blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.PushProjection();
    return TriRenderJob.StepResult.RS_OK;
  }
}
