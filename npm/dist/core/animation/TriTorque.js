import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_time, _init_extra_time, _init_rot, _init_extra_rot, _init_omega, _init_extra_omega, _init_torque, _init_extra_torque;

/** TriTorque (trinityCore) - generated from schema shapeHash 10c5e0d6.... */
let _TriTorque;
class TriTorque extends CjsModel {
  static {
    ({
      e: [_init_time, _init_extra_time, _init_rot, _init_extra_rot, _init_omega, _init_extra_omega, _init_torque, _init_extra_torque],
      c: [_TriTorque, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriTorque",
      family: "trinityCore"
    })], [[[io, io.persist, type, type.float32], 16, "time"], [[io, io.persist, type, type.quat], 16, "rot0"], [[io, io.persist, type, type.vec3], 16, "omega0"], [[io, io.persist, type, type.vec3], 16, "torque"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_torque(this);
  }
  /** mTime (float) [READWRITE, PERSIST] */
  time = _init_time(this, 0);

  /** mRot0 (Quaternion) [READWRITE, PERSIST] */
  rot0 = (_init_extra_time(this), _init_rot(this, quat.create()));

  /** mOmega0 (Vector3) [READWRITE, PERSIST] */
  omega0 = (_init_extra_rot(this), _init_omega(this, vec3.create()));

  /** mTorque (Vector3) [READWRITE, PERSIST] */
  torque = (_init_extra_omega(this), _init_torque(this, vec3.create()));
  static {
    _initClass();
  }
}

export { _TriTorque as TriTorque };
//# sourceMappingURL=TriTorque.js.map
