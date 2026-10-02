// Source: trinity/trinity/RenderJob/TriStepSetUpscalingContextID.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that selects which upscaling context subsequent work resolves against. */
@meta.define({ className: "TriStepSetUpscalingContextID", family: "renderJob" })
export class TriStepSetUpscalingContextID extends TriRenderStep
{

  /** m_upscalingContextID (uint32_t) [READ] */
  @meta.blue.read
  @meta.type.uint32
  upscalingContextID = 0xffffffff;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @meta.blue.method
  @meta.implemented
  __init__(upscalingContextID = 0xffffffff)
  {
    this.upscalingContextID = Number(upscalingContextID) >>> 0;
  }

  /**
   * Selects the upscaling context subsequent steps resolve against.
   */
  @meta.blue.method
  @meta.adapted
  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.SetUpscalingContextID(this.upscalingContextID);
    return TriRenderStep.Result.RS_OK;
  }

}
