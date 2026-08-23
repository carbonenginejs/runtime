import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveVirtualCameraBehaviourVector3Base as _EveVirtualCameraBeha$1 } from './EveVirtualCameraBehaviourVector3Base.js';

let _initProto, _initClass, _init_m_dampingRatio, _init_extra_m_dampingRatio;

/**
 * Vector3 behaviour that lags the camera position or point of interest behind
 * its target, giving a smooth follow with no overshoot.
 */
let _EveVirtualCameraBeha;
class EveVirtualCameraBehaviourVector3Damping extends _EveVirtualCameraBeha$1 {
  static {
    ({
      e: [_init_m_dampingRatio, _init_extra_m_dampingRatio, _initProto],
      c: [_EveVirtualCameraBeha, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveVirtualCameraBehaviourVector3Damping",
      family: "eve/virtualCamera/behaviour"
    })], [[[io, io.persist, type, type.float32], 16, "m_dampingRatio"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"]], 0, void 0, _EveVirtualCameraBeha$1));
  }
  m_dampingRatio = (_initProto(this), _init_m_dampingRatio(this, 1));
  #lastPosition = (_init_extra_m_dampingRatio(this), vec3.create());

  /**
   * Names the behaviour "Damping"; the default ratio of 1 follows the input
   * exactly.
   */
  constructor() {
    super();
    this.name = "Damping";
  }

  /**
   * Lerps the retained position towards the incoming one by m_dampingRatio and
   * returns the offset from the incoming position to that smoothed one; the
   * first update (local time at or below zero) seeds the retained position and
   * returns zero.
   */
  Update(_camera, current, _deltaTime, localElapsedTime, _anchorPosition, _anchorRadius, _anchorForwardDirection, out = vec3.create()) {
    if (localElapsedTime <= 0) {
      vec3.copy(this.#lastPosition, current);
      return vec3.zero(out);
    }
    vec3.lerp(this.#lastPosition, this.#lastPosition, current, this.m_dampingRatio);
    return vec3.subtract(out, this.#lastPosition, current);
  }
  static {
    _initClass();
  }
}

export { _EveVirtualCameraBeha as EveVirtualCameraBehaviourVector3Damping };
//# sourceMappingURL=EveVirtualCameraBehaviourVector3Damping.js.map
