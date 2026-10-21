import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepPresentSwapChain.h
// Source: trinity/trinity/RenderJob/TriStepPresentSwapChain.cpp
import { meta, type, blue } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that presents a swap chain, publishing the frame that the preceding steps
 * produced.
 */
@be.define("TriStepPresentSwapChain")
@be.mapInterface(TriRenderStep)
@be.exposureChainTo(TriRenderStep)
export class TriStepPresentSwapChain extends TriRenderStep
{
  @blue.readwrite
  @type.rootRef("Tr2SwapChain")
  swapChain = null;

  /** Stores the swap chain to present. */
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    if (this.swapChain) this.swapChain.Present(renderContext);
    return TriRenderJob.StepResult.RS_OK;
  }
}
