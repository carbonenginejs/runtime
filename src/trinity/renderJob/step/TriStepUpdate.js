// Source: trinity/trinity/RenderJob/TriStepUpdate.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, edit, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that ticks one updateable object with the frame times. */
@type.define({ className: "TriStepUpdate", family: "renderJob" })
export class TriStepUpdate extends TriRenderStep
{

  /** m_object (ITr2UpdateablePtr) [READWRITE] */
  @edit.readwrite
  @type.objectRef("ITr2Updateable")
  object = null;

  /** Carbon method __init__ -> SetUpdateable (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.adapted
  @impl.reason("Forwards the caller context as a third argument for relocated JavaScript view state; both native clocks remain unchanged.")
  Execute(realTime, simTime, renderContext)
  {
    this.object?.Update(realTime, simTime, renderContext);
    return TriRenderStep.Result.RS_OK;
  }

}
