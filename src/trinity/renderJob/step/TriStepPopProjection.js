import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepPopProjection.h
// Source: trinity/trinity/RenderJob/TriStepPopProjection.cpp
import { meta, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";

// Carbon: RenderJob/TriStepPopProjection.cpp — Execute pops the projection
// (Tr2Renderer::PopProjection).

/**
 * Step that pops the render context's projection stack, restoring the projection saved
 * by an earlier push.
 */
@be.define("TriStepPopProjection")
@be.mapInterface(TriRenderStep)
@be.exposureChainTo(TriRenderStep)
export class TriStepPopProjection extends TriRenderStep
{
  /** Restores the projection saved by the matching push step. */
  @blue.method
  @meta.implemented
  Execute(_realTime, _simTime, _renderContext)
  {
    // TriStepPopProjection.cpp:9.
    Tr2Renderer.PopProjection();
    return TriRenderJob.StepResult.RS_OK;
  }
}
