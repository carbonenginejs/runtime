// Source: trinity/trinity/RenderJob/TriStepPresentSwapChain.h
// Source: trinity/trinity/RenderJob/TriStepPresentSwapChain.cpp
import { carbon, impl, io, type } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that presents a swap chain, publishing the frame that the preceding steps
 * produced.
 */
@type.define({ className: "TriStepPresentSwapChain", family: "renderJob" })
export class TriStepPresentSwapChain extends TriRenderStep
{
  @io.readwrite
  @type.objectRef("Tr2SwapChain")
  swapChain = null;

  /** Stores the swap chain to present. */
  @carbon.method
  @impl.adapted
  __init__(swapChain = null)
  {
    this.swapChain = swapChain ?? null;
  }

  /**
   * Asks the executor to present the swap chain; with none set the step is a
   * no-op.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, executor)
  {
    if (this.swapChain) executor.PresentSwapChain(this.swapChain);
    return TriRenderJob.StepResult.RS_OK;
  }
}
