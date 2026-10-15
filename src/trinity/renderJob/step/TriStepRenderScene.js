// Source: trinity/trinity/RenderJob/TriStepRenderScene.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that renders one scene at its point in the job order. */
@blue.define("TriStepRenderScene")
@blue.interface(TriRenderStep)
@blue.chainTo(TriRenderStep)
export class TriStepRenderScene extends TriRenderStep
{

  /** m_scene (ITr2ScenePtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("ITr2Scene")
  scene = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @blue.method
  @meta.implemented
  __init__(scene = null)
  {
    this.scene = scene;
  }

  /**
   * Renders a present scene directly and reports the step complete.
   * Carbon TriStepRenderScene.cpp:19-26 retains the nullable scene branch.
   */
  @blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    this.scene?.Render(renderContext);
    return TriRenderStep.Result.RS_OK;
  }

}
