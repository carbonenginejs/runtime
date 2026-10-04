// Source: trinity/trinity/RenderJob/TriStepSetView.h
// Source: trinity/trinity/RenderJob/TriStepSetView.cpp
import { meta } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that installs the view transform for the steps that follow, taken either
 * from an authored view or from a camera updated against the current viewport.
 */
@meta.define({ className: "TriStepSetView", family: "renderJob" })
export class TriStepSetView extends TriRenderStep
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("TriView")
  view = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveCamera")
  camera = null;

  /** Stores the view and camera the step chooses between at execution time. */
  @meta.blue.method
  @meta.adapted
  __init__(view = null, camera = null)
  {
    this.SetViewCameraParent(view, camera);
  }

  /**
   * Replaces both operands; either may be null, and the view takes precedence
   * when both are set.
   */
  @meta.blue.method
  @meta.adapted
  SetViewCameraParent(view, camera)
  {
    this.view = view ?? null;
    this.camera = camera ?? null;
  }

  /**
   * Sets the view transform from the view when one is authored; otherwise
   * updates the camera using the render context viewport's aspect ratio (1 when the
   * viewport is missing or has no height) and sets the resulting view matrix.
   * The second argument to SetViewTransform identifies the source object the
   * render context should associate with the transform.
   */
  @meta.blue.method
  @meta.implemented
  Execute(realTime, simTime, renderContext)
  {
    if (this.view)
    {
      renderContext.SetViewTransform(this.view.GetTransform(), this.view);
    }
    else if (this.camera)
    {
      const viewport = renderContext.GetViewport();
      const aspectRatio = viewport?.height ? viewport.width / viewport.height : 1;
      this.camera.Update(simTime, aspectRatio, realTime);
      renderContext.SetViewTransform(this.camera.GetViewMatrix(), this.camera);
    }
    return TriRenderJob.StepResult.RS_OK;
  }
}
