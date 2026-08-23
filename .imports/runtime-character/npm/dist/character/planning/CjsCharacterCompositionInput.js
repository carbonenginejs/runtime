import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_role, _init_extra_role, _init_texture, _init_extra_texture, _init_sampleBounds, _init_extra_sampleBounds, _init_value, _init_extra_value;

/** Named logical input to one character texture-composition pass. */
let _CjsCharacterComposit;
class CjsCharacterCompositionInput extends CjsModel {
  static {
    ({
      e: [_init_role, _init_extra_role, _init_texture, _init_extra_texture, _init_sampleBounds, _init_extra_sampleBounds, _init_value, _init_extra_value],
      c: [_CjsCharacterComposit, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterCompositionInput",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "role"], [[io, io.readwrite, void 0, type.model("CjsCharacterTextureAsset")], 16, "texture"], [[io, io.readwrite, type, type.vec4], 16, "sampleBounds"], [[io, io.readwrite, type, type.unknown], 16, "value"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_value(this);
  }
  role = _init_role(this, "");
  texture = (_init_extra_role(this), _init_texture(this, null));
  sampleBounds = (_init_extra_texture(this), _init_sampleBounds(this, null));
  value = (_init_extra_sampleBounds(this), _init_value(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterComposit as CjsCharacterCompositionInput };
//# sourceMappingURL=CjsCharacterCompositionInput.js.map
