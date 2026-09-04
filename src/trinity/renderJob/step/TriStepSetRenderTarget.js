// Source: trinity/trinity/RenderJob/TriStepSetRenderTarget.h
// Source: trinity/trinity/RenderJob/TriStepSetRenderTarget.cpp
import { carbon, impl, io, type } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that binds a render target to slot 0 directly, without touching the
 * render-target stack.
 */
@type.define({ className: "TriStepSetRenderTarget", family: "renderJob" })
export class TriStepSetRenderTarget extends TriRenderStep
{
  @io.persist
  @type.objectRef("Tr2RenderTarget")
  renderTarget = null;

  /** Stores the render target to bind. */
  @carbon.method
  @impl.adapted
  __init__(renderTarget = null)
  {
    this.renderTarget = renderTarget ?? null;
  }

  /**
   * Binds the render target to slot 0; with none set the current binding is left
   * alone rather than cleared.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    if (this.renderTarget) renderContext.GetEffectStateManager().SetRenderTarget(0, this.renderTarget);
    return TriRenderJob.StepResult.RS_OK;
  }
}
