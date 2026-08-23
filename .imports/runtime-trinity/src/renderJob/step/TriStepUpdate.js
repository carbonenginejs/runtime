// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/RenderJob/TriStepUpdate.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that ticks one updateable object with the frame times. */
@type.define({ className: "TriStepUpdate", family: "renderJob" })
export class TriStepUpdate extends TriRenderStep
{

  /** m_object (ITr2UpdateablePtr) [READWRITE] */
  @io.readwrite
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
   * Ticks the bound updateable object with the frame times.
   */
  @carbon.method
  @impl.implemented
  Execute(realTime, simTime, _executor)
  {
    this.object?.Update?.(realTime, simTime);
    return TriRenderStep.Result.RS_OK;
  }

}
