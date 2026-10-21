import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepSetView.h
// Source: trinity/trinity/RenderJob/TriStepSetView.cpp
import { meta, type, blue } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that installs the view transform for the steps that follow, taken either
 * from an authored view or from a camera updated against the current viewport.
 */
@be.define("TriStepSetView")
@be.mapInterface(TriRenderStep)
@be.exposureChainTo(TriRenderStep)
export class TriStepSetView extends TriRenderStep
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("TriView")
  view = null;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("EveCamera")
  camera = null;

  /** Stores the view and camera the step chooses between at execution time. */
  @blue.method
  @meta.adapted
  __init__(view = null, camera = null)
  {
    this.SetViewCameraParent(view, camera);
  }

  /**
   * Replaces both operands; either may be null, and the view takes precedence
   * when both are set.
   */
  @blue.method
  @meta.adapted
  SetViewCameraParent(view, camera)
  {
    this.view = view ?? null;
    this.camera = camera ?? null;
  }

  /**
   * Sets the renderer's view transform from the view when one is authored;
   * otherwise updates the camera using the render context viewport's aspect
   * ratio (1 when the viewport is missing or has no height) and sets the
   * resulting view matrix (TriStepSetView.cpp:21-33).
   */

  @meta.implemented
  Execute(realTime, simTime, renderContext)
  {
    if (this.view)
    {
      Tr2Renderer.SetViewTransform(this.view.GetTransform());
    }
    else if (this.camera)
    {
      const viewport = renderContext.GetViewport();
      const aspectRatio = viewport?.height ? viewport.width / viewport.height : 1;
      this.camera.Update(simTime, aspectRatio, realTime);
      Tr2Renderer.SetViewTransform(this.camera.GetViewMatrix());
    }
    return TriRenderJob.StepResult.RS_OK;
  }
}
