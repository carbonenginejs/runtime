import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveVirtualCameraBehaviourVector3Base as _EveVirtualCameraBeha$1 } from './EveVirtualCameraBehaviourVector3Base.js';

let _initProto, _initClass, _init_inertiaFactor, _init_extra_inertiaFactor;

/**
 * Vector3 behaviour that gives the camera value momentum, so it accelerates
 * towards its target and coasts rather than tracking it exactly.
 */
let _EveVirtualCameraBeha;
class EveVirtualCameraBehaviourVector3Inertia extends _EveVirtualCameraBeha$1 {
  static {
    ({
      e: [_init_inertiaFactor, _init_extra_inertiaFactor, _initProto],
      c: [_EveVirtualCameraBeha, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveVirtualCameraBehaviourVector3Inertia",
      family: "eve/virtualCamera/behaviour"
    })], [[[io, io.persist, type, type.float32], 16, "inertiaFactor"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"]], 0, void 0, _EveVirtualCameraBeha$1));
  }
  inertiaFactor = (_initProto(this), _init_inertiaFactor(this, 1));
  #lastPosition = (_init_extra_inertiaFactor(this), vec3.create());
  #lastVelocity = vec3.create();

  /**
   * Names the behaviour "Inertia"; the default factor of 1 applies the full
   * correction each update.
   */
  constructor() {
    super();
    this.name = "Inertia";
  }

  /**
   * Accelerates a retained velocity towards the incoming position by the
   * position error less the current velocity, divided by inertiaFactor (larger
   * values are heavier and slower to respond), advances the retained position by
   * it and returns the offset from the incoming position; the first update seeds
   * position and velocity and returns zero.
   */
  Update(_camera, current, deltaTime, localElapsedTime, _anchorPosition, _anchorRadius, _anchorForwardDirection, out = vec3.create()) {
    if (localElapsedTime <= 0) {
      vec3.zero(this.#lastVelocity);
      vec3.copy(this.#lastPosition, current);
      return vec3.zero(out);
    }
    const delta = vec3.subtract(vec3.create(), current, this.#lastPosition);
    vec3.subtract(delta, delta, this.#lastVelocity);
    vec3.scaleAndAdd(this.#lastVelocity, this.#lastVelocity, delta, 1 / this.inertiaFactor);
    vec3.add(this.#lastPosition, this.#lastPosition, this.#lastVelocity);
    vec3.scale(this.#lastVelocity, this.#lastVelocity, deltaTime);
    return vec3.subtract(out, this.#lastPosition, current);
  }
  static {
    _initClass();
  }
}

export { _EveVirtualCameraBeha as EveVirtualCameraBehaviourVector3Inertia };
//# sourceMappingURL=EveVirtualCameraBehaviourVector3Inertia.js.map
