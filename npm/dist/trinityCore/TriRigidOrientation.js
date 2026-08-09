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
    })], [[[io, io.persist, type, type.float32], 16, "drag"], [[io, io.persist, type, type.float64], 16, "start"], [[io, io.persist, type, type.float32], 16, "I"], [[io, io.persist, void 0, type.list("TriTorque")], 16, "states"], [[io, io.persist, type, type.quat], 16, "value"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "Sort"], [[carbon, carbon.method, impl, impl.implemented], 18, "Seek"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"]], 0, void 0, CjsModel));
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

  // Carbon TriRigidOrientation.cpp:36-172. Sort precomputes each key's start
  // state; these sample BETWEEN keys, integrating the active key's torque
  // forward by the elapsed time with the same closed-form drag solution
  // (TriMath.cpp:153-176):
  //
  //   angle    = a*t/k + I*(v*k - a)/k^2 * (1 - e^(-k*t/I))
  //   velocity = a/k + (v - a/k) * e^(-k*t/I)
  //
  // where a is torque, v the angular velocity at the key, I the moment of
  // inertia and k the drag. The integrated angle becomes a pure quaternion
  // whose exponential is the rotation accumulated since the key.

  /**
   * Selects the key covering a time, matching Carbon's cursor reuse: the
   * cached key is kept when it still brackets the time, and only a miss walks
   * the list.
   */
  Seek(time) {
    const count = this.states.length;
    if (!count) return -1;
    if (time >= this.states[count - 1].time) {
      this.#currentKey = count - 1;
      return this.#currentKey;
    }
    if (this.#currentKey === count - 1) this.#currentKey = 0;
    const key = this.states[this.#currentKey];
    if (time < key.time || time >= this.states[this.#currentKey + 1].time) {
      for (this.#currentKey = 0; this.#currentKey < count - 1; this.#currentKey++) {
        if (time >= this.states[this.#currentKey].time && time < this.states[this.#currentKey + 1].time) break;
      }
    }
    return this.#currentKey;
  }

  /**
   * The orientation at a time measured from the start, written into `out`;
   * before the first key it is the retained value.
   */
  GetValueAt(out, time) {
    if (!this.states.length || time < 0 || time < this.states[0].time) {
      return quat.copy(out, this.value);
    }
    const key = this.states[this.Seek(time)];
    const elapsed = time - key.time;
    const decay = Math.exp(-this.drag * elapsed / this.I);
    for (let axis = 0; axis < 3; axis++) {
      const acceleration = key.torque[axis];
      const velocity = key.omega0[axis];
      ANGLE_SCRATCH[axis] = acceleration * elapsed / this.drag + this.I * (velocity * this.drag - acceleration) / (this.drag * this.drag) * (1 - decay);
    }
    quat.set(CONVERTER_SCRATCH, ANGLE_SCRATCH[0], ANGLE_SCRATCH[1], ANGLE_SCRATCH[2], 0);
    quat.exp(CONVERTER_SCRATCH, CONVERTER_SCRATCH);

    // Carbon (row-vector): rot0 * converter, the key's orientation first.
    return quat.multiply(out, CONVERTER_SCRATCH, key.rot0);
  }

  /**
   * The angular velocity at a time measured from the start, written into
   * `out`; before the first key it is zero.
   */
  GetValueDotAt(out, time) {
    if (!this.states.length || time < 0 || time < this.states[0].time) {
      return vec3.set(out, 0, 0, 0);
    }
    const key = this.states[this.Seek(time)];
    const decay = Math.exp(-this.drag * (time - key.time) / this.I);
    for (let axis = 0; axis < 3; axis++) {
      const terminal = key.torque[axis] / this.drag;
      out[axis] = terminal + (key.omega0[axis] - terminal) * decay;
    }
    return out;
  }

  /**
   * Samples the orientation at a time and retains it as the current value,
   * which is what a curve consumer reads back.
   */
  Update(out, time) {
    this.GetValueAt(this.value, time);
    return quat.copy(out, this.value);
  }
  #currentKey = (_init_extra_name(this), 0);
  static {
    _initClass();
  }
}
const ANGLE_SCRATCH = vec3.create();
const CONVERTER_SCRATCH = quat.create();

export { _TriRigidOrientation as TriRigidOrientation };
//# sourceMappingURL=TriRigidOrientation.js.map
