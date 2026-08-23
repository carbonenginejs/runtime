import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsParameter } from './CjsParameter.js';

let _initClass, _init_name, _init_extra_name, _init_value, _init_extra_value;

/** Tr2ConstantEffectParameter (shader) - generated from schema shapeHash b4e14ee0.... */
let _Tr2ConstantEffectPar;
class Tr2ConstantEffectParameter extends CjsParameter {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_value, _init_extra_value],
      c: [_Tr2ConstantEffectPar, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ConstantEffectParameter",
      family: "shader"
    })], [[[void 0, io.rebuild("bindings"), io, io.persist, type, type.string], 16, "name"], [[void 0, io.rebuild("bindings"), io, io.persist, type, type.vec4], 16, "value"]], 0, void 0, CjsParameter));
  }
  constructor(...args) {
    super(...args);
    _init_extra_value(this);
  }
  /** name (BlueSharedString) - persisted via the constParameters structure list. */
  name = _init_name(this, "");

  /** value (Vector4) - persisted via the constParameters structure list. */
  value = (_init_extra_name(this), _init_value(this, vec4.create()));
  static {
    _initClass();
  }
}

export { _Tr2ConstantEffectPar as Tr2ConstantEffectParameter };
//# sourceMappingURL=Tr2ConstantEffectParameter.js.map
