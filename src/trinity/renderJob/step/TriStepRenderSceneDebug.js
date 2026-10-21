import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepRenderSceneDebug.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that draws a scene through its debug representation rather than its normal path. */
@be.define("TriStepRenderSceneDebug")
@be.mapInterface(TriRenderStep)
@be.exposureChainTo(TriRenderStep)
export class TriStepRenderSceneDebug extends TriRenderStep
{

  /** m_scene (ITr2ScenePtr) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.rootRef("ITr2Scene")
  scene = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.implemented
  __init__(scene = null)
  {
    this.scene = scene;
  }

  /**
   * Renders the bound scene through its debug representation and reports the step complete.
   */

  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    this.scene?.RenderDebugInfo(renderContext);
    return TriRenderStep.Result.RS_OK;
  }

}
