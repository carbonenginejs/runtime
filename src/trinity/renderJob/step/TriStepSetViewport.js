import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepSetViewport.h
// Source: trinity/trinity/RenderJob/TriStepSetViewport.cpp
import { meta, type, blue } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that installs a viewport, or restores the full-screen viewport when none
 * is authored.
 */
@be.define("TriStepSetViewport")
@be.mapInterface(TriRenderStep)
@be.exposureChainTo(TriRenderStep)
export class TriStepSetViewport extends TriRenderStep
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("TriViewport")
  viewport = null;

  /** Stores the viewport this step installs. */
  @blue.method
  @meta.adapted
  __init__(viewport = null)
  {
    this.SetViewport(viewport);
  }

  /**
   * Replaces the viewport; null selects the full-screen viewport instead of
   * leaving the current one.
   */
  @blue.method
  @meta.adapted
  SetViewport(viewport)
  {
    this.viewport = viewport ?? null;
  }

  /**
   * Sets the authored viewport, or asks the render context for its full-screen
   * viewport when none is set.
   */
  @blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    // Through the effect state manager, as Carbon's step does
    // (`TriStepSetViewport.cpp:25,29` call `renderContext.m_esm`). The context's
    // own SetViewport is the abstraction layer's and takes an already-clipped
    // device viewport; the manager owns the authored one and derives it.
    const states = renderContext.GetEffectStateManager();

    if (this.viewport) states.SetViewport(this.viewport);
    else renderContext.SetFullScreenViewport();
    return TriRenderJob.StepResult.RS_OK;
  }
}
