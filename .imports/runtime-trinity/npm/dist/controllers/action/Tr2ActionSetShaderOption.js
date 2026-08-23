import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { ITr2ControllerAction } from './ITr2ControllerAction.js';

let _initProto, _initClass, _init_key, _init_extra_key, _init_value, _init_extra_value;

/**
 * Controller action that sets a named shader option on its owner when it starts,
 * changing which shader permutation the owner renders with.
 */
let _Tr2ActionSetShaderOp;
class Tr2ActionSetShaderOption extends CjsModel {
  static {
    ({
      e: [_init_key, _init_extra_key, _init_value, _init_extra_value, _initProto],
      c: [_Tr2ActionSetShaderOp, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ActionSetShaderOption",
      family: "controllers"
    })], [[[io, io.persist, type, type.string], 16, "key"], [[io, io.persist, type, type.string], 16, "value"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_value(this);
  }
  key = (_initProto(this), _init_key(this, ""));
  value = (_init_extra_key(this), _init_value(this, ""));

  /**
   * Sets a shader option on the controller owner when supported.
   */
  Start(controller) {
    const owner = ITr2ControllerAction.getOwner(controller);
    if (!ITr2ControllerAction.hasFunction(owner, "SetShaderOption")) {
      return;
    }
    owner.SetShaderOption(this.key, this.value);
  }
  static {
    _initClass();
  }
}

export { _Tr2ActionSetShaderOp as Tr2ActionSetShaderOption };
//# sourceMappingURL=Tr2ActionSetShaderOption.js.map
