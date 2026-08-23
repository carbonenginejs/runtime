import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_closestAgentInGroup, _init_extra_closestAgentInGroup, _init_rotation, _init_extra_rotation, _init_position, _init_extra_position, _init_acceleration, _init_extra_acceleration, _init_velocity, _init_extra_velocity, _init_accelerationLength, _init_extra_accelerationLength, _init_velocityLength, _init_extra_velocityLength, _init_target, _init_extra_target, _init_targetDirection, _init_extra_targetDirection, _init_id, _init_extra_id, _init_lifetime, _init_extra_lifetime, _init_playFX, _init_extra_playFX, _init_fxStartTime, _init_extra_fxStartTime, _init_lastTransform, _init_extra_lastTransform, _init_xfade, _init_extra_xfade, _init_isVisible, _init_extra_isVisible, _init_screenSize, _init_extra_screenSize;

/** DroneAgent (eve/child/behaviors) - generated from schema shapeHash c50899e8.... */
let _DroneAgent;
class DroneAgent extends CjsModel {
  static {
    ({
      e: [_init_closestAgentInGroup, _init_extra_closestAgentInGroup, _init_rotation, _init_extra_rotation, _init_position, _init_extra_position, _init_acceleration, _init_extra_acceleration, _init_velocity, _init_extra_velocity, _init_accelerationLength, _init_extra_accelerationLength, _init_velocityLength, _init_extra_velocityLength, _init_target, _init_extra_target, _init_targetDirection, _init_extra_targetDirection, _init_id, _init_extra_id, _init_lifetime, _init_extra_lifetime, _init_playFX, _init_extra_playFX, _init_fxStartTime, _init_extra_fxStartTime, _init_lastTransform, _init_extra_lastTransform, _init_xfade, _init_extra_xfade, _init_isVisible, _init_extra_isVisible, _init_screenSize, _init_extra_screenSize],
      c: [_DroneAgent, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "DroneAgent",
      family: "eve/child/behaviors"
    })], [[type.objectRef("DroneAgent"), 0, "closestAgentInGroup"], [[type, type.quat], 16, "rotation"], [[type, type.vec3], 16, "position"], [[type, type.vec3], 16, "acceleration"], [[type, type.vec3], 16, "velocity"], [[type, type.float32], 16, "accelerationLength"], [[type, type.float32], 16, "velocityLength"], [[type, type.vec3], 16, "target"], [[type, type.vec3], 16, "targetDirection"], [[type, type.int32], 16, "id"], [[type, type.float32], 16, "lifetime"], [[type, type.boolean], 16, "playFX"], [[type, type.float64], 16, "fxStartTime"], [[type, type.mat4], 16, "lastTransform"], [[type, type.float32], 16, "xfade"], [[type, type.boolean], 16, "isVisible"], [[type, type.float32], 16, "screenSize"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_screenSize(this);
  }
  /** closestAgentInGroup (DroneAgent*) */
  closestAgentInGroup = _init_closestAgentInGroup(this, null);

  /** rotation (Quaternion) */
  rotation = (_init_extra_closestAgentInGroup(this), _init_rotation(this, quat.create()));

  /** position (Vector3) */
  position = (_init_extra_rotation(this), _init_position(this, vec3.create()));

  /** acceleration (Vector3) */
  acceleration = (_init_extra_position(this), _init_acceleration(this, vec3.create()));

  /** velocity (Vector3) */
  velocity = (_init_extra_acceleration(this), _init_velocity(this, vec3.create()));

  /** accelerationLength (float) */
  accelerationLength = (_init_extra_velocity(this), _init_accelerationLength(this, 0));

  /** velocityLength (float) */
  velocityLength = (_init_extra_accelerationLength(this), _init_velocityLength(this, 0));

  /** target (Vector3) */
  target = (_init_extra_velocityLength(this), _init_target(this, vec3.create()));

  /** targetDirection (Vector3) */
  targetDirection = (_init_extra_target(this), _init_targetDirection(this, vec3.create()));

  /** id (int) */
  id = (_init_extra_targetDirection(this), _init_id(this, 0));

  /** lifetime (float) */
  lifetime = (_init_extra_id(this), _init_lifetime(this, 0));

  /** playFX (bool) */
  playFX = (_init_extra_lifetime(this), _init_playFX(this, false));

  /** fxStartTime (Be::Time) */
  fxStartTime = (_init_extra_playFX(this), _init_fxStartTime(this, 0));

  /** lastTransform (Matrix) */
  lastTransform = (_init_extra_fxStartTime(this), _init_lastTransform(this, mat4.create()));

  /** xfade (float) */
  xfade = (_init_extra_lastTransform(this), _init_xfade(this, 0));

  /** isVisible (bool) */
  isVisible = (_init_extra_xfade(this), _init_isVisible(this, false));

  /** screenSize (float) */
  screenSize = (_init_extra_isVisible(this), _init_screenSize(this, 0));
  static {
    _initClass();
  }
}

export { _DroneAgent as DroneAgent };
//# sourceMappingURL=DroneAgent.js.map
