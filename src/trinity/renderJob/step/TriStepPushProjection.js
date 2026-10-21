import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepPushProjection.h
// Source: trinity/trinity/RenderJob/TriStepPushProjection.cpp
import { meta, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";

// Carbon: RenderJob/TriStepPushProjection.cpp — Execute pushes the current
// projection (Tr2Renderer::PushProjection).

/** Step that saves the current projection so a later pop can restore it. */
@be.define("TriStepPushProjection")
@be.mapInterface(TriRenderStep)
@be.exposureChainTo(TriRenderStep)
export class TriStepPushProjection extends TriRenderStep
{
  /**
   * Pushes the render context's current projection; the value is not supplied by the
   * step, only the intent to save it.
   */

  @meta.implemented
  Execute(_realTime, _simTime, _renderContext)
  {
    // TriStepPushProjection.cpp:9.
    Tr2Renderer.PushProjection();
    return TriRenderJob.StepResult.RS_OK;
  }
}
