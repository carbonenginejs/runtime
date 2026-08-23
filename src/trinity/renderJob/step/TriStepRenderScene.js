// Source: trinity/trinity/RenderJob/TriStepRenderScene.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that renders one scene at its point in the job order. */
@type.define({ className: "TriStepRenderScene", family: "renderJob" })
export class TriStepRenderScene extends TriRenderStep
{

  /** m_scene (ITr2ScenePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITr2Scene")
  scene = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.implemented
  __init__(scene = null)
  {
    this.scene = scene;
  }

  /**
   * Renders the bound scene through the executor and reports the step complete.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, executor)
  {
    this.scene?.Render?.(executor);
    return TriRenderStep.Result.RS_OK;
  }

}
