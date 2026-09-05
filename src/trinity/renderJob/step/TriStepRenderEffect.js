// Source: trinity/trinity/RenderJob/TriStepRenderEffect.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { vec2 } from "#math/vec2";
import { AdjustTextureCoordsToViewport } from "../../core/Tr2RenderUtils.js";

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
   * Applies the shader buffer, then draws the effect over a screen quad.
   *
   * Carbon `Execute` (`TriStepRenderEffect.cpp:27-40`): apply the buffer if
   * there is one, then `Tr2Renderer::DrawTexture( renderContext, m_effect,
   * m_tlTexCoord, m_brTexCoord )`. That overload adjusts the texture
   * coordinates to the viewport and hands them to `Tr2Blitter::Draw`
   * (`Tr2Renderer.cpp:803-814`), which is what these two lines are.
   *
   * THE ORDER IS CARBON'S AND IT MATTERS: the buffer is applied BEFORE the
   * draw, because the draw runs every pass of the effect and each pass reads
   * whatever the buffer bound.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, renderContext)
  {
    if (!this.effect) return TriRenderStep.Result.RS_OK;

    if (this.shaderBuffer) this.shaderBuffer.ApplyBuffer(renderContext);

    const adjusted = AdjustTextureCoordsToViewport(renderContext, this.tlTexCoord, this.brTexCoord);

    renderContext.GetBlitter().Draw(renderContext, this.effect, null, adjusted);

    return TriRenderStep.Result.RS_OK;
  }

}
