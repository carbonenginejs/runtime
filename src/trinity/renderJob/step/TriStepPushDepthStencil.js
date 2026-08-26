// Source: trinity/trinity/RenderJob/TriStepPushDepthStencil.h
// Source: trinity/trinity/RenderJob/TriStepPushDepthStencil.cpp
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";


/**
 * Step that pushes either a named depth-stencil or the currently bound one onto
 * the executor's depth-stencil stack.
 */
@type.define({ className: "TriStepPushDepthStencil", family: "renderJob" })
export class TriStepPushDepthStencil extends TriRenderStep
{
  @io.readwrite
  @type.boolean
  pushCurrent = false;

  @io.readwrite
  @type.objectRef("Tr2DepthStencil")
  depthStencil = null;

  /**
   * Constructing with no arguments selects push-current mode, meaning re-push
   * whatever is bound at execution time; passing an argument - including null -
   * pushes that value instead.
   */
  @carbon.method
  @impl.adapted
  __init__(depthStencil)
  {
    this.pushCurrent = arguments.length === 0;
    this.depthStencil = this.pushCurrent ? null : depthStencil ?? null;
  }

  /**
   * Pushes the depth-stencil, signalling push-current mode by passing undefined;
   * an explicit false from the executor is RS_FAILED. Every push needs a
   * matching pop in the same job or the job's stack guard unwinds it.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, executor)
  {
    const accepted = executor.PushDepthStencil(this.pushCurrent ? undefined : this.depthStencil);
    return accepted === false ? TriRenderJob.StepResult.RS_FAILED : TriRenderJob.StepResult.RS_OK;
  }
}
