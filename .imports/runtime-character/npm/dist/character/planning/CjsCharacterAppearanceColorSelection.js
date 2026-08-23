import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_colorKey, _init_extra_colorKey, _init_colorNameA, _init_extra_colorNameA, _init_colorNameBC, _init_extra_colorNameBC, _init_gloss, _init_extra_gloss, _init_weight, _init_extra_weight, _init_hasGloss, _init_extra_hasGloss, _init_hasWeight, _init_extra_hasWeight, _init_origin, _init_extra_origin;

/** One plan-local authored paper-doll colour selection. */
let _CjsCharacterAppearan;
class CjsCharacterAppearanceColorSelection extends CjsModel {
  static {
    ({
      e: [_init_colorKey, _init_extra_colorKey, _init_colorNameA, _init_extra_colorNameA, _init_colorNameBC, _init_extra_colorNameBC, _init_gloss, _init_extra_gloss, _init_weight, _init_extra_weight, _init_hasGloss, _init_extra_hasGloss, _init_hasWeight, _init_extra_hasWeight, _init_origin, _init_extra_origin],
      c: [_CjsCharacterAppearan, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterAppearanceColorSelection",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "colorKey"], [[io, io.readwrite, type, type.string], 16, "colorNameA"], [[io, io.readwrite, type, type.string], 16, "colorNameBC"], [[io, io.readwrite, type, type.float64], 16, "gloss"], [[io, io.readwrite, type, type.float64], 16, "weight"], [[io, io.readwrite, type, type.uint8], 16, "hasGloss"], [[io, io.readwrite, type, type.uint8], 16, "hasWeight"], [[io, io.readwrite, void 0, type.model("CjsCharacterOrigin")], 16, "origin"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_origin(this);
  }
  colorKey = _init_colorKey(this, "");
  colorNameA = (_init_extra_colorKey(this), _init_colorNameA(this, ""));
  colorNameBC = (_init_extra_colorNameA(this), _init_colorNameBC(this, null));
  gloss = (_init_extra_colorNameBC(this), _init_gloss(this, 0));
  weight = (_init_extra_gloss(this), _init_weight(this, 0));
  hasGloss = (_init_extra_weight(this), _init_hasGloss(this, 0));
  hasWeight = (_init_extra_hasGloss(this), _init_hasWeight(this, 0));
  origin = (_init_extra_hasWeight(this), _init_origin(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterAppearan as CjsCharacterAppearanceColorSelection };
//# sourceMappingURL=CjsCharacterAppearanceColorSelection.js.map
