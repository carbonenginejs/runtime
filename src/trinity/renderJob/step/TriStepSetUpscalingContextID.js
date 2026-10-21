import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepSetUpscalingContextID.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that selects which upscaling context subsequent work resolves against. */
@be.define("TriStepSetUpscalingContextID")
@be.mapInterface(TriRenderStep)
@be.exposureChainTo(TriRenderStep)
export class TriStepSetUpscalingContextID extends TriRenderStep
{

  /** m_upscalingContextID (uint32_t) [READ] */
  @be.mapAttribute(be.READ)
  @type.uint32
  upscalingContextID = 0xffffffff;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.implemented
  __init__(upscalingContextID = 0xffffffff)
  {
    this.upscalingContextID = Number(upscalingContextID) >>> 0;
  }

  /**
   * Selects the upscaling context subsequent steps resolve against.
   */

  @meta.adapted
  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.SetUpscalingContextID(this.upscalingContextID);
    return TriRenderStep.Result.RS_OK;
  }

}
