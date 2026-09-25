// Source: trinity/trinity/RenderJob/TriStepGenerateMipMaps.h
// Source: trinity/trinity/RenderJob/TriStepGenerateMipMaps.cpp
import { carbon, impl, edit, type } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/** Step that requests regeneration of a render target's mip chain. */
@type.define({ className: "TriStepGenerateMipMaps", family: "renderJob" })
export class TriStepGenerateMipMaps extends TriRenderStep
{
  @edit.readwrite
  @edit.persist
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
   * Carbon Execute (TriStepGenerateMipMaps.cpp:15-22): regenerate the render
   * target texture's mip chain; with no target set the step is a no-op.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    if (this.renderTarget) this.renderTarget.GetRenderTarget().GenerateMipMaps(renderContext);
    return TriRenderJob.StepResult.RS_OK;
  }
}
