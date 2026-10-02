// Source: trinity/trinity/RenderJob/TriStepUpdate.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that ticks one updateable object with the frame times. */
@meta.define({ className: "TriStepUpdate", family: "renderJob" })
export class TriStepUpdate extends TriRenderStep
{

  /** m_object (ITr2UpdateablePtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("ITr2Updateable")
  object = null;

  /** Carbon method __init__ -> SetUpdateable (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @meta.blue.method
  @meta.implemented
  __init__(object = null)
  {
    this.object = object;
  }

  /**
   * Ticks the bound updateable object with raw frame clocks and relocated context.
   * @param {number} realTime Raw Blue real-time ticks.
   * @param {number} simTime Raw Blue simulation ticks.
   * @param {Tr2RenderContext} renderContext Context supplied by the step executor.
   * @returns {number} Native render-step success result.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Forwards the caller context as a third argument for relocated JavaScript view state; both native clocks remain unchanged.")
  Execute(realTime, simTime, renderContext)
  {
    this.object?.Update(realTime, simTime, renderContext);
    return TriRenderStep.Result.RS_OK;
  }

}
