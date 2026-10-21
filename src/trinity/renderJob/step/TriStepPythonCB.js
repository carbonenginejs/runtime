import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepPythonCB.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { CjsScriptCallback } from "#blue";

/** A render step that invokes a host-supplied callback at its point in the job order. */
@be.define("TriStepPythonCB")

@be.exposureChainTo(TriRenderStep)
export class TriStepPythonCB extends TriRenderStep
{

  /** m_callback (BlueScriptCallback) */
  @type.rawStruct("BlueScriptCallback")
  callback = null;

  /** Carbon method __init__ -> SetCallback (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @blue.method
  @meta.adapted
  __init__(callback = null)
  {
    this.SetCallback(callback);
  }

  /**
   * Carbon method SetCallback (MAP_METHOD_AND_WRAP): stores the script
   * callback, wrapping a function at the boundary (CjsScriptCallback.from).
   */
  @blue.method
  @meta.adapted
  SetCallback(callback)
  {
    this.callback = CjsScriptCallback.from(callback);
  }

  /**
   * Invokes the host callback and reports the step complete.
   */
  @blue.method
  @meta.adapted
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
