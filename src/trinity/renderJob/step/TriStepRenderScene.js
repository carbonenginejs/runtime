// Source: trinity/trinity/RenderJob/TriStepRenderScene.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that renders one scene at its point in the job order. */
@meta.define({ className: "TriStepRenderScene", family: "renderJob" })
export class TriStepRenderScene extends TriRenderStep
{

  /** m_scene (ITr2ScenePtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("ITr2Scene")
  scene = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @meta.blue.method
  @meta.implemented
  __init__(scene = null)
  {
    this.scene = scene;
  }

  /**
   * Renders the bound scene through the render context and reports the step complete.
   */
  @meta.blue.method
  @meta.adapted
  Execute(_realTime, _simTime, renderContext)
  {
    this.scene?.Render?.(renderContext);
    return TriRenderStep.Result.RS_OK;
  }

}
