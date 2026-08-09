import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_effectOverride, _init_extra_effectOverride, _init_renderAdditive, _init_extra_renderAdditive, _init_renderDecal, _init_extra_renderDecal, _init_renderOpaque, _init_extra_renderOpaque, _init_renderTransparent, _init_extra_renderTransparent, _init_renderable, _init_extra_renderable;

/** A render step that renders a single renderable, optionally overriding its material. */
let _TriStepRenderObject;
class TriStepRenderObject extends _TriRenderStep {
  static {
    ({
      e: [_init_effectOverride, _init_extra_effectOverride, _init_renderAdditive, _init_extra_renderAdditive, _init_renderDecal, _init_extra_renderDecal, _init_renderOpaque, _init_extra_renderOpaque, _init_renderTransparent, _init_extra_renderTransparent, _init_renderable, _init_extra_renderable, _initProto],
      c: [_TriStepRenderObject, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepRenderObject",
      family: "renderJob"
    })], [[[io, io.persist, void 0, type.model("Tr2Material")], 16, "effectOverride"], [[io, io.persist, type, type.boolean], 16, "renderAdditive"], [[io, io.persist, type, type.boolean], 16, "renderDecal"], [[io, io.persist, type, type.boolean], 16, "renderOpaque"], [[io, io.persist, type, type.boolean], 16, "renderTransparent"], [[io, io.persist, void 0, type.model("ITr2Renderable")], 16, "renderable"], [[carbon, carbon.method, impl, impl.implemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_renderable(this);
  }
  /** m_effectOverride (Tr2MaterialPtr) [READWRITE, PERSIST] */
  effectOverride = (_initProto(this), _init_effectOverride(this, null));

  /** m_typeEnabled[3] (bool) [READWRITE, PERSIST] */
  renderAdditive = (_init_extra_effectOverride(this), _init_renderAdditive(this, true));

  /** m_typeEnabled[1] (bool) [READWRITE, PERSIST] */
  renderDecal = (_init_extra_renderAdditive(this), _init_renderDecal(this, true));

  /** m_typeEnabled[0] (bool) [READWRITE, PERSIST] */
  renderOpaque = (_init_extra_renderDecal(this), _init_renderOpaque(this, true));

  /** m_typeEnabled[2] (bool) [READWRITE, PERSIST] */
  renderTransparent = (_init_extra_renderOpaque(this), _init_renderTransparent(this, true));

  /** m_renderable (ITr2RenderablePtr) [READWRITE, PERSIST] */
  renderable = (_init_extra_renderTransparent(this), _init_renderable(this, null));

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(renderable = null) {
    this.renderable = renderable;
  }

  /**
   * Renders the bound renderable, applying the override material when one is set.
   */
  Execute(_realTime, _simTime, executor) {
    if (this.renderable) {
      executor?.RenderObject?.(this.renderable, {
        effectOverride: this.effectOverride,
        renderOpaque: this.renderOpaque,
        renderDecal: this.renderDecal,
        renderTransparent: this.renderTransparent,
        renderAdditive: this.renderAdditive
      });
    }
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepRenderObject as TriStepRenderObject };
//# sourceMappingURL=TriStepRenderObject.js.map
