import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepSetProjection.h
// Source: trinity/trinity/RenderJob/TriStepSetProjection.cpp
import { meta, type, blue } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/** Step that installs an authored projection for the steps that follow. */
@be.define("TriStepSetProjection")
@be.mapInterface(TriRenderStep)
@be.exposureChainTo(TriRenderStep)
export class TriStepSetProjection extends TriRenderStep
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("TriProjection")
  projection = null;

  /** Stores the projection this step installs. */
  @blue.method
  @meta.adapted
  __init__(projection = null)
  {
    this.SetProjection(projection);
  }

  /**
   * Replaces the projection; null makes the step a no-op rather than clearing
   * the current projection.
   */
  @blue.method
  @meta.adapted
  SetProjection(projection)
  {
    this.projection = projection ?? null;
  }

  /**
   * Sets the authored projection on the renderer, leaving the current
   * projection untouched when there is none (TriStepSetProjection.cpp:20-27).
   */

  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    if (this.projection)
    {
      this.projection.SetProjection__RenderContext(renderContext);
    }
    return TriRenderJob.StepResult.RS_OK;
  }
}
