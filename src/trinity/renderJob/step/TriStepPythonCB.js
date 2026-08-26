// Source: trinity/trinity/RenderJob/TriStepPythonCB.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that invokes a host-supplied callback at its point in the job order. */
@type.define({ className: "TriStepPythonCB", family: "renderJob" })
export class TriStepPythonCB extends TriRenderStep
{

  /** m_callback (BlueScriptCallback) */
  @type.rawStruct("BlueScriptCallback")
  callback = null;

  /** Carbon method __init__ -> SetCallback (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.adapted
  __init__(callback = null)
  {
    this.SetCallback(callback);
  }

  /** Carbon method SetCallback (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  SetCallback(callback)
  {
    if (callback != null && typeof callback !== "function" && typeof callback.CallVoid !== "function")
    {
      throw new TypeError("callback must be a function, callback object, or null");
    }
    this.callback = callback;
  }

  /**
   * Invokes the host callback and reports the step complete.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, executor)
  {
    try
    {
      if (typeof this.callback === "function") this.callback();
      else if (this.callback) this.callback.CallVoid();
    }
    catch (error)
    {
      executor.AddDiagnostic({ type: "callback-error", step: this, error });
    }
    return TriRenderStep.Result.RS_OK;
  }

}
