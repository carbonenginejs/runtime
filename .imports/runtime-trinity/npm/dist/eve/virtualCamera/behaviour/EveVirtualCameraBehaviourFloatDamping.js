import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveVirtualCameraBehaviourFloatBase as _EveVirtualCameraBeha$1 } from './EveVirtualCameraBehaviourFloatBase.js';

let _initProto, _initClass, _init_dampingFactor, _init_extra_dampingFactor;

/**
 * Float behaviour that lags a scalar camera value behind the value the other
 * behaviours produced, smoothing sudden changes.
 */
let _EveVirtualCameraBeha;
class EveVirtualCameraBehaviourFloatDamping extends _EveVirtualCameraBeha$1 {
  static {
    ({
      e: [_init_dampingFactor, _init_extra_dampingFactor, _initProto],
      c: [_EveVirtualCameraBeha, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveVirtualCameraBehaviourFloatDamping",
      family: "eve/virtualCamera/behaviour"
    })], [[[io, io.persist, type, type.float32], 16, "dampingFactor"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"]], 0, void 0, _EveVirtualCameraBeha$1));
  }
  dampingFactor = (_initProto(this), _init_dampingFactor(this, 1));
  #lastValue = (_init_extra_dampingFactor(this), 0);

  /**
   * Names the behaviour "Damping"; the default damping factor of 1 follows the
   * input exactly.
   */
  constructor() {
    super();
    this.name = "Damping";
  }

  /**
   * Moves the retained value a dampingFactor fraction of the way towards the
   * incoming value and returns the difference, so the accumulated result lands
   * on the smoothed value; the first update (local time at or below zero) only
   * seeds the retained value and contributes nothing.
   */
  Update(_camera, current, _deltaTime, localElapsedTime) {
    if (localElapsedTime <= 0) {
      this.#lastValue = current;
      return 0;
    }
    this.#lastValue += (current - this.#lastValue) * this.dampingFactor;
    return this.#lastValue - current;
  }
  static {
    _initClass();
  }
}

export { _EveVirtualCameraBeha as EveVirtualCameraBehaviourFloatDamping };
//# sourceMappingURL=EveVirtualCameraBehaviourFloatDamping.js.map
