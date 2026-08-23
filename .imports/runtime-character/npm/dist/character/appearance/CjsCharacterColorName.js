import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_colorName, _init_extra_colorName, _init_hairColor, _init_extra_hairColor;

/** Authored appearance-color name and hair-color classification. */
let _CjsCharacterColorNam;
class CjsCharacterColorName extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_colorName, _init_extra_colorName, _init_hairColor, _init_extra_hairColor],
      c: [_CjsCharacterColorNam, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterColorName",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "colorName"], [[io, io.readwrite, type, type.uint8], 16, "hairColor"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_hairColor(this);
  }
  colorName = _init_colorName(this, "");
  hairColor = (_init_extra_colorName(this), _init_hairColor(this, 0));
  static {
    _initClass();
  }
}

export { _CjsCharacterColorNam as CjsCharacterColorName };
//# sourceMappingURL=CjsCharacterColorName.js.map
