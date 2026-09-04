// Source: trinity/trinity/RenderJob/TriStepPushRenderTarget.h
// Source: trinity/trinity/RenderJob/TriStepPushRenderTarget.cpp
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";


/** Step that pushes a render target onto the render context's stack for a given slot. */
@type.define({ className: "TriStepPushRenderTarget", family: "renderJob" })
export class TriStepPushRenderTarget extends TriRenderStep
{
  @io.readwrite
  @type.uint32
  slot = 0;

  @io.readwrite
  @type.objectRef("Tr2RenderTarget")
  renderTarget = null;

  /** Stores the render target and the slot it is pushed for. */
  @carbon.method
  @impl.adapted
  __init__(renderTarget = null, slot = 0)
  {
    this.renderTarget = renderTarget ?? null;
    this.slot = Number(slot) >>> 0;
  }

  /**
   * Pushes the render target for its slot; every push needs a matching
   * TriStepPopRenderTarget in the same job or the job's stack guard unwinds it.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.PushRenderTarget(this.renderTarget, this.slot);
    return TriRenderJob.StepResult.RS_OK;
  }
}
