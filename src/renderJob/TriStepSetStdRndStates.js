// Source: E:\carbonengine\trinity\trinity\RenderJob\TriStepSetStandardRenderStates.h
// Source: E:\carbonengine\trinity\trinity\RenderJob\TriStepSetStandardRenderStates.cpp
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { TriRenderJob } from "./TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that selects one of Carbon's standard rendering-mode state blocks -
 * opaque, decal, alpha, additive, depth-only, picking and so on - instead of
 * setting states individually.
 */
@type.define({ className: "TriStepSetStdRndStates", family: "renderJob" })
export class TriStepSetStdRndStates extends TriRenderStep
{
  static RenderingMode = Object.freeze({
    RM_ANY: 0,
    RM_OPAQUE: 1,
    RM_DECAL: 2,
    RM_DECAL_NO_DEPTH: 3,
    RM_ALPHA: 4,
    RM_ALPHA_ADDITIVE: 5,
    RM_DEPTH_ONLY: 6,
    RM_PICKING: 7,
    RM_FULLSCREEN: 8,
    RM_SPRITE2D: 9,
    RM_CULL: 10,
    RM_LIGHT: 11,
    RM_ERASE: 12,
    RM_PREPASS_COLOR: 13,
    RM_COUNT: 14
  });

  static RM_ANY = 0;
  static RM_OPAQUE = 1;
  static RM_DECAL = 2;
  static RM_DECAL_NO_DEPTH = 3;
  static RM_ALPHA = 4;
  static RM_ALPHA_ADDITIVE = 5;
  static RM_DEPTH_ONLY = 6;
  static RM_PICKING = 7;
  static RM_FULLSCREEN = 8;
  static RM_SPRITE2D = 9;
  static RM_CULL = 10;
  static RM_LIGHT = 11;
  static RM_ERASE = 12;
  static RM_PREPASS_COLOR = 13;
  static RM_COUNT = 14;

  @io.persist
  @type.int32
  @schema.enum("RenderingMode")
  renderingMode = TriStepSetStdRndStates.RM_OPAQUE;

  /**
   * Sets the rendering mode when one is supplied, otherwise leaves the default
   * opaque mode in place.
   */
  @carbon.method
  @impl.adapted
  __init__(state)
  {
    if (arguments.length && state !== undefined) this.SetState(state);
  }

  /** Sets the rendering mode, silently ignoring values at or above RM_COUNT. */
  SetState(state)
  {
    const value = Number(state) >>> 0;
    if (value < TriStepSetStdRndStates.RM_COUNT)
    {
      this.renderingMode = value;
    }
  }

  /**
   * Asks the executor to apply the standard state block for the selected
   * rendering mode; which states that block contains is the executor's concern.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, executor)
  {
    executor?.ApplyStandardStates?.(this.renderingMode);
    return TriRenderJob.StepResult.RS_OK;
  }
}
