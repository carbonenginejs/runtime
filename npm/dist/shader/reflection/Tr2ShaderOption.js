import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_name, _init_extra_name, _init_value, _init_extra_value;

/**
 * Mutable authored option on the Tr2Effect facade.
 *
 * Tr2EffectRes accepts this plain name/value shape but does not own authored
 * option lifetime.
 */
let _Tr2ShaderOption;
class Tr2ShaderOption extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_value, _init_extra_value],
      c: [_Tr2ShaderOption, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ShaderOption",
      family: "shader"
    })], [[[void 0, io.rebuild("pipeline"), io, io.persist, type, type.string], 16, "name"], [[void 0, io.rebuild("pipeline"), io, io.persist, type, type.string], 16, "value"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_value(this);
  }
  /** name (BlueSharedString) */
  name = _init_name(this, "");

  /** value (BlueSharedString) */
  value = (_init_extra_name(this), _init_value(this, ""));
  static {
    _initClass();
  }
}

export { _Tr2ShaderOption as Tr2ShaderOption };
//# sourceMappingURL=Tr2ShaderOption.js.map
