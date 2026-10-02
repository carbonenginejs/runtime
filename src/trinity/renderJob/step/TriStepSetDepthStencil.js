// Source: trinity/trinity/RenderJob/TriStepSetDepthStencil.h
// Source: trinity/trinity/RenderJob/TriStepSetDepthStencil.cpp
import { meta } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that binds a depth-stencil directly, without touching the depth-stencil
 * stack.
 */
@meta.define({ className: "TriStepSetDepthStencil", family: "renderJob" })
export class TriStepSetDepthStencil extends TriRenderStep
{
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2DepthStencil")
  depthStencil = null;

  /** Stores the depth-stencil to bind. */
  @meta.blue.method
  @meta.adapted
  __init__(depthStencil = null)
  {
    this.depthStencil = depthStencil ?? null;
  }

  /**
   * Binds the depth-stencil, including null to unbind; an explicit false from
   * the render context is RS_FAILED.
   */
  @meta.blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    const accepted = renderContext.GetEffectStateManager().SetDepthStencilBuffer(this.depthStencil);
    return accepted === false ? TriRenderJob.StepResult.RS_FAILED : TriRenderJob.StepResult.RS_OK;
  }
}
