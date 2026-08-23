// Source: trinity/trinity/RenderJob/TriStepEnableWireframeMode.cpp
import { carbon, impl, io, type } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/** Step that turns wireframe rasterization on or off for the steps that follow. */
@type.define({ className: "TriStepEnableWireframeMode", family: "renderJob" })
export class TriStepEnableWireframeMode extends TriRenderStep
{
  @io.readwrite
  @type.boolean
  enableWireframe = false;

  /** Stores the wireframe flag, defaulting to off. */
  @carbon.method
  @impl.adapted
  __init__(value = false)
  {
    this.enableWireframe = !!value;
  }

  /**
   * Forwards the flag to the executor; nothing restores the previous mode, so a
   * matching step is needed to turn wireframe back off.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, executor)
  {
    executor?.SetWireframeRendering?.(this.enableWireframe);
    return TriRenderJob.StepResult.RS_OK;
  }
}
