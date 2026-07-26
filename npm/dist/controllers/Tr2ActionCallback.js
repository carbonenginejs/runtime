import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_callbackName, _init_extra_callbackName;

/**
 * Controller action that fires a named callback on its controller when the
 * action starts, letting host code hook a point in a state machine or timeline.
 */
let _Tr2ActionCallback;
class Tr2ActionCallback extends CjsModel {
  static {
    ({
      e: [_init_callbackName, _init_extra_callbackName, _initProto],
      c: [_Tr2ActionCallback, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ActionCallback",
      family: "controllers"
    })], [[[io, io.persist, type, type.string], 16, "callbackName"], [[carbon, carbon.method, impl, impl.implemented], 18, "Start"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_callbackName(this);
  }
  callbackName = (_initProto(this), _init_callbackName(this, ""));

  /**
   * Notifies the linked controller callback registry.
   */
  Start(controller) {
    if (this.callbackName) {
      controller.Callback?.(this.callbackName);
    }
  }
  static {
    _initClass();
  }
}

export { _Tr2ActionCallback as Tr2ActionCallback };
//# sourceMappingURL=Tr2ActionCallback.js.map
