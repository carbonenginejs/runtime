// Source: trinity/trinity/RenderJob/TriStepPythonCB.h
import { exposure as be } from "#be";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { BlueScriptCallback } from "#blue";

/** A render step that invokes a host-supplied callback at its point in the job order. */
@be.define({
  name: "TriStepPythonCB",
  // TriStepPythonCB_Blue.cpp:11-28, in Carbon's order.
  members: [
    [ be.METHOD, "__init__", be.WRAP_OPTIONAL_ARGS, 1, "SetCallback" ],
    [ be.METHOD, "SetCallback", be.WRAP ]
  ],
  chainTo: TriRenderStep
})

export class TriStepPythonCB extends TriRenderStep
{

  /** m_callback (BlueScriptCallback) */
  @type.scriptCallback
  callback = null;

  /**
   * Carbon method __init__ -> SetCallback (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS).
   *
   * @adapted
   */
  __init__(callback = null)
  {
    this.SetCallback(callback);
  }

  /**
   * Carbon method SetCallback (MAP_METHOD_AND_WRAP): stores the script
   * callback, wrapping a function at the boundary (BlueScriptCallback.from).
   *
   * @adapted
   */
  SetCallback(callback)
  {
    this.callback = BlueScriptCallback.from(callback);
  }

  /**
   * Invokes the host callback and reports the step complete.
   *
   * @adapted
   */

  Execute(_realTime, _simTime, renderContext)
  {
    try
    {
      this.callback?.CallVoid();
    }
    catch (error)
    {
      renderContext.AddDiagnostic({ type: "callback-error", step: this, error });
    }
    return TriRenderStep.Result.RS_OK;
  }

}
