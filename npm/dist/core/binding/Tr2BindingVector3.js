import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_value, _init_extra_value;

/** Tr2BindingVector3 (trinityCore) - generated from schema shapeHash a8ef1406.... */
let _Tr2BindingVector;
class Tr2BindingVector3 extends CjsModel {
  static {
    ({
      e: [_init_value, _init_extra_value],
      c: [_Tr2BindingVector, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2BindingVector3",
      family: "trinityCore"
    })], [[[io, io.persist, type, type.vec3], 16, "value"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_value(this);
  }
  /** m_value (Vector3) [READWRITE, PERSIST] */
  value = _init_value(this, vec3.create());
  static {
    _initClass();
  }
}

export { _Tr2BindingVector as Tr2BindingVector3 };
//# sourceMappingURL=Tr2BindingVector3.js.map
