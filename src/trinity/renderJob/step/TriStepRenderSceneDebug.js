// Source: trinity/trinity/RenderJob/TriStepRenderSceneDebug.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that draws a scene through its debug representation rather than its normal path. */
@type.define({ className: "TriStepRenderSceneDebug", family: "renderJob" })
export class TriStepRenderSceneDebug extends TriRenderStep
{

  /** m_scene (ITr2ScenePtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("ITr2Scene")
  scene = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.implemented
  __init__(scene = null)
  {
    this.scene = scene;
  }

  /**
   * Renders the bound scene through its debug representation and reports the step complete.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, renderContext)
  {
    this.scene?.RenderDebugInfo?.(renderContext);
    return TriRenderStep.Result.RS_OK;
  }

}
