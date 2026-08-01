import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { IncarnaScalarCurveInterpolation } from './enums.js';

let _initClass, _init_name, _init_extra_name, _init_time, _init_extra_time, _init_value, _init_extra_value, _init_leftTangent, _init_extra_leftTangent, _init_rightTangent, _init_extra_rightTangent, _init_interpolation, _init_extra_interpolation;

/** One key in a historical Incarna scalar curve. */
let _Tr2ScalarKey;
new class extends _identity {
  static [class Tr2ScalarKey extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_time, _init_extra_time, _init_value, _init_extra_value, _init_leftTangent, _init_extra_leftTangent, _init_rightTangent, _init_extra_rightTangent, _init_interpolation, _init_extra_interpolation],
        c: [_Tr2ScalarKey, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ScalarKey",
        family: "incarna"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.float32], 16, "time"], [[io, io.persist, type, type.float32], 16, "value"], [[io, io.persist, type, type.float32], 16, "leftTangent"], [[io, io.persist, type, type.float32], 16, "rightTangent"], [[io, io.persist, type, type.uint32, void 0, schema.enum("Interpolation")], 16, "interpolation"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_interpolation(this);
    }
    name = _init_name(this, "");
    time = (_init_extra_name(this), _init_time(this, 0));
    value = (_init_extra_time(this), _init_value(this, 0));
    leftTangent = (_init_extra_value(this), _init_leftTangent(this, 0));
    rightTangent = (_init_extra_leftTangent(this), _init_rightTangent(this, 0));
    interpolation = (_init_extra_rightTangent(this), _init_interpolation(this, IncarnaScalarCurveInterpolation.LINEAR));
  }];
  Interpolation = IncarnaScalarCurveInterpolation;
  constructor() {
    super(_Tr2ScalarKey), _initClass();
  }
}();

export { _Tr2ScalarKey as Tr2ScalarKey };
//# sourceMappingURL=Tr2ScalarKey.js.map
