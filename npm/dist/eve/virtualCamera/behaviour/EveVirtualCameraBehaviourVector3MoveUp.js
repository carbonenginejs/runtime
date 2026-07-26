import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { EveVirtualCameraBehaviourVector3MoveForward as _EveVirtualCameraBeha$1 } from './EveVirtualCameraBehaviourVector3MoveForward.js';

let _initProto, _initClass;

/**
 * Vector3 behaviour that displaces the camera along its own up axis by a
 * curve-shaped distance.
 */
let _EveVirtualCameraBeha;
class EveVirtualCameraBehaviourVector3MoveUp extends _EveVirtualCameraBeha$1 {
  static {
    ({
      e: [_initProto],
      c: [_EveVirtualCameraBeha, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveVirtualCameraBehaviourVector3MoveUp",
      family: "eve/virtualCamera/behaviour"
    })], [[[carbon, carbon.method, impl, impl.adapted], 18, "Update"]], 0, void 0, _EveVirtualCameraBeha$1));
  }
  /**
   * Names the behaviour "Move Up" and inherits the forward variant's scale curve
   * setup.
   */
  constructor() {
    _initProto(super("Move Up"));
  }

  /**
   * Returns the camera's up direction scaled by the current distance; the up
   * axis already includes the camera roll.
   */
  Update(camera, _current, _deltaTime, localElapsedTime, _anchorPosition, anchorRadius, _anchorForwardDirection, out = vec3.create()) {
    return vec3.scale(out, camera.GetUpDirection(out), this.GetCurrentValue(camera, localElapsedTime, anchorRadius));
  }
  static {
    _initClass();
  }
}

export { _EveVirtualCameraBeha as EveVirtualCameraBehaviourVector3MoveUp };
//# sourceMappingURL=EveVirtualCameraBehaviourVector3MoveUp.js.map
