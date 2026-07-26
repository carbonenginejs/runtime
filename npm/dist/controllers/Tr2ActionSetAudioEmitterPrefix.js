import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { ITr2ControllerAction } from './ITr2ControllerAction.js';

let _initProto, _initClass, _init_emitter, _init_extra_emitter, _init_prefix, _init_extra_prefix;

/**
 * Controller action that sets the event-name prefix on a named audio emitter
 * when it starts, changing which bank events later sounds resolve to.
 */
let _Tr2ActionSetAudioEmi;
class Tr2ActionSetAudioEmitterPrefix extends CjsModel {
  static {
    ({
      e: [_init_emitter, _init_extra_emitter, _init_prefix, _init_extra_prefix, _initProto],
      c: [_Tr2ActionSetAudioEmi, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ActionSetAudioEmitterPrefix",
      family: "controllers"
    })], [[[io, io.persist, type, type.string], 16, "emitter"], [[io, io.persist, type, type.string], 16, "prefix"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartWithController"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_prefix(this);
  }
  emitter = (_initProto(this), _init_emitter(this, ""));
  prefix = (_init_extra_emitter(this), _init_prefix(this, ""));

  /**
   * Sets the prefix on a named audio emitter.
   */
  Start(controller) {
    const emitter = ITr2ControllerAction.findSoundEmitter(ITr2ControllerAction.getOwner(controller), this.emitter);
    if (!ITr2ControllerAction.hasFunction(emitter, "SetPrefix")) {
      return;
    }
    emitter.SetPrefix(this.prefix);
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

export { _Tr2ActionSetAudioEmi as Tr2ActionSetAudioEmitterPrefix };
//# sourceMappingURL=Tr2ActionSetAudioEmitterPrefix.js.map
