import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_data, _init_extra_data;

/** One vec4 row of a TriFloatArrayParameter's value list. */
let _TriVector;
class TriVector4 extends CjsModel {
  static {
    ({
      e: [_init_data, _init_extra_data],
      c: [_TriVector, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriVector4",
      family: "shader"
    })], [[[io, io.persist, type, type.vec4], 16, "data"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_data(this);
  }
  data = _init_data(this, vec4.create());
  static {
    _initClass();
  }
}

export { _TriVector as TriVector4 };
//# sourceMappingURL=TriVector4.js.map
