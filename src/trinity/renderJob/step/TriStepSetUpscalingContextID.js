// Source: trinity/trinity/RenderJob/TriStepSetUpscalingContextID.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that selects which upscaling context subsequent work resolves against. */
@type.define({ className: "TriStepSetUpscalingContextID", family: "renderJob" })
export class TriStepSetUpscalingContextID extends TriRenderStep
{

  /** m_upscalingContextID (uint32_t) [READ] */
  @io.read
  @type.uint32
  upscalingContextID = 0xffffffff;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.implemented
  __init__(upscalingContextID = 0xffffffff)
  {
    this.upscalingContextID = Number(upscalingContextID) >>> 0;
  }

  /**
   * Selects the upscaling context subsequent steps resolve against.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, executor)
  {
    executor?.SetUpscalingContextID?.(this.upscalingContextID);
    return TriRenderStep.Result.RS_OK;
  }

}
