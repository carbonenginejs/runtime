import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_time, _init_extra_time, _init_value, _init_extra_value;

/**
 * One key of a matrix curve: a time in seconds and the 4x4 matrix value at that
 * time.
 */
let _Tr2MatrixKey;
class Tr2MatrixKey extends CjsModel {
  static {
    ({
      e: [_init_time, _init_extra_time, _init_value, _init_extra_value],
      c: [_Tr2MatrixKey, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2MatrixKey",
      family: "curves"
    })], [[[io, io.persist, type, type.float32], 16, "time"], [[io, io.persist, type, type.mat4], 16, "value"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_value(this);
  }
  time = _init_time(this, 0);
  value = (_init_extra_time(this), _init_value(this, mat4.create()));
  static {
    _initClass();
  }
}

export { _Tr2MatrixKey as Tr2MatrixKey };
//# sourceMappingURL=Tr2MatrixKey.js.map
