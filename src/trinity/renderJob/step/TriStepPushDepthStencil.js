import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepPushDepthStencil.h
// Source: trinity/trinity/RenderJob/TriStepPushDepthStencil.cpp
import { meta, type, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";


/**
 * Step that pushes either a named depth-stencil or the currently bound one onto
 * the render context's depth-stencil stack.
 */
@be.define("TriStepPushDepthStencil")
@be.mapInterface(TriRenderStep)
@be.exposureChainTo(TriRenderStep)
export class TriStepPushDepthStencil extends TriRenderStep
{
  @be.mapAttribute(be.READWRITE)
  @type.boolean
  pushCurrent = false;

  @be.mapAttribute(be.READWRITE)
  @type.rootRef("Tr2DepthStencil")
  depthStencil = null;

  /**
   * Constructing with no arguments selects push-current mode, meaning re-push
   * whatever is bound at execution time; passing an argument - including null -
   * pushes that value instead.
   */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.adapted
  __init__(depthStencil)
  {
    this.pushCurrent = arguments.length === 0;
    this.depthStencil = this.pushCurrent ? null : depthStencil ?? null;
  }

  /**
   * Pushes the depth-stencil in Carbon's order (TriStepPushDepthStencil.cpp:35-48):
   * the authored surface first, else the current one when pushCurrent, else an
   * empty texture. A false from the texture push is RS_FAILED. Every push needs
   * a matching pop in the same job or the job's stack guard unwinds it.
   */

  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    const esm = renderContext.GetEffectStateManager();
    if (this.depthStencil)
    {
      return esm.PushDepthStencilBuffer__TextureAL(this.depthStencil) ? TriRenderJob.StepResult.RS_OK : TriRenderJob.StepResult.RS_FAILED;
    }
    if (this.pushCurrent)
    {
      esm.PushDepthStencilBuffer__Current();
      return TriRenderJob.StepResult.RS_OK;
    }
    esm.PushDepthStencilBuffer__TextureAL(null);
    return TriRenderJob.StepResult.RS_OK;
  }
}
