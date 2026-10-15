// Source: trinity/trinity/RenderJob/TriStepPopViewport.h
// Source: trinity/trinity/RenderJob/TriStepPopViewport.cpp
import { meta, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";

// Carbon: RenderJob/TriStepPopViewport.cpp — Execute pops the viewport off the
// render context's ESM stack.

/**
 * Step that pops the render context's viewport stack, restoring the viewport saved by
 * an earlier push.
 */
@blue.define("TriStepPopViewport")
export class TriStepPopViewport extends TriRenderStep
{
  /** Restores the viewport saved by the matching push step. */
  @blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    // The manager owns the viewport save stack (`TriStepPopViewport.cpp:9`).
    renderContext.GetEffectStateManager().PopViewport();
    return TriRenderJob.StepResult.RS_OK;
  }
}
