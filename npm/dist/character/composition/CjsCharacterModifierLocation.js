import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_modifierKey, _init_extra_modifierKey, _init_variationKey, _init_extra_variationKey;

/** Authored modifier location naming one category and variation. */
let _CjsCharacterModifier;
class CjsCharacterModifierLocation extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_modifierKey, _init_extra_modifierKey, _init_variationKey, _init_extra_variationKey],
      c: [_CjsCharacterModifier, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterModifierLocation",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "modifierKey"], [[io, io.readwrite, type, type.string], 16, "variationKey"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_variationKey(this);
  }
  modifierKey = _init_modifierKey(this, "");
  variationKey = (_init_extra_modifierKey(this), _init_variationKey(this, ""));
  static {
    _initClass();
  }
}

export { _CjsCharacterModifier as CjsCharacterModifierLocation };
//# sourceMappingURL=CjsCharacterModifierLocation.js.map
