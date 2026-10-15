// Source: trinity/trinity/RenderJob/TriStepEnableWireframeMode.cpp
import { meta, type, blue } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/** Step that turns wireframe rasterization on or off for the steps that follow. */
@blue.define("TriStepEnableWireframeMode")
export class TriStepEnableWireframeMode extends TriRenderStep
{
  @blue.readwrite
  @type.boolean
  enableWireframe = false;

  /** Stores the wireframe flag, defaulting to off. */
  @blue.method
  @meta.adapted
  __init__(value = false)
  {
    this.enableWireframe = !!value;
  }

  /**
   * Forwards the flag to the render context; nothing restores the previous mode, so a
   * matching step is needed to turn wireframe back off.
   */
  @blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.SetWireframeRendering(this.enableWireframe);
    return TriRenderJob.StepResult.RS_OK;
  }
}
