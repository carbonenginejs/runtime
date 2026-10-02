// Source: trinity/trinity/RenderJob/TriStepPythonCB.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that invokes a host-supplied callback at its point in the job order. */
@meta.define({ className: "TriStepPythonCB", family: "renderJob" })
export class TriStepPythonCB extends TriRenderStep
{

  /** m_callback (BlueScriptCallback) */
  @meta.type.rawStruct("BlueScriptCallback")
  callback = null;

  /** Carbon method __init__ -> SetCallback (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @meta.blue.method
  @meta.adapted
  __init__(callback = null)
  {
    this.SetCallback(callback);
  }

  /** Carbon method SetCallback (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
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
  @meta.blue.method
  @meta.adapted
  Execute(_realTime, _simTime, renderContext)
  {
    try
    {
      if (typeof this.callback === "function") this.callback();
      else if (this.callback) this.callback.CallVoid();
    }
    catch (error)
    {
      renderContext.AddDiagnostic({ type: "callback-error", step: this, error });
    }
    return TriRenderStep.Result.RS_OK;
  }

}
