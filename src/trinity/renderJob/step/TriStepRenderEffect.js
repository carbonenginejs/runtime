// Source: trinity/trinity/RenderJob/TriStepRenderEffect.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { vec2 } from "#math/vec2";

/** A render step that draws a full-screen effect with an optional shader buffer. */
@type.define({ className: "TriStepRenderEffect", family: "renderJob" })
export class TriStepRenderEffect extends TriRenderStep
{

  /** m_shaderBuffer (Tr2ShaderBufferPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("Tr2ShaderBuffer")
  shaderBuffer = null;

  /** m_brTexCoord (Vector2) [READWRITE] */
  @io.readwrite
  @type.vec2
  brTexCoord = vec2.fromValues(1, 1);

  /** m_effect (Tr2EffectPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("Tr2Effect")
  effect = null;

  /** m_tlTexCoord (Vector2) [READWRITE] */
  @io.readwrite
  @type.vec2
  tlTexCoord = vec2.create();

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.implemented
  __init__(effect = null, shaderBuffer = null)
  {
    this.effect = effect;
    this.shaderBuffer = shaderBuffer;
  }

  /**
   * Draws the bound effect, passing its shader buffer and texture coordinates to the executor.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, executor)
  {
    if (this.effect)
    {
      executor.DrawEffect(this.effect, this.shaderBuffer, this.tlTexCoord, this.brTexCoord);
    }
    return TriRenderStep.Result.RS_OK;
  }

}
