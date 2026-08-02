import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_weightKeyCategory, _init_extra_weightKeyCategory, _init_weightKeyPrefix, _init_extra_weightKeyPrefix;

/** Authored sculpt-control location naming its weight category and prefix. */
let _CjsCharacterSculptin;
class CjsCharacterSculptingLocation extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_weightKeyCategory, _init_extra_weightKeyCategory, _init_weightKeyPrefix, _init_extra_weightKeyPrefix],
      c: [_CjsCharacterSculptin, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterSculptingLocation",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "weightKeyCategory"], [[io, io.readwrite, type, type.string], 16, "weightKeyPrefix"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_weightKeyPrefix(this);
  }
  weightKeyCategory = _init_weightKeyCategory(this, "");
  weightKeyPrefix = (_init_extra_weightKeyCategory(this), _init_weightKeyPrefix(this, ""));
  static {
    _initClass();
  }
}

export { _CjsCharacterSculptin as CjsCharacterSculptingLocation };
//# sourceMappingURL=CjsCharacterSculptingLocation.js.map
