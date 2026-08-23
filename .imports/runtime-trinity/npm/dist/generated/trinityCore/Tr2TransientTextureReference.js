import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_texture, _init_extra_texture, _init_onTextureChange, _init_extra_onTextureChange;

/** Tr2TransientTextureReference (trinityCore) - generated from schema shapeHash 2df00c63.... */
let _Tr2TransientTextureR;
class Tr2TransientTextureReference extends CjsModel {
  static {
    ({
      e: [_init_texture, _init_extra_texture, _init_onTextureChange, _init_extra_onTextureChange],
      c: [_Tr2TransientTextureR, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TransientTextureReference",
      family: "trinityCore"
    })], [[type.objectRef("Tr2TextureAL"), 0, "texture"], [type.rawStruct("OnTextureChangeEvent"), 0, "onTextureChange"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_onTextureChange(this);
  }
  /** m_texture (Tr2TextureAL*) */
  texture = _init_texture(this, null);

  /** m_onTextureChange (OnTextureChangeEvent) */
  onTextureChange = (_init_extra_texture(this), _init_onTextureChange(this, null));
  static {
    _initClass();
  }
}

export { _Tr2TransientTextureR as Tr2TransientTextureReference };
//# sourceMappingURL=Tr2TransientTextureReference.js.map
