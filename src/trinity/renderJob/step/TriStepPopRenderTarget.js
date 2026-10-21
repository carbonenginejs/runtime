import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepPopRenderTarget.h
// Source: trinity/trinity/RenderJob/TriStepPopRenderTarget.cpp
import { meta, type, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";


/**
 * Step that pops one slot off the render context's render-target stack, undoing an
 * earlier push.
 */
@be.define("TriStepPopRenderTarget")
@be.mapInterface(TriRenderStep)
@be.exposureChainTo(TriRenderStep)
export class TriStepPopRenderTarget extends TriRenderStep
{
  @be.mapAttribute(be.READWRITE)
  @type.uint32
  slot = 0;

  /** Stores the render-target slot to pop. */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.adapted
  __init__(slot = 0)
  {
    this.slot = Number(slot) >>> 0;
  }

  /**
   * Pops the recorded slot; the matching push must occur earlier in the same job
   * or the job's stack guard reports an underflow.
   */
  @blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.GetEffectStateManager().PopRenderTarget(this.slot);
    return TriRenderJob.StepResult.RS_OK;
  }
}
