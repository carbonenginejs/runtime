// Source: trinity/trinity/RenderJob/TriStepSetView.h
// Source: trinity/trinity/RenderJob/TriStepSetView.cpp
import { carbon, impl, io, type } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that installs the view transform for the steps that follow, taken either
 * from an authored view or from a camera updated against the current viewport.
 */
@type.define({ className: "TriStepSetView", family: "renderJob" })
export class TriStepSetView extends TriRenderStep
{
  @io.persist
  @type.objectRef("TriView")
  view = null;

  @io.persist
  @type.objectRef("EveCamera")
  camera = null;

  /** Stores the view and camera the step chooses between at execution time. */
  @carbon.method
  @impl.adapted
  __init__(view = null, camera = null)
  {
    this.SetViewCameraParent(view, camera);
  }

  /**
   * Replaces both operands; either may be null, and the view takes precedence
   * when both are set.
   */
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.implemented
  Execute(realTime, simTime, renderContext)
  {
    if (this.view)
    {
      renderContext.SetViewTransform(TriStepSetView.#getTransform(this.view), this.view);
    }
    else if (this.camera)
    {
      const viewport = renderContext.GetViewport();
      const aspectRatio = viewport?.height ? viewport.width / viewport.height : 1;
      this.camera.Update(simTime, aspectRatio, realTime);
      const viewMatrix = this.camera.GetViewMatrix?.() ?? this.camera.viewMatrix ?? null;
      renderContext.SetViewTransform(TriStepSetView.#getTransform(viewMatrix), this.camera);
    }
    return TriRenderJob.StepResult.RS_OK;
  }

  /**
   * Unwraps a transform from a GetTransform() accessor or a transform property,
   * falling back to the value itself when it already is the matrix.
   */
  static #getTransform(value)
  {
    return value?.GetTransform?.() ?? value?.transform ?? value ?? null;
  }
}
