// Source: trinity/trinity/RenderJob/TriStepRenderTexture.h
import { Tr2RenderTarget } from "../../core/device/Tr2RenderTarget.js";
import { Tr2DepthStencil } from "../../core/device/Tr2DepthStencil.js";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { CjsSchema, meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { vec2 } from "#math/vec2";

/** A render step that draws a provided texture into the current target. */
@meta.define({ className: "TriStepRenderTexture", family: "renderJob" })
export class TriStepRenderTexture extends TriRenderStep
{

  /** m_brTexCoord (Vector2) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.vec2
  brTexCoord = vec2.fromValues(1, 1);

  /** m_failClearColor (unsigned) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.uint32
  failClearColor = 0;

  /** m_textureSize (Vector2) [READ] */
  @meta.blue.read
  @meta.type.vec2
  textureSize = vec2.create();

  /** m_tlTexCoord (Vector2) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.vec2
  tlTexCoord = vec2.create();

  /** m_texture (ITr2TextureProviderPtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("ITr2TextureProvider")
  depthStencil = null;

  /** m_texture (ITr2TextureProviderPtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("ITr2TextureProvider")
  renderTarget = null;

  /** m_texture (ITr2TextureProviderPtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("ITr2TextureProvider")
  texture = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD). */
  @meta.blue.method
  @meta.adapted
  __init__(source = null)
  {
    this.texture = null;
    this.renderTarget = null;
    this.depthStencil = null;
    if (CjsSchema.cast(source, Tr2RenderTarget)) this.renderTarget = source;
    else if (CjsSchema.cast(source, Tr2DepthStencil)) this.depthStencil = source;
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
   * see `Tr2RenderContext.GetBlitter` for why it lives there. The provider must
   * supply GetTexture; the blitter receives its borrowed AL texture. As in the
   * native non-atlas branch, textureSize remains unchanged.
   *
   * NOT PORTED: the `m_atlasTexture` branch (`cpp:57-69`), which needs
   * `Tr2AtlasTexture.CalcSubTextureWindow`. Carbon's own version of that branch
   * dereferences `m_texture` rather than `m_atlasTexture` on `cpp:67` - a null
   * dereference on the only path that reaches it - so there is nothing here
   * worth transcribing until the atlas type exists.
   */
  @meta.blue.method
  @meta.adapted
  Execute(_realTime, _simTime, renderContext)
  {
    const source = this.renderTarget ?? this.depthStencil ?? this.texture;

    if (!source || !source.GetTexture()) return TriRenderStep.Result.RS_OK;

    const drawn = renderContext.GetBlitter().Draw__Texture(renderContext, source.GetTexture(), this.tlTexCoord, this.brTexCoord);

    return this.ClearIfFail(drawn, renderContext);
  }

}
