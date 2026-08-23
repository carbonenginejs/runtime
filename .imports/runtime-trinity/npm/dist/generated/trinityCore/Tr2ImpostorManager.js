import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_height, _init_extra_height, _init_width, _init_extra_width, _init_atlas, _init_extra_atlas, _init_itemHeight, _init_extra_itemHeight, _init_itemWidth, _init_extra_itemWidth, _init_effect, _init_extra_effect, _init_maxUpdates, _init_extra_maxUpdates;

/** Tr2ImpostorManager (trinityCore) - generated from schema shapeHash a983f61c.... */
let _Tr2ImpostorManager;
class Tr2ImpostorManager extends CjsModel {
  static {
    ({
      e: [_init_height, _init_extra_height, _init_width, _init_extra_width, _init_atlas, _init_extra_atlas, _init_itemHeight, _init_extra_itemHeight, _init_itemWidth, _init_extra_itemWidth, _init_effect, _init_extra_effect, _init_maxUpdates, _init_extra_maxUpdates, _initProto],
      c: [_Tr2ImpostorManager, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ImpostorManager",
      family: "trinityCore"
    })], [[[io, io.notify, io, io.persist, type, type.uint32], 16, "height"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "width"], [[io, io.read, void 0, type.objectRef("Tr2RenderTarget")], 16, "atlas"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "itemHeight"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "itemWidth"], [[io, io.read, void 0, type.objectRef("Tr2Effect")], 16, "effect"], [[io, io.persist, type, type.uint32], 16, "maxUpdates"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "__init__"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_maxUpdates(this);
  }
  /** m_height (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  height = (_initProto(this), _init_height(this, 1024));

  /** m_width (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  width = (_init_extra_height(this), _init_width(this, 1024));

  /** m_rt (Tr2RenderTargetPtr) [READ] */
  atlas = (_init_extra_width(this), _init_atlas(this, null));

  /** m_itemHeight (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  itemHeight = (_init_extra_atlas(this), _init_itemHeight(this, 32));

  /** m_itemWidth (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  itemWidth = (_init_extra_itemHeight(this), _init_itemWidth(this, 32));

  /** m_effect (Tr2EffectPtr) [READ] */
  effect = (_init_extra_itemWidth(this), _init_effect(this, null));

  /** m_maxUpdates (uint32_t) [READWRITE, PERSIST] */
  maxUpdates = (_init_extra_effect(this), _init_maxUpdates(this, 16));

  /** Carbon method __init__ -> Create (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(...args) {
    throw new Error("Tr2ImpostorManager.__init__ is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2ImpostorManager as Tr2ImpostorManager };
//# sourceMappingURL=Tr2ImpostorManager.js.map
