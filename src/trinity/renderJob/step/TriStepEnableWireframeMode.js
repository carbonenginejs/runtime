// Source: trinity/trinity/RenderJob/TriStepEnableWireframeMode.cpp
import { meta } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/** Step that turns wireframe rasterization on or off for the steps that follow. */
@meta.define({ className: "TriStepEnableWireframeMode", family: "renderJob" })
export class TriStepEnableWireframeMode extends TriRenderStep
{
  @meta.blue.readwrite
  @meta.type.boolean
  enableWireframe = false;

  /** Stores the wireframe flag, defaulting to off. */
  @meta.blue.method
  @meta.adapted
  __init__(value = false)
  {
    this.enableWireframe = !!value;
  }

  /**
   * Forwards the flag to the render context; nothing restores the previous mode, so a
   * matching step is needed to turn wireframe back off.
   */
  @meta.blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.SetWireframeRendering(this.enableWireframe);
    return TriRenderJob.StepResult.RS_OK;
  }
}
