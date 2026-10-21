import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepGenerateMipMaps.h
// Source: trinity/trinity/RenderJob/TriStepGenerateMipMaps.cpp
import { meta, type, blue } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/** Step that requests regeneration of a render target's mip chain. */
@be.define("TriStepGenerateMipMaps")
@be.mapInterface(TriRenderStep)
@be.exposureChainTo(TriRenderStep)
export class TriStepGenerateMipMaps extends TriRenderStep
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("Tr2RenderTarget")
  renderTarget = null;

  /** Stores the render target whose mip chain is regenerated. */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.adapted
  __init__(renderTarget = null)
  {
    this.renderTarget = renderTarget ?? null;
  }

  /**
   * Carbon Execute (TriStepGenerateMipMaps.cpp:15-22): regenerate the render
   * target texture's mip chain; with no target set the step is a no-op.
   */
  @blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    if (this.renderTarget) this.renderTarget.GetRenderTarget().GenerateMipMaps(renderContext);
    return TriRenderJob.StepResult.RS_OK;
  }
}
