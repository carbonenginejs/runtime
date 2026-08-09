import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2CurveInterpolation, Tr2CurveTangentType } from '../enums.js';

let _initClass, _init_time, _init_extra_time, _init_value, _init_extra_value, _init_leftTangent, _init_extra_leftTangent, _init_rightTangent, _init_extra_rightTangent, _init_id, _init_extra_id, _init_interpolation, _init_extra_interpolation, _init_tangentType, _init_extra_tangentType;

/**
 * One key of a Tr2CurveScalar: a time in seconds, a value, its left and right
 * tangents in value units per unit time, the interpolation used to reach the
 * next key, and the tangent-type rule that maintains the tangents.
 */
let _Tr2CurveScalarKey;
class Tr2CurveScalarKey extends CjsModel {
  static {
    ({
      e: [_init_time, _init_extra_time, _init_value, _init_extra_value, _init_leftTangent, _init_extra_leftTangent, _init_rightTangent, _init_extra_rightTangent, _init_id, _init_extra_id, _init_interpolation, _init_extra_interpolation, _init_tangentType, _init_extra_tangentType],
      c: [_Tr2CurveScalarKey, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2CurveScalarKey",
      family: "curves"
    })], [[[type, type.float32], 16, "time"], [[type, type.float32], 16, "value"], [[type, type.float32], 16, "leftTangent"], [[type, type.float32], 16, "rightTangent"], [[type, type.uint16], 16, "id"], [[type, type.uint8], 16, "interpolation"], [[type, type.uint8], 16, "tangentType"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_tangentType(this);
  }
  time = _init_time(this, 0);
  value = (_init_extra_time(this), _init_value(this, 0));
  leftTangent = (_init_extra_value(this), _init_leftTangent(this, 0));
  rightTangent = (_init_extra_leftTangent(this), _init_rightTangent(this, 0));
  id = (_init_extra_rightTangent(this), _init_id(this, 0));
  interpolation = (_init_extra_id(this), _init_interpolation(this, Tr2CurveInterpolation.HERMITE));
  tangentType = (_init_extra_interpolation(this), _init_tangentType(this, Tr2CurveTangentType.AUTO_CLAMP));
  static {
    _initClass();
  }
}

export { _Tr2CurveScalarKey as Tr2CurveScalarKey };
//# sourceMappingURL=Tr2CurveScalarKey.js.map
