// Source: trinity/trinity/TriRigidOrientation.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { ITriFunction, ITriQuaternionFunction } from "#blue";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/**
 * Integrates torque into an orientation over time using relative seconds.
 * Native ITriQuaternionFunction base and exact query order are retained.
 * The existing JS API implements the double-time overloads, not Be::Time
 * conversion/subtraction of start. GetValueDotAt is the Vector3 overload;
 * native quaternion first/second derivative overloads return their input
 * unchanged and remain unimplemented here (the inherited second-derivative
 * declaration returns undefined). No initialization contract sorts
 * the states automatically: callers explicitly invoke Sort.
 * Existing arrays adapt native PTriTorqueVector ownership/admission; TriTorque
 * has no native query mapping for BlueList admission. Number arithmetic,
 * Float32Array intermediates and module scratch retain the JS numeric path.
 */
@meta.define({ className: "TriRigidOrientation", family: "trinityCore" })
export class TriRigidOrientation extends ITriQuaternionFunction
{

  /**
   * Human-readable identifier for this orientation curve; changing it does
   * not alter key selection or the torque integration.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /**
   * Scalar moment of inertia shared by all torque intervals. Together with
   * drag it controls exponential decay of the integration rate through drag / I.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  I = 1;

  /**
   * Angular drag coefficient shared by all torque intervals. The integration
   * rate approaches torque / drag with exponential decay set by drag / I.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  drag = 1;

  /**
   * Retained [x, y, z, w] orientation quaternion, updated by curve sampling
   * and seeded from the first key by Sort. Returned before the first key or with no keys.
   * @type {Float32Array|Float64Array|number[]}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  value = quat.create();

  /**
   * Stored native Be::Time origin for absolute-time sampling. The current JS
   * sampling methods accept relative seconds and do not subtract this field.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float64
  start = 0;

  /**
   * Mutable array of torque-key references owned by this curve. Call Sort
   * after edits to order the keys and propagate later keys' initial states.
   * @type {TriTorque[]}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("TriTorque")
  states = [];

  /** Sorts torque keys, resets the sampling cursor and propagates initial states. */
  @meta.blue.method
  @meta.adapted
  Sort()
  {
    this.states.sort((a, b) => a.time - b.time);
    this._currentKey = 0;
    const tau = vec3.create();
    const converter = quat.create();
    for (let i = 1; i < this.states.length; i++)
    {
      const current = this.states[i];
      const previous = this.states[i - 1];
      const elapsed = current.time - previous.time;
      const decay = Math.exp(-this.drag * elapsed / this.I);
      for (let axis = 0; axis < 3; axis++)
      {
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
   * the list. The JS helper returns the cursor (native returns void) and
   * handles an empty list with -1; native callers guard before invoking Seek.
   */
  @meta.blue.method
  @meta.adapted
  Seek(time)
  {
    const count = this.states.length;

    if (!count) return -1;

    if (time >= this.states[count - 1].time)
    {
      this._currentKey = count - 1;
      return this._currentKey;
    }

    if (this._currentKey === count - 1) this._currentKey = 0;

    const key = this.states[this._currentKey];

    if (time < key.time || time >= this.states[this._currentKey + 1].time)
    {
      for (this._currentKey = 0; this._currentKey < count - 1; this._currentKey++)
      {
        if (time >= this.states[this._currentKey].time
          && time < this.states[this._currentKey + 1].time) break;
      }
    }

    return this._currentKey;
  }

  /**
   * The orientation at a time measured from the start, written into `out`;
   * before the first key it is the retained value.
   */
  @meta.blue.method
  @meta.adapted
  GetValueAt(out, time)
  {
    if (!this.states.length || time < 0 || time < this.states[0].time)
    {
      return quat.copy(out, this.value);
    }

    const key = this.states[this.Seek(time)];
    const elapsed = time - key.time;
    const decay = Math.exp(-this.drag * elapsed / this.I);

    for (let axis = 0; axis < 3; axis++)
    {
      const acceleration = key.torque[axis];
      const velocity = key.omega0[axis];

      ANGLE_SCRATCH[axis] = acceleration * elapsed / this.drag
        + this.I * (velocity * this.drag - acceleration) / (this.drag * this.drag) * (1 - decay);
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
  @meta.blue.method
  @meta.adapted
  GetValueDotAt(out, time)
  {
    if (!this.states.length || time < 0 || time < this.states[0].time)
    {
      return vec3.set(out, 0, 0, 0);
    }

    const key = this.states[this.Seek(time)];
    const decay = Math.exp(-this.drag * (time - key.time) / this.I);

    for (let axis = 0; axis < 3; axis++)
    {
      const terminal = key.torque[axis] / this.drag;
      out[axis] = terminal + (key.omega0[axis] - terminal) * decay;
    }

    return out;
  }

  /**
   * Samples the orientation at a time and retains it as the current value,
   * which is what a curve consumer reads back.
   */
  @meta.blue.method
  @meta.implemented
  Update(out, time)
  {
    this.GetValueAt(this.value, time);
    return quat.copy(out, this.value);
  }

  /**
   * Samples and retains orientation for the curve-set update interface.
   * Reuses value as the ignored output instead of native stack-local storage.
   *
   * @param {number} time Seconds relative to the curve start.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  UpdateValue(time)
  {
    this.Update(this.value, time);
  }

  _currentKey = 0;

}

const ANGLE_SCRATCH = vec3.create();
const CONVERTER_SCRATCH = quat.create();

meta.blue.interfaceTable({ interfaces: [ITriFunction, ITriQuaternionFunction], chainTo: null })(TriRigidOrientation);
