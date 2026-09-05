// Source: trinity/trinity/RenderJob/TriStepRenderTexture.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { vec2 } from "#math/vec2";

/** A render step that draws a provided texture into the current target. */
@type.define({ className: "TriStepRenderTexture", family: "renderJob" })
export class TriStepRenderTexture extends TriRenderStep
{

  /** m_brTexCoord (Vector2) [READWRITE] */
  @io.readwrite
  @type.vec2
  brTexCoord = vec2.fromValues(1, 1);

  /** m_failClearColor (unsigned) [READWRITE] */
  @io.readwrite
  @type.uint32
  failClearColor = 0;

  /** m_textureSize (Vector2) [READ] */
  @io.read
  @type.vec2
  textureSize = vec2.create();

  /** m_tlTexCoord (Vector2) [READWRITE] */
  @io.readwrite
  @type.vec2
  tlTexCoord = vec2.create();

  /** m_texture (ITr2TextureProviderPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("ITr2TextureProvider")
  depthStencil = null;

  /** m_texture (ITr2TextureProviderPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("ITr2TextureProvider")
  renderTarget = null;

  /** m_texture (ITr2TextureProviderPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("ITr2TextureProvider")
  texture = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD). */
  @carbon.method
  @impl.adapted
  __init__(source = null)
  {
    this.texture = null;
    this.renderTarget = null;
    this.depthStencil = null;
    const className = source?.constructor?.name ?? "";
    if (className === "Tr2RenderTarget") this.renderTarget = source;
    else if (className === "Tr2DepthStencil") this.depthStencil = source;
    else this.texture = source;
  }

  /**
   * Clears the target when the blit failed, so a missing texture shows as the
   * configured colour rather than as whatever was underneath.
   *
   * Carbon `ClearIfFail` (`TriStepRenderTexture.cpp:41-48`).
   *
   * @param {boolean} result Whether the blit drew.
   * @param {object} renderContext The context to clear through.
   * @returns {number} Always `RS_OK`; a failed blit is not a failed step.
   */
  ClearIfFail(result, renderContext)
  {
    if (!result) renderContext.Clear({ clearColor: true, color: this.failClearColor });

    return TriRenderStep.Result.RS_OK;
  }

  /**
   * Blits the bound texture into the current target.
   *
   * Carbon `Execute` (`TriStepRenderTexture.cpp:50-71`) calls
   * `Tr2Renderer::DrawTexture`, which is a three-line wrapper around
   * `Tr2Blitter::Draw`. Ours reaches the blitter through the render context;
   * see `Tr2RenderContext.GetBlitter` for why it lives there.
   *
   * NOT PORTED: the `m_atlasTexture` branch (`cpp:57-69`), which needs
   * `Tr2AtlasTexture.CalcSubTextureWindow`. Carbon's own version of that branch
   * dereferences `m_texture` rather than `m_atlasTexture` on `cpp:67` - a null
   * dereference on the only path that reaches it - so there is nothing here
   * worth transcribing until the atlas type exists.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, renderContext)
  {
    const source = this.renderTarget ?? this.depthStencil ?? this.texture;

    if (!source) return TriRenderStep.Result.RS_OK;

    const width = Number(source.GetWidth?.() ?? source.width ?? 0);
    const height = Number(source.GetHeight?.() ?? source.height ?? 0);

    vec2.set(this.textureSize, width, height);

    const drawn = renderContext.GetBlitter().DrawTexture(renderContext, source, {
      tlTexCoord: this.tlTexCoord,
      brTexCoord: this.brTexCoord
    });

    return this.ClearIfFail(drawn, renderContext);
  }

}
