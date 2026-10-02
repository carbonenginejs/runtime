// Source: trinity/trinity/RenderJob/TriStepSetViewport.h
// Source: trinity/trinity/RenderJob/TriStepSetViewport.cpp
import { meta } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that installs a viewport, or restores the full-screen viewport when none
 * is authored.
 */
@meta.define({ className: "TriStepSetViewport", family: "renderJob" })
export class TriStepSetViewport extends TriRenderStep
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("TriViewport")
  viewport = null;

  /** Stores the viewport this step installs. */
  @meta.blue.method
  @meta.adapted
  __init__(viewport = null)
  {
    this.SetViewport(viewport);
  }

  /**
   * Replaces the viewport; null selects the full-screen viewport instead of
   * leaving the current one.
   */
  @meta.blue.method
  @meta.adapted
  SetViewport(viewport)
  {
    this.viewport = viewport ?? null;
  }

  /**
   * Sets the authored viewport, or asks the render context for its full-screen
   * viewport when none is set.
   */
  @meta.blue.method
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
