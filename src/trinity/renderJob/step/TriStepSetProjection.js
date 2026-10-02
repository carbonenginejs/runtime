// Source: trinity/trinity/RenderJob/TriStepSetProjection.h
// Source: trinity/trinity/RenderJob/TriStepSetProjection.cpp
import { meta } from "#schema";
import { mat4 } from "#math/mat4";
import { TriProjection } from "../../core/view/TriProjection.js";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/** Step that installs an authored projection for the steps that follow. */
@meta.define({ className: "TriStepSetProjection", family: "renderJob" })
export class TriStepSetProjection extends TriRenderStep
{
  #transform = mat4.create();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("TriProjection")
  projection = null;

  /** Stores the projection this step installs. */
  @meta.blue.method
  @meta.adapted
  __init__(projection = null)
  {
    this.SetProjection(projection);
  }

  /**
   * Replaces the projection; null makes the step a no-op rather than clearing
   * the current projection.
   */
  @meta.blue.method
  @meta.adapted
  SetProjection(projection)
  {
    this.projection = projection ?? null;
  }

  /**
   * Installs the projection on the render context when one is authored, leaving the
   * current projection untouched otherwise.
   */
  @meta.blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    if (this.projection)
    {
      this.projection.GetTransform(this.#transform);
      let fieldOfView;
      switch (this.projection.GetProjectionType())
      {
        case TriProjection.FOV:
          fieldOfView = this.projection.fov;
          break;
        case TriProjection.ORTHO:
          fieldOfView = 1;
          break;
        default:
          fieldOfView = this.#transform[5]
            ? 2 * Math.atan(1 / this.#transform[5])
            : 0;
          break;
      }
      renderContext.SetProjection(this.#transform, fieldOfView);
    }
    return TriRenderJob.StepResult.RS_OK;
  }
}
