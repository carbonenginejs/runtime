import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_texture, _init_extra_texture, _init_onTextureChange, _init_extra_onTextureChange;

/** Tr2TextureReference (trinityCore) - generated from schema shapeHash 4e082276.... */
let _Tr2TextureReference;
class Tr2TextureReference extends CjsModel {
  static {
    ({
      e: [_init_texture, _init_extra_texture, _init_onTextureChange, _init_extra_onTextureChange, _initProto],
      c: [_Tr2TextureReference, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TextureReference",
      family: "trinityCore"
    })], [[type.rawStruct("Tr2TextureAL"), 0, "texture"], [type.rawStruct("OnTextureChangeEvent"), 0, "onTextureChange"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Save"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_onTextureChange(this);
  }
  /** m_texture (Tr2TextureAL) */
  texture = (_initProto(this), _init_texture(this, null));

  /** m_onTextureChange (OnTextureChangeEvent) */
  onTextureChange = (_init_extra_texture(this), _init_onTextureChange(this, null));

  /** Carbon method Save (MAP_METHOD_AND_WRAP). */
  Save(...args) {
    throw new Error("Tr2TextureReference.Save is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2TextureReference as Tr2TextureReference };
//# sourceMappingURL=Tr2TextureReference.js.map
