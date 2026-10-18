// Source: trinity/trinity/RenderJob/TriStepSetProjection.h
// Source: trinity/trinity/RenderJob/TriStepSetProjection.cpp
import { meta, type, blue } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/** Step that installs an authored projection for the steps that follow. */
@blue.define("TriStepSetProjection")
@blue.interface(TriRenderStep)
@blue.chainTo(TriRenderStep)
export class TriStepSetProjection extends TriRenderStep
{
  @blue.readwrite
  @blue.persist
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
  @blue.method
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
