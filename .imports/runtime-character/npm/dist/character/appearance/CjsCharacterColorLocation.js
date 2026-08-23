import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_colorKey, _init_extra_colorKey, _init_hasGloss, _init_extra_hasGloss, _init_hasWeight, _init_extra_hasWeight;

/** Authored color-control location and its supported scalar controls. */
let _CjsCharacterColorLoc;
class CjsCharacterColorLocation extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_colorKey, _init_extra_colorKey, _init_hasGloss, _init_extra_hasGloss, _init_hasWeight, _init_extra_hasWeight],
      c: [_CjsCharacterColorLoc, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterColorLocation",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "colorKey"], [[io, io.readwrite, type, type.uint8], 16, "hasGloss"], [[io, io.readwrite, type, type.uint8], 16, "hasWeight"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_hasWeight(this);
  }
  colorKey = _init_colorKey(this, "");
  hasGloss = (_init_extra_colorKey(this), _init_hasGloss(this, 0));
  hasWeight = (_init_extra_hasGloss(this), _init_hasWeight(this, 0));
  static {
    _initClass();
  }
}

export { _CjsCharacterColorLoc as CjsCharacterColorLocation };
//# sourceMappingURL=CjsCharacterColorLocation.js.map
