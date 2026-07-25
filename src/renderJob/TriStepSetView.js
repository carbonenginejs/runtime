// Source: E:\carbonengine\trinity\trinity\RenderJob\TriStepSetView.h
// Source: E:\carbonengine\trinity\trinity\RenderJob\TriStepSetView.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { TriRenderJob } from "./TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


@type.define({ className: "TriStepSetView", family: "renderJob" })
export class TriStepSetView extends TriRenderStep
{
  @io.persist
  @type.objectRef("TriView")
  view = null;

  @io.persist
  @type.objectRef("EveCamera")
  camera = null;

  @carbon.method
  @impl.adapted
  __init__(view = null, camera = null)
  {
    this.SetViewCameraParent(view, camera);
  }

  @carbon.method
  @impl.adapted
  SetViewCameraParent(view, camera)
  {
    this.view = view ?? null;
    this.camera = camera ?? null;
  }

  @carbon.method
  @impl.implemented
  Execute(realTime, simTime, executor)
  {
    if (this.view)
    {
      executor?.SetViewTransform?.(TriStepSetView.#getTransform(this.view), this.view);
    }
    else if (this.camera)
    {
      const viewport = executor?.GetViewport?.();
      const aspectRatio = viewport?.height ? viewport.width / viewport.height : 1;
      this.camera.Update?.(simTime, aspectRatio, realTime);
      const viewMatrix = this.camera.GetViewMatrix?.() ?? this.camera.viewMatrix ?? null;
      executor?.SetViewTransform?.(TriStepSetView.#getTransform(viewMatrix), this.camera);
    }
    return TriRenderJob.StepResult.RS_OK;
  }

  static #getTransform(value)
  {
    return value?.GetTransform?.() ?? value?.transform ?? value ?? null;
  }
}
