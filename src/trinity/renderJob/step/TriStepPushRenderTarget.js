// Source: trinity/trinity/RenderJob/TriStepPushRenderTarget.h
// Source: trinity/trinity/RenderJob/TriStepPushRenderTarget.cpp
import { meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";


/** Step that pushes a render target onto the render context's stack for a given slot. */
@meta.define({ className: "TriStepPushRenderTarget", family: "renderJob" })
export class TriStepPushRenderTarget extends TriRenderStep
{
  @meta.blue.readwrite
  @meta.type.uint32
  slot = 0;

  @meta.blue.readwrite
  @meta.type.objectRef("Tr2RenderTarget")
  renderTarget = null;

  /** Stores the render target and the slot it is pushed for. */
  @meta.blue.method
  @meta.adapted
  __init__(renderTarget = null, slot = 0)
  {
    this.renderTarget = renderTarget ?? null;
    this.slot = Number(slot) >>> 0;
  }

  /**
   * Pushes the render target for its slot; every push needs a matching
   * TriStepPopRenderTarget in the same job or the job's stack guard unwinds it.
   */
  @meta.blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    // CARBON BRANCHES BETWEEN TWO OVERLOADS HERE (`cpp:13-24`), and the
    // difference is not cosmetic: with a target it binds one, without it calls
    // the slot-only form that saves the slot and binds NOTHING. Passing a null
    // target through would instead bind an empty texture and clear the slot,
    // which is a third thing - the one Tr2ShadowMap actually wants.
    const esm = renderContext.GetEffectStateManager();

    if (this.renderTarget) esm.PushRenderTarget(this.renderTarget, this.slot);
    else esm.PushRenderTarget(undefined, this.slot);
    return TriRenderJob.StepResult.RS_OK;
  }
}
