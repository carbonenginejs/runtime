// Source: trinity/trinity/RenderJob/TriStepPopProjection.h
// Source: trinity/trinity/RenderJob/TriStepPopProjection.cpp
import { meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";

// Carbon: RenderJob/TriStepPopProjection.cpp — Execute pops the projection
// (Tr2Renderer::PopProjection).

/**
 * Step that pops the render context's projection stack, restoring the projection saved
 * by an earlier push.
 */
@meta.define({ className: "TriStepPopProjection", family: "renderJob" })
export class TriStepPopProjection extends TriRenderStep
{
  /** Restores the projection saved by the matching push step. */
  @meta.blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.PopProjection();
    return TriRenderJob.StepResult.RS_OK;
  }
}
