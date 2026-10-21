import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepUpdate.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that ticks one updateable object with the frame times. */
@be.define("TriStepUpdate")

@be.exposureChainTo(TriRenderStep)
export class TriStepUpdate extends TriRenderStep
{

  /** m_object (ITr2UpdateablePtr) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.rootRef("ITr2Updateable")
  object = null;

  /** Carbon method __init__ -> SetUpdateable (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.implemented
  __init__(object = null)
  {
    this.object = object;
  }

  /**
   * Ticks the bound updateable object with the raw frame clocks
   * (TriStepUpdate.cpp:19-26); the render context is not forwarded.
   *
   * @param {number} realTime Raw Blue real-time ticks.
   * @param {number} simTime Raw Blue simulation ticks.
   * @param {Tr2RenderContext} _renderContext Context supplied by the step executor; unused, as in Carbon.
   * @returns {number} Native render-step success result.
   */

  @meta.implemented
  Execute(realTime, simTime, _renderContext)
  {
    this.object?.Update(realTime, simTime);
    return TriRenderStep.Result.RS_OK;
  }

}
