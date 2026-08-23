import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_gloss, _init_extra_gloss, _init_weight, _init_extra_weight, _init_colorID, _init_extra_colorID, _init_colorNameA, _init_extra_colorNameA, _init_colorNameBC, _init_extra_colorNameBC;

/** One authored paper-doll color selection with resolved catalog references. */
let _CjsCharacterColorSel;
class CjsCharacterColorSelection extends CjsModel {
  static {
    ({
      e: [_init_gloss, _init_extra_gloss, _init_weight, _init_extra_weight, _init_colorID, _init_extra_colorID, _init_colorNameA, _init_extra_colorNameA, _init_colorNameBC, _init_extra_colorNameBC],
      c: [_CjsCharacterColorSel, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterColorSelection",
      family: "character"
    })], [[[io, io.readwrite, type, type.float64], 16, "gloss"], [[io, io.readwrite, type, type.float64], 16, "weight"], [[io, io.readwrite, void 0, type.model("CjsCharacterColorLocation")], 16, "colorID"], [[io, io.readwrite, void 0, type.model("CjsCharacterColorName")], 16, "colorNameA"], [[io, io.readwrite, void 0, type.model("CjsCharacterColorName")], 16, "colorNameBC"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_colorNameBC(this);
  }
  gloss = _init_gloss(this, 0);
  weight = (_init_extra_gloss(this), _init_weight(this, 0));
  colorID = (_init_extra_weight(this), _init_colorID(this, null));
  colorNameA = (_init_extra_colorID(this), _init_colorNameA(this, null));
  colorNameBC = (_init_extra_colorNameA(this), _init_colorNameBC(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterColorSel as CjsCharacterColorSelection };
//# sourceMappingURL=CjsCharacterColorSelection.js.map
