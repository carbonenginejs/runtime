import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_rotation, _init_extra_rotation, _init_acceleration, _init_extra_acceleration, _init_velocity, _init_extra_velocity, _init_position, _init_extra_position, _init_wanderTarget, _init_extra_wanderTarget, _init_roll, _init_extra_roll;

/** SwarmVehicle (eve/spaceObject/swarm) - generated from schema shapeHash ad1e4b43.... */
let _SwarmVehicle;
class SwarmVehicle extends CjsModel {
  static {
    ({
      e: [_init_rotation, _init_extra_rotation, _init_acceleration, _init_extra_acceleration, _init_velocity, _init_extra_velocity, _init_position, _init_extra_position, _init_wanderTarget, _init_extra_wanderTarget, _init_roll, _init_extra_roll],
      c: [_SwarmVehicle, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "SwarmVehicle",
      family: "eve/spaceObject/swarm"
    })], [[[type, type.quat], 16, "rotation"], [[type, type.vec3], 16, "acceleration"], [[type, type.vec3], 16, "velocity"], [[type, type.vec3], 16, "position"], [[type, type.vec3], 16, "wanderTarget"], [[type, type.float32], 16, "roll"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_roll(this);
  }
  /** rotation (Quaternion) */
  rotation = _init_rotation(this, quat.create());

  /** acceleration (Vector3) */
  acceleration = (_init_extra_rotation(this), _init_acceleration(this, vec3.create()));

  /** velocity (Vector3) */
  velocity = (_init_extra_acceleration(this), _init_velocity(this, vec3.create()));

  /** position (Vector3) */
  position = (_init_extra_velocity(this), _init_position(this, vec3.create()));

  /** wanderTarget (Vector3) */
  wanderTarget = (_init_extra_position(this), _init_wanderTarget(this, vec3.create()));

  /** roll (float) */
  roll = (_init_extra_wanderTarget(this), _init_roll(this, 0));
  static {
    _initClass();
  }
}

export { _SwarmVehicle as SwarmVehicle };
//# sourceMappingURL=SwarmVehicle.js.map
