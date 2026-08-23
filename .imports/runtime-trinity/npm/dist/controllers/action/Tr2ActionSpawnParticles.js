import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { ITr2GenericEmitter as _ITr2GenericEmitter } from '../../generated/particle/ITr2GenericEmitter.js';
import { ITr2ControllerAction } from './ITr2ControllerAction.js';

let _initProto, _initClass, _init_emitter, _init_extra_emitter, _init_rate, _init_extra_rate;

/**
 * Controller action that emits a one-shot burst of particles from a dynamic
 * emitter when it starts.
 */
let _Tr2ActionSpawnPartic;
new class extends _identity {
  static [class Tr2ActionSpawnParticles extends CjsModel {
    static {
      ({
        e: [_init_emitter, _init_extra_emitter, _init_rate, _init_extra_rate, _initProto],
        c: [_Tr2ActionSpawnPartic, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ActionSpawnParticles",
        family: "controllers"
      })], [[[io, io.persist, void 0, type.objectRef("Tr2DynamicEmitter")], 16, "emitter"], [[io, io.persist, type, type.float32], 16, "rate"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_rate(this);
    }
    emitter = (_initProto(this), _init_emitter(this, null));
    rate = (_init_extra_emitter(this), _init_rate(this, 1));

    /**
     * Spawns particles on the configured emitter.
     */
    Start(_controller) {
      if (!ITr2ControllerAction.hasFunction(this.emitter, "SpawnParticles")) {
        return;
      }
      this.emitter.SpawnParticles(_Tr2ActionSpawnPartic.#createEmitterUpdateArguments(), null, null, this.rate);
    }

    /**
     * Builds the emitter update arguments used for a manual spawn, with an emit
     * count factor of 1 so the authored rate is applied unscaled.
     */
  }];
  #createEmitterUpdateArguments() {
    const args = new _ITr2GenericEmitter();
    args.emitCountFactor = 1;
    return args;
  }
  constructor() {
    super(_Tr2ActionSpawnPartic), _initClass();
  }
}();

export { _Tr2ActionSpawnPartic as Tr2ActionSpawnParticles };
//# sourceMappingURL=Tr2ActionSpawnParticles.js.map
