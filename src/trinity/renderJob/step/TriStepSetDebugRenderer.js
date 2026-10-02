// Source: trinity/trinity/RenderJob/TriStepSetDebugRenderer.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that installs the debug renderer subsequent debug drawing routes through. */
@meta.define({ className: "TriStepSetDebugRenderer", family: "renderJob" })
export class TriStepSetDebugRenderer extends TriRenderStep
{

  /** m_debugRenderer (ITr2DebugRendererPtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("ITr2DebugRenderer")
  renderer = null;

  /** Carbon method __init__ -> SetDebugRenderer (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @meta.blue.method
  @meta.implemented
  __init__(renderer = null)
  {
    this.SetDebugRenderer(renderer);
  }

  /**
   * Binds the debug renderer this step installs; null detaches it.
   */
  @meta.blue.method
  @meta.implemented
  SetDebugRenderer(renderer)
  {
    this.renderer = renderer ?? null;
  }

  /**
   * Installs the bound debug renderer on the render context.
   */
  @meta.blue.method
  @meta.adapted
  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.SetDebugRenderer(this.renderer);
    return TriRenderStep.Result.RS_OK;
  }

}
