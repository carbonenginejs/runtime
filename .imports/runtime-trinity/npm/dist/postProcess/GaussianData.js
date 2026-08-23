import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_overallWeight, _init_extra_overallWeight, _init_count, _init_extra_count, _init_weightOffset, _init_extra_weightOffset;

/** GaussianData (postProcess) - generated from schema shapeHash da83d9d1.... */
let _GaussianData;
class GaussianData extends CjsModel {
  static {
    ({
      e: [_init_overallWeight, _init_extra_overallWeight, _init_count, _init_extra_count, _init_weightOffset, _init_extra_weightOffset],
      c: [_GaussianData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "GaussianData",
      family: "postProcess"
    })], [[[type, type.vec3], 16, "overallWeight"], [[type, type.uint32], 16, "count"], [[type, type.vec4], 16, "weightOffset"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_weightOffset(this);
  }
  /** overallWeight (Vector3) */
  overallWeight = _init_overallWeight(this, vec3.create());

  /** count (uint32_t) */
  count = (_init_extra_overallWeight(this), _init_count(this, 0));

  /** weightOffset (Vector4) */
  weightOffset = (_init_extra_count(this), _init_weightOffset(this, vec4.create()));
  static {
    _initClass();
  }
}

export { _GaussianData as GaussianData };
//# sourceMappingURL=GaussianData.js.map
