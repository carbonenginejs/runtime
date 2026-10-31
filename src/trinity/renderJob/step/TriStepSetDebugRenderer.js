import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepSetDebugRenderer.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that installs the debug renderer subsequent debug drawing routes through. */
@be.define("TriStepSetDebugRenderer")

@be.exposureChainTo(TriRenderStep)
export class TriStepSetDebugRenderer extends TriRenderStep
{

  /** m_debugRenderer (ITr2DebugRendererPtr) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.object.ref("ITr2DebugRenderer")
  renderer = null;

  /**
   * Carbon method __init__ -> SetDebugRenderer (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS).
   *
   * @implemented
   */
  __init__(renderer = null)
  {
    this.SetDebugRenderer(renderer);
  }

  /**
   * Binds the debug renderer this step installs; null detaches it.
   *
   * @implemented
   */
  @be.mapMethodAndWrapOptionalArgs("__init__")
  SetDebugRenderer(renderer)
  {
    this.renderer = renderer ?? null;
  }

  /**
   * Installs the bound debug renderer on the render context.
   *
   * @adapted
   */

  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.SetDebugRenderer(this.renderer);
    return TriRenderStep.Result.RS_OK;
  }

}
