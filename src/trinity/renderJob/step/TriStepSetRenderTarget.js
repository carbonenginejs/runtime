// Source: trinity/trinity/RenderJob/TriStepSetRenderTarget.h
// Source: trinity/trinity/RenderJob/TriStepSetRenderTarget.cpp
import { meta, type, blue } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that binds a render target to slot 0 directly, without touching the
 * render-target stack.
 */
@blue.define("TriStepSetRenderTarget")
@blue.interface(TriRenderStep)
@blue.chainTo(TriRenderStep)
export class TriStepSetRenderTarget extends TriRenderStep
{
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2RenderTarget")
  renderTarget = null;

  /** Stores the render target to bind. */
  @blue.method
  @meta.adapted
  __init__(renderTarget = null)
  {
    this.renderTarget = renderTarget ?? null;
  }

  /**
   * Binds the render target to slot 0; with none set the current binding is left
   * alone rather than cleared.
   */
  @blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    if (this.renderTarget) renderContext.GetEffectStateManager().SetRenderTarget(0, this.renderTarget);
    return TriRenderJob.StepResult.RS_OK;
  }
}
