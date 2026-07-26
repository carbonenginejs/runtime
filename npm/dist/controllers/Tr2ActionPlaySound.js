import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { ITr2ControllerAction } from './ITr2ControllerAction.js';

let _initProto, _initClass, _init_emitter, _init_extra_emitter, _init_event, _init_extra_event, _init_target, _init_extra_target, _init_bypassPrefix, _init_extra_bypassPrefix;

/**
 * Controller action that fires a one-shot audio event on a named emitter when
 * the action starts; it has no stop behaviour.
 */
let _Tr2ActionPlaySound;
new class extends _identity {
  static [class Tr2ActionPlaySound extends CjsModel {
    static {
      ({
        e: [_init_emitter, _init_extra_emitter, _init_event, _init_extra_event, _init_target, _init_extra_target, _init_bypassPrefix, _init_extra_bypassPrefix, _initProto],
        c: [_Tr2ActionPlaySound, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ActionPlaySound",
        family: "controllers"
      })], [[[io, io.persist, type, type.string], 16, "emitter"], [[io, io.persist, type, type.string], 16, "event"], [[io, io.persist, type, type.string], 16, "target"], [[io, io.persist, type, type.boolean], 16, "bypassPrefix"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartWithController"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_bypassPrefix(this);
    }
    emitter = (_initProto(this), _init_emitter(this, ""));
    event = (_init_extra_emitter(this), _init_event(this, ""));
    target = (_init_extra_event(this), _init_target(this, ""));
    bypassPrefix = (_init_extra_target(this), _init_bypassPrefix(this, false));

    /**
     * Plays a sound event on the resolved audio emitter.
     */
    Start(controller) {
      const owner = _Tr2ActionPlaySound.#resolveOwner(ITr2ControllerAction.getOwner(controller), this.target);
      const emitter = ITr2ControllerAction.findSoundEmitter(owner, this.emitter);
      if (!ITr2ControllerAction.hasFunction(emitter, "SendEvent")) {
        return;
      }
      emitter.SendEvent(this.event, this.bypassPrefix);
    }

    /**
     * Starts manually with an explicit controller.
     */
    StartWithController(controller) {
      this.Start(ITr2ControllerAction.requireController(controller, "StartWithController"));
    }

    /**
     * Redirects to the object named by `target`, preferring a named parameter
     * owner and otherwise a named effect child; an empty target keeps the
     * controller owner.
     */
  }];
  #resolveOwner(owner, target) {
    if (!owner || !target) {
      return owner;
    }
    if (ITr2ControllerAction.hasFunction(owner, "GetParameterByName")) {
      return ITr2ControllerAction.getParameterOwner(owner, target);
    }
    if (ITr2ControllerAction.hasFunction(owner, "GetEffectChildByName")) {
      return ITr2ControllerAction.asObject(owner.GetEffectChildByName(target));
    }
    return owner;
  }
  constructor() {
    super(_Tr2ActionPlaySound), _initClass();
  }
}();

export { _Tr2ActionPlaySound as Tr2ActionPlaySound };
//# sourceMappingURL=Tr2ActionPlaySound.js.map
