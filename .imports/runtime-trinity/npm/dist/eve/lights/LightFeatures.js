import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_profileIndex, _init_extra_profileIndex, _init_parentScale, _init_extra_parentScale, _init_parentBrightness, _init_extra_parentBrightness;

/** LightFeatures (eve/lights) - generated from schema shapeHash 47b89708.... */
let _LightFeatures;
class LightFeatures extends CjsModel {
  static {
    ({
      e: [_init_profileIndex, _init_extra_profileIndex, _init_parentScale, _init_extra_parentScale, _init_parentBrightness, _init_extra_parentBrightness],
      c: [_LightFeatures, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "LightFeatures",
      family: "eve/lights"
    })], [[[type, type.int16], 16, "profileIndex"], [[type, type.float32], 16, "parentScale"], [[type, type.float32], 16, "parentBrightness"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_parentBrightness(this);
  }
  /** profileIndex (int16_t) */
  profileIndex = _init_profileIndex(this, 0);

  /** parentScale (float) */
  parentScale = (_init_extra_profileIndex(this), _init_parentScale(this, 1));

  /** parentBrightness (float) */
  parentBrightness = (_init_extra_parentScale(this), _init_parentBrightness(this, 1));
  static {
    _initClass();
  }
}

export { _LightFeatures as LightFeatures };
//# sourceMappingURL=LightFeatures.js.map
