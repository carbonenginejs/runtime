import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_modifierLocationID, _init_extra_modifierLocationID, _init_paperdollResourceID, _init_extra_paperdollResourceID, _init_paperdollResourceVariation, _init_extra_paperdollResourceVariation;

/** One authored paper-doll resource selection at a resolved modifier location. */
let _CjsCharacterModifier;
class CjsCharacterModifierSelection extends CjsModel {
  static {
    ({
      e: [_init_modifierLocationID, _init_extra_modifierLocationID, _init_paperdollResourceID, _init_extra_paperdollResourceID, _init_paperdollResourceVariation, _init_extra_paperdollResourceVariation],
      c: [_CjsCharacterModifier, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterModifierSelection",
      family: "character"
    })], [[[io, io.readwrite, void 0, type.model("CjsCharacterModifierLocation")], 16, "modifierLocationID"], [[io, io.readwrite, void 0, type.model("CjsCharacterResource")], 16, "paperdollResourceID"], [[io, io.readwrite, type, type.int32], 16, "paperdollResourceVariation"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_paperdollResourceVariation(this);
  }
  modifierLocationID = _init_modifierLocationID(this, null);
  paperdollResourceID = (_init_extra_modifierLocationID(this), _init_paperdollResourceID(this, null));
  paperdollResourceVariation = (_init_extra_paperdollResourceID(this), _init_paperdollResourceVariation(this, 0));
  static {
    _initClass();
  }
}

export { _CjsCharacterModifier as CjsCharacterModifierSelection };
//# sourceMappingURL=CjsCharacterModifierSelection.js.map
