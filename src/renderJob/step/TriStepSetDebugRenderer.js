// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/RenderJob/TriStepSetDebugRenderer.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that installs the debug renderer subsequent debug drawing routes through. */
@type.define({ className: "TriStepSetDebugRenderer", family: "renderJob" })
export class TriStepSetDebugRenderer extends TriRenderStep
{

  /** m_debugRenderer (ITr2DebugRendererPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("ITr2DebugRenderer")
  renderer = null;

  /** Carbon method __init__ -> SetDebugRenderer (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.implemented
  __init__(renderer = null)
  {
    this.SetDebugRenderer(renderer);
  }

  /**
   * Binds the debug renderer this step installs; null detaches it.
   */
  @carbon.method
  @impl.implemented
  SetDebugRenderer(renderer)
  {
    this.renderer = renderer ?? null;
  }

  /**
   * Installs the bound debug renderer on the executor.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, executor)
  {
    executor?.SetDebugRenderer?.(this.renderer);
    return TriRenderStep.Result.RS_OK;
  }

}
