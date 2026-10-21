import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepEnableWireframeMode.cpp
import { meta, type, blue } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/** Step that turns wireframe rasterization on or off for the steps that follow. */
@be.define("TriStepEnableWireframeMode")

@be.exposureChainTo(TriRenderStep)
export class TriStepEnableWireframeMode extends TriRenderStep
{
  @be.mapAttribute(be.READWRITE)
  @type.boolean
  enableWireframe = false;

  /** Stores the wireframe flag, defaulting to off. */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.adapted
  __init__(value = false)
  {
    this.enableWireframe = !!value;
  }

  /**
   * Forwards the flag to the render context; nothing restores the previous mode, so a
   * matching step is needed to turn wireframe back off.
   */

  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.SetWireframeRendering(this.enableWireframe);
    return TriRenderJob.StepResult.RS_OK;
  }
}
