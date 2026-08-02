import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_value, _init_extra_value;

/** One authored RGBA character color value. */
let _CjsCharacterColorVal;
class CjsCharacterColorValue extends CjsModel {
  static {
    ({
      e: [_init_value, _init_extra_value],
      c: [_CjsCharacterColorVal, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterColorValue",
      family: "character"
    })], [[[io, io.readwrite, type, type.vec4], 16, "value"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_value(this);
  }
  value = _init_value(this, [0, 0, 0, 1]);
  static {
    _initClass();
  }
}

export { _CjsCharacterColorVal as CjsCharacterColorValue };
//# sourceMappingURL=CjsCharacterColorValue.js.map
