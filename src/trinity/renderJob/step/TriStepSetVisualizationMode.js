import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepSetVisualizationMode.cpp
import { meta, type, blue } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that switches a renderer object into a debug visualization mode for the
 * remainder of the frame.
 */
@be.define("TriStepSetVisualizationMode")

@be.exposureChainTo(TriRenderStep)
export class TriStepSetVisualizationMode extends TriRenderStep
{
  @be.mapAttribute(be.READWRITE)
  @type.object.ref("ITr2VisualizationModeRenderer")
  object = null;

  @be.mapAttribute(be.READWRITE)
  @type.int32
  mode = 0;

  /** Stores the target object and the visualization mode to apply to it. */
  @be.mapMethodAndWrapOptionalArgs()
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
   * does not go through the render context. Carbon
   * TriStepSetVisualizationMode.cpp:33-41 null-checks only the renderer.
   */

  @meta.implemented
  Execute()
  {
    this.object?.SetVisualizationMode(this.mode);
    return TriRenderJob.StepResult.RS_OK;
  }
}
