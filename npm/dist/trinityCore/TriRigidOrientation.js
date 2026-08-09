import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_drag, _init_extra_drag, _init_start, _init_extra_start, _init_I, _init_extra_I, _init_states, _init_extra_states, _init_value, _init_extra_value, _init_name, _init_extra_name;

/** Integrates torque into an orientation over time, sampling the result at a given moment. */
let _TriRigidOrientation;
class TriRigidOrientation extends CjsModel {
  static {
    ({
      e: [_init_drag, _init_extra_drag, _init_start, _init_extra_start, _init_I, _init_extra_I, _init_states, _init_extra_states, _init_value, _init_extra_value, _init_name, _init_extra_name, _initProto],
      c: [_TriRigidOrientation, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriRigidOrientation",
      family: "trinityCore"
    })], [[[io, io.persist, type, type.float32], 16, "drag"], [[io, io.persist, type, type.float64], 16, "start"], [[io, io.persist, type, type.float32], 16, "I"], [[io, io.persist, void 0, type.list("TriTorque")], 16, "states"], [[io, io.persist, type, type.quat], 16, "value"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "Sort"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** mDrag (float) [READWRITE, PERSIST] */
  drag = (_initProto(this), _init_drag(this, 1));

  /** mStart (Be::Time) [READWRITE, PERSIST] */
  start = (_init_extra_drag(this), _init_start(this, 0));

  /** mI (float) [READWRITE, PERSIST] */
  I = (_init_extra_start(this), _init_I(this, 1));

  /** mStates (PTriTorqueVector) [READ, PERSIST] */
  states = (_init_extra_I(this), _init_states(this, []));

  /** mValue (Quaternion) [READWRITE, PERSIST] */
  value = (_init_extra_states(this), _init_value(this, quat.create()));

  /** mName (std::wstring) [READWRITE, PERSIST] */
  name = (_init_extra_value(this), _init_name(this, ""));

  /** Carbon method Sort (MAP_METHOD_AND_WRAP). */
  Sort() {
    this.states.sort((a, b) => a.time - b.time);
    const tau = vec3.create();
    const converter = quat.create();
    for (let i = 1; i < this.states.length; i++) {
      const current = this.states[i];
      const previous = this.states[i - 1];
      const elapsed = current.time - previous.time;
      const decay = Math.exp(-this.drag * elapsed / this.I);
      for (let axis = 0; axis < 3; axis++) {
        const acceleration = previous.torque[axis];
        const velocity = previous.omega0[axis];
        current.omega0[axis] = acceleration / this.drag + (velocity - acceleration / this.drag) * decay;
        tau[axis] = acceleration * elapsed / this.drag + this.I * (velocity * this.drag - acceleration) / (this.drag * this.drag) * (1 - decay);
      }
      quat.set(converter, tau[0], tau[1], tau[2], 0);
      quat.exp(converter, converter);
      // Carbon (row-vector): rot0 = previousRot0 * tauConverter - previous first.
      quat.multiply(current.rot0, converter, previous.rot0);
    }
    if (this.states.length) quat.copy(this.value, this.states[0].rot0);
  }
  static {
    _initClass();
  }
}

export { _TriRigidOrientation as TriRigidOrientation };
//# sourceMappingURL=TriRigidOrientation.js.map
