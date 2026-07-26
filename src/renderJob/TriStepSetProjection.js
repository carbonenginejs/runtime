// Source: E:\carbonengine\trinity\trinity\RenderJob\TriStepSetProjection.h
// Source: E:\carbonengine\trinity\trinity\RenderJob\TriStepSetProjection.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { TriRenderJob } from "./TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/** Step that installs an authored projection for the steps that follow. */
@type.define({ className: "TriStepSetProjection", family: "renderJob" })
export class TriStepSetProjection extends TriRenderStep
{
  @io.persist
  @type.objectRef("TriProjection")
  projection = null;

  /** Stores the projection this step installs. */
  @carbon.method
  @impl.adapted
  __init__(projection = null)
  {
    this.SetProjection(projection);
  }

  /**
   * Replaces the projection; null makes the step a no-op rather than clearing
   * the current projection.
   */
  @carbon.method
  @impl.adapted
  SetProjection(projection)
  {
    this.projection = projection ?? null;
  }

  /**
   * Installs the projection on the executor when one is authored, leaving the
   * current projection untouched otherwise.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, executor)
  {
    if (this.projection) executor?.SetProjection?.(this.projection);
    return TriRenderJob.StepResult.RS_OK;
  }
}
