// Source: trinity/trinity/RenderJob/TriStepGenerateMipMaps.h
// Source: trinity/trinity/RenderJob/TriStepGenerateMipMaps.cpp
import { carbon, impl, io, type } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/** Step that requests regeneration of a render target's mip chain. */
@type.define({ className: "TriStepGenerateMipMaps", family: "renderJob" })
export class TriStepGenerateMipMaps extends TriRenderStep
{
  @io.persist
  @type.objectRef("Tr2RenderTarget")
  renderTarget = null;

  /** Stores the render target whose mip chain is regenerated. */
  @carbon.method
  @impl.adapted
  __init__(renderTarget = null)
  {
    this.renderTarget = renderTarget ?? null;
  }

  /**
   * Asks the executor to regenerate the target's mip maps; with no target set
   * the step is a no-op.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, executor)
  {
    if (this.renderTarget) executor?.GenerateMipMaps?.(this.renderTarget);
    return TriRenderJob.StepResult.RS_OK;
  }
}
