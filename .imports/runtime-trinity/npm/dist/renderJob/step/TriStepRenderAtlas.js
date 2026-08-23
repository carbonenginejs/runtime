import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_focus, _init_extra_focus, _init_atlas, _init_extra_atlas, _init_focusColour, _init_extra_focusColour, _init_borderColour, _init_extra_borderColour, _init_freeColour, _init_extra_freeColour, _init_brTexCoord, _init_extra_brTexCoord, _init_showFree, _init_extra_showFree, _init_showUsed, _init_extra_showUsed, _init_tlTexCoord, _init_extra_tlTexCoord;

/** A render step that draws a texture atlas for inspection, focused on one entry. */
let _TriStepRenderAtlas;
class TriStepRenderAtlas extends _TriRenderStep {
  static {
    ({
      e: [_init_focus, _init_extra_focus, _init_atlas, _init_extra_atlas, _init_focusColour, _init_extra_focusColour, _init_borderColour, _init_extra_borderColour, _init_freeColour, _init_extra_freeColour, _init_brTexCoord, _init_extra_brTexCoord, _init_showFree, _init_extra_showFree, _init_showUsed, _init_extra_showUsed, _init_tlTexCoord, _init_extra_tlTexCoord, _initProto],
      c: [_TriStepRenderAtlas, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepRenderAtlas",
      family: "renderJob"
    })], [[[io, io.readwrite, void 0, type.objectRef("Tr2AtlasTexture")], 16, "focus"], [[io, io.readwrite, void 0, type.objectRef("Tr2TextureAtlas")], 16, "atlas"], [[io, io.readwrite, type, type.vec4], 16, "focusColour"], [[io, io.readwrite, type, type.vec4], 16, "borderColour"], [[io, io.readwrite, type, type.vec4], 16, "freeColour"], [[io, io.readwrite, type, type.vec2], 16, "brTexCoord"], [[io, io.readwrite, type, type.boolean], 16, "showFree"], [[io, io.readwrite, type, type.boolean], 16, "showUsed"], [[io, io.readwrite, type, type.vec2], 16, "tlTexCoord"], [[carbon, carbon.method, impl, impl.implemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_tlTexCoord(this);
  }
  /** m_focus (Tr2AtlasTexture*) [READWRITE] */
  focus = (_initProto(this), _init_focus(this, null));

  /** m_atlas (Tr2TextureAtlas*) [READWRITE] */
  atlas = (_init_extra_focus(this), _init_atlas(this, null));

  /** m_focusColour (Vector4) [READWRITE] */
  focusColour = (_init_extra_atlas(this), _init_focusColour(this, vec4.fromValues(1, 0, 1, 1)));

  /** m_borderColour (Vector4) [READWRITE] */
  borderColour = (_init_extra_focusColour(this), _init_borderColour(this, vec4.fromValues(1, 1, 0, 1)));

  /** m_freeColour (Vector4) [READWRITE] */
  freeColour = (_init_extra_borderColour(this), _init_freeColour(this, vec4.fromValues(0, 0.5, 0, 1)));

  /** m_brTexCoord (Vector2) [READWRITE] */
  brTexCoord = (_init_extra_freeColour(this), _init_brTexCoord(this, vec2.fromValues(1, 1)));

  /** m_showFree (bool) [READWRITE] */
  showFree = (_init_extra_brTexCoord(this), _init_showFree(this, false));

  /** m_showUsed (bool) [READWRITE] */
  showUsed = (_init_extra_showFree(this), _init_showUsed(this, true));

  /** m_tlTexCoord (Vector2) [READWRITE] */
  tlTexCoord = (_init_extra_showUsed(this), _init_tlTexCoord(this, vec2.create()));

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(atlas = null, focus = null) {
    this.atlas = atlas;
    this.focus = focus;
  }

  /**
   * Draws the bound texture atlas for inspection.
   */
  Execute(_realTime, _simTime, executor) {
    if (this.atlas) executor?.RenderAtlas?.(this);
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepRenderAtlas as TriStepRenderAtlas };
//# sourceMappingURL=TriStepRenderAtlas.js.map
