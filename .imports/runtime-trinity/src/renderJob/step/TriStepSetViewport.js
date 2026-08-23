// Source: E:\carbonengine\trinity\trinity\RenderJob\TriStepSetViewport.h
// Source: E:\carbonengine\trinity\trinity\RenderJob\TriStepSetViewport.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step that installs a viewport, or restores the full-screen viewport when none
 * is authored.
 */
@type.define({ className: "TriStepSetViewport", family: "renderJob" })
export class TriStepSetViewport extends TriRenderStep
{
  @io.persist
  @type.objectRef("TriViewport")
  viewport = null;

  /** Stores the viewport this step installs. */
  @carbon.method
  @impl.adapted
  __init__(viewport = null)
  {
    this.SetViewport(viewport);
  }

  /**
   * Replaces the viewport; null selects the full-screen viewport instead of
   * leaving the current one.
   */
  @carbon.method
  @impl.adapted
  SetViewport(viewport)
  {
    this.viewport = viewport ?? null;
  }

  /**
   * Sets the authored viewport, or asks the executor for its full-screen
   * viewport when none is set.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, executor)
  {
    if (this.viewport) executor?.SetViewport?.(this.viewport);
    else executor?.SetFullScreenViewport?.();
    return TriRenderJob.StepResult.RS_OK;
  }
}
