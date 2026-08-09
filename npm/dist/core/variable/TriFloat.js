import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_value, _init_extra_value;

/** TriFloat (trinityCore) - generated from schema shapeHash b5384f79.... */
let _TriFloat;
class TriFloat extends CjsModel {
  static {
    ({
      e: [_init_value, _init_extra_value],
      c: [_TriFloat, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriFloat",
      family: "trinityCore"
    })], [[[io, io.persist, type, type.float32], 16, "value"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_value(this);
  }
  /** m_value (float) [READWRITE, PERSIST] */
  value = _init_value(this, 0);
  static {
    _initClass();
  }
}

export { _TriFloat as TriFloat };
//# sourceMappingURL=TriFloat.js.map
