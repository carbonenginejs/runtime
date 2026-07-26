import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { ITr2ControllerAction } from './ITr2ControllerAction.js';

let _initProto, _initClass, _init_emitter, _init_extra_emitter, _init_switchGroup, _init_extra_switchGroup, _init_switchState, _init_extra_switchState;

/**
 * Controller action that sets a Wwise switch group to a given state on a named
 * audio emitter when it starts.
 */
let _Tr2ActionSetAudioSwi;
class Tr2ActionSetAudioSwitch extends CjsModel {
  static {
    ({
      e: [_init_emitter, _init_extra_emitter, _init_switchGroup, _init_extra_switchGroup, _init_switchState, _init_extra_switchState, _initProto],
      c: [_Tr2ActionSetAudioSwi, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ActionSetAudioSwitch",
      family: "controllers"
    })], [[[io, io.persist, type, type.string], 16, "emitter"], [[io, io.persist, type, type.string], 16, "switchGroup"], [[io, io.persist, type, type.string], 16, "switchState"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartWithController"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_switchState(this);
  }
  emitter = (_initProto(this), _init_emitter(this, ""));
  switchGroup = (_init_extra_emitter(this), _init_switchGroup(this, ""));
  switchState = (_init_extra_switchGroup(this), _init_switchState(this, ""));

  /**
   * Sets a Wwise-style switch on a named emitter.
   */
  Start(controller) {
    const emitter = ITr2ControllerAction.findSoundEmitter(ITr2ControllerAction.getOwner(controller), this.emitter);
    if (!ITr2ControllerAction.hasFunction(emitter, "SetSwitch")) {
      return;
    }
    emitter.SetSwitch(this.switchGroup, this.switchState);
  }

  /**
   * Starts manually with an explicit controller.
   */
  StartWithController(controller) {
    this.Start(ITr2ControllerAction.requireController(controller, "StartWithController"));
  }
  static {
    _initClass();
  }
}

export { _Tr2ActionSetAudioSwi as Tr2ActionSetAudioSwitch };
//# sourceMappingURL=Tr2ActionSetAudioSwitch.js.map
