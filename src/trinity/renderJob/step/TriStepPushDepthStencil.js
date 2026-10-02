// Source: trinity/trinity/RenderJob/TriStepPushDepthStencil.h
// Source: trinity/trinity/RenderJob/TriStepPushDepthStencil.cpp
import { meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";


/**
 * Step that pushes either a named depth-stencil or the currently bound one onto
 * the render context's depth-stencil stack.
 */
@meta.define({ className: "TriStepPushDepthStencil", family: "renderJob" })
export class TriStepPushDepthStencil extends TriRenderStep
{
  @meta.blue.readwrite
  @meta.type.boolean
  pushCurrent = false;

  @meta.blue.readwrite
  @meta.type.objectRef("Tr2DepthStencil")
  depthStencil = null;

  /**
   * Constructing with no arguments selects push-current mode, meaning re-push
   * whatever is bound at execution time; passing an argument - including null -
   * pushes that value instead.
   */
  @meta.blue.method
  @meta.adapted
  __init__(depthStencil)
  {
    this.pushCurrent = arguments.length === 0;
    this.depthStencil = this.pushCurrent ? null : depthStencil ?? null;
  }

  /**
   * Pushes the depth-stencil, signalling push-current mode by passing undefined;
   * an explicit false from the render context is RS_FAILED. Every push needs a
   * matching pop in the same job or the job's stack guard unwinds it.
   */
  @meta.blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    const accepted = renderContext.GetEffectStateManager().PushDepthStencilBuffer(this.pushCurrent ? undefined : this.depthStencil);
    return accepted === false ? TriRenderJob.StepResult.RS_FAILED : TriRenderJob.StepResult.RS_OK;
  }
}
