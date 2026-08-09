import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_authoredValue, _init_extra_authoredValue, _init_modifierPath, _init_extra_modifierPath, _init_partSource, _init_extra_partSource, _init_modifierLocation, _init_extra_modifierLocation;

/** Additive typed projection beside one losslessly retained authored modifier string. */
let _CjsCharacterModifier;
class CjsCharacterModifierReference extends CjsModel {
  static {
    ({
      e: [_init_authoredValue, _init_extra_authoredValue, _init_modifierPath, _init_extra_modifierPath, _init_partSource, _init_extra_partSource, _init_modifierLocation, _init_extra_modifierLocation],
      c: [_CjsCharacterModifier, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterModifierReference",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "authoredValue"], [[io, io.readwrite, type, type.string], 16, "modifierPath"], [[io, io.readwrite, void 0, type.model("CjsCharacterPartSource")], 16, "partSource"], [[io, io.readwrite, void 0, type.model("CjsCharacterModifierLocation")], 16, "modifierLocation"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_modifierLocation(this);
  }
  authoredValue = _init_authoredValue(this, "");
  modifierPath = (_init_extra_authoredValue(this), _init_modifierPath(this, null));
  partSource = (_init_extra_modifierPath(this), _init_partSource(this, null));
  modifierLocation = (_init_extra_partSource(this), _init_modifierLocation(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterModifier as CjsCharacterModifierReference };
//# sourceMappingURL=CjsCharacterModifierReference.js.map
