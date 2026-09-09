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
   * Asks the swap chain to present itself; with none set the step is a no-op.
   *
   * Carbon calls `m_swapChain->Present( renderContext )` (`cpp:12-15`). Until
   * 2026-09-09 this called `renderContext.PresentSwapChain(...)`, a method
   * Carbon does not have, which reached an AL present that ignored the argument.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    if (this.swapChain) this.swapChain.Present(renderContext);
    return TriRenderJob.StepResult.RS_OK;
  }
}
