import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';

let _initProto, _initClass, _init_brTexCoord, _init_extra_brTexCoord, _init_failClearColor, _init_extra_failClearColor, _init_textureSize, _init_extra_textureSize, _init_tlTexCoord, _init_extra_tlTexCoord, _init_depthStencil, _init_extra_depthStencil, _init_renderTarget, _init_extra_renderTarget, _init_texture, _init_extra_texture;

/** A render step that draws a provided texture into the current target. */
let _TriStepRenderTexture;
class TriStepRenderTexture extends _TriRenderStep {
  static {
    ({
      e: [_init_brTexCoord, _init_extra_brTexCoord, _init_failClearColor, _init_extra_failClearColor, _init_textureSize, _init_extra_textureSize, _init_tlTexCoord, _init_extra_tlTexCoord, _init_depthStencil, _init_extra_depthStencil, _init_renderTarget, _init_extra_renderTarget, _init_texture, _init_extra_texture, _initProto],
      c: [_TriStepRenderTexture, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepRenderTexture",
      family: "renderJob"
    })], [[[io, io.readwrite, type, type.vec2], 16, "brTexCoord"], [[io, io.readwrite, type, type.uint32], 16, "failClearColor"], [[io, io.read, type, type.vec2], 16, "textureSize"], [[io, io.readwrite, type, type.vec2], 16, "tlTexCoord"], [[io, io.readwrite, void 0, type.objectRef("ITr2TextureProvider")], 16, "depthStencil"], [[io, io.readwrite, void 0, type.objectRef("ITr2TextureProvider")], 16, "renderTarget"], [[io, io.readwrite, void 0, type.objectRef("ITr2TextureProvider")], 16, "texture"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_texture(this);
  }
  /** m_brTexCoord (Vector2) [READWRITE] */
  brTexCoord = (_initProto(this), _init_brTexCoord(this, vec2.fromValues(1, 1)));

  /** m_failClearColor (unsigned) [READWRITE] */
  failClearColor = (_init_extra_brTexCoord(this), _init_failClearColor(this, 0));

  /** m_textureSize (Vector2) [READ] */
  textureSize = (_init_extra_failClearColor(this), _init_textureSize(this, vec2.create()));

  /** m_tlTexCoord (Vector2) [READWRITE] */
  tlTexCoord = (_init_extra_textureSize(this), _init_tlTexCoord(this, vec2.create()));

  /** m_texture (ITr2TextureProviderPtr) [READWRITE] */
  depthStencil = (_init_extra_tlTexCoord(this), _init_depthStencil(this, null));

  /** m_texture (ITr2TextureProviderPtr) [READWRITE] */
  renderTarget = (_init_extra_depthStencil(this), _init_renderTarget(this, null));

  /** m_texture (ITr2TextureProviderPtr) [READWRITE] */
  texture = (_init_extra_renderTarget(this), _init_texture(this, null));

  /** Carbon method __init__ -> py__init__ (MAP_METHOD). */
  __init__(source = null) {
    this.texture = null;
    this.renderTarget = null;
    this.depthStencil = null;
    const className = source?.constructor?.name ?? "";
    if (className === "Tr2RenderTarget") this.renderTarget = source;else if (className === "Tr2DepthStencil") this.depthStencil = source;else this.texture = source;
  }

  /**
   * Draws the provided texture into the current target with the configured placement.
   */
  Execute(_realTime, _simTime, executor) {
    const source = this.renderTarget ?? this.depthStencil ?? this.texture;
    if (source) {
      const width = Number(source.GetWidth?.() ?? source.width ?? 0);
      const height = Number(source.GetHeight?.() ?? source.height ?? 0);
      vec2.set(this.textureSize, width, height);
      executor?.RenderTexture?.(source, {
        tlTexCoord: this.tlTexCoord,
        brTexCoord: this.brTexCoord,
        failClearColor: this.failClearColor
      });
    }
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepRenderTexture as TriStepRenderTexture };
//# sourceMappingURL=TriStepRenderTexture.js.map
