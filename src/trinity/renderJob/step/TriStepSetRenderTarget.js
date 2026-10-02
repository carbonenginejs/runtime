// Source: trinity/trinity/RenderJob/TriStepSetRenderTarget.h
// Source: trinity/trinity/RenderJob/TriStepSetRenderTarget.cpp
import { meta } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that binds a render target to slot 0 directly, without touching the
 * render-target stack.
 */
@meta.define({ className: "TriStepSetRenderTarget", family: "renderJob" })
export class TriStepSetRenderTarget extends TriRenderStep
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2RenderTarget")
  renderTarget = null;

  /** Stores the render target to bind. */
  @meta.blue.method
  @meta.adapted
  __init__(renderTarget = null)
  {
    this.renderTarget = renderTarget ?? null;
  }

  /**
   * Binds the render target to slot 0; with none set the current binding is left
   * alone rather than cleared.
   */
  @meta.blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    if (this.renderTarget) renderContext.GetEffectStateManager().SetRenderTarget(0, this.renderTarget);
    return TriRenderJob.StepResult.RS_OK;
  }
}
