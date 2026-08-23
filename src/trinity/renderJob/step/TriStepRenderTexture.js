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
   * Draws the provided texture into the current target with the configured placement.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, executor)
  {
    const source = this.renderTarget ?? this.depthStencil ?? this.texture;
    if (source)
    {
      const width = Number(source.GetWidth?.() ?? source.width ?? 0);
      const height = Number(source.GetHeight?.() ?? source.height ?? 0);
      vec2.set(this.textureSize, width, height);
      executor?.RenderTexture?.(source, {
        tlTexCoord: this.tlTexCoord,
        brTexCoord: this.brTexCoord,
        failClearColor: this.failClearColor
      });
    }
    return TriRenderStep.Result.RS_OK;
  }

}
