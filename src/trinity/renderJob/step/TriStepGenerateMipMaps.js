// Source: trinity/trinity/RenderJob/TriStepGenerateMipMaps.h
// Source: trinity/trinity/RenderJob/TriStepGenerateMipMaps.cpp
import { meta } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/** Step that requests regeneration of a render target's mip chain. */
@meta.define({ className: "TriStepGenerateMipMaps", family: "renderJob" })
export class TriStepGenerateMipMaps extends TriRenderStep
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2RenderTarget")
  renderTarget = null;

  /** Stores the render target whose mip chain is regenerated. */
  @meta.blue.method
  @meta.adapted
  __init__(renderTarget = null)
  {
    this.renderTarget = renderTarget ?? null;
  }

  /**
   * Carbon Execute (TriStepGenerateMipMaps.cpp:15-22): regenerate the render
   * target texture's mip chain; with no target set the step is a no-op.
   */
  @meta.blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    if (this.renderTarget) this.renderTarget.GetRenderTarget().GenerateMipMaps(renderContext);
    return TriRenderJob.StepResult.RS_OK;
  }
}
