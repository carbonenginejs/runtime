// Source: E:\carbonengine\trinity\trinity\RenderJob\TriStepSetVisualizationMode.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that switches a renderer object into a debug visualization mode for the
 * remainder of the frame.
 */
@type.define({ className: "TriStepSetVisualizationMode", family: "renderJob" })
export class TriStepSetVisualizationMode extends TriRenderStep
{
  @io.readwrite
  @type.objectRef("ITr2VisualizationModeRenderer")
  object = null;

  @io.readwrite
  @type.int32
  mode = 0;

  /** Stores the target object and the visualization mode to apply to it. */
  @carbon.method
  @impl.adapted
  __init__(object = null, mode = 0)
  {
    this.SetObject(object);
    this.SetVisualizationMode(mode);
  }

  /** Sets the renderer whose visualization mode this step changes. */
  SetObject(object)
  {
    this.object = object ?? null;
  }

  /**
   * Sets the mode value, coerced to a 32-bit integer; its meaning is defined by
   * the target renderer.
   */
  SetVisualizationMode(mode)
  {
    this.mode = Number(mode) | 0;
  }

  /**
   * Pushes the mode straight onto the target object; unlike most steps this one
   * does not go through the executor.
   */
  @carbon.method
  @impl.implemented
  Execute()
  {
    this.object?.SetVisualizationMode?.(this.mode);
    return TriRenderJob.StepResult.RS_OK;
  }
}
