// Source: trinity/trinity/RenderJob/TriStepSetVisualizationMode.cpp
import { meta } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that switches a renderer object into a debug visualization mode for the
 * remainder of the frame.
 */
@meta.define({ className: "TriStepSetVisualizationMode", family: "renderJob" })
export class TriStepSetVisualizationMode extends TriRenderStep
{
  @meta.blue.readwrite
  @meta.type.objectRef("ITr2VisualizationModeRenderer")
  object = null;

  @meta.blue.readwrite
  @meta.type.int32
  mode = 0;

  /** Stores the target object and the visualization mode to apply to it. */
  @meta.blue.method
  @meta.adapted
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
   * does not go through the render context.
   */
  @meta.blue.method
  @meta.implemented
  Execute()
  {
    this.object?.SetVisualizationMode?.(this.mode);
    return TriRenderJob.StepResult.RS_OK;
  }
}
