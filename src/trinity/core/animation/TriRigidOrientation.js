// Source: trinity/trinity/TriRigidOrientation.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** Integrates torque into an orientation over time, sampling the result at a given moment. */
@type.define({ className: "TriRigidOrientation", family: "trinityCore" })
export class TriRigidOrientation extends CjsModel
{

  /** mDrag (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  drag = 1;

  /** mStart (Be::Time) [READWRITE, PERSIST] */
  @io.persist
  @type.float64
  start = 0;

  /** mI (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  I = 1;

  /** mStates (PTriTorqueVector) [READ, PERSIST] */
  @io.persist
  @type.list("TriTorque")
  states = [];

  /** mValue (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  value = quat.create();

  /** mName (std::wstring) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** Carbon method Sort (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  Sort()
  {
    this.states.sort((a, b) => a.time - b.time);
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
   * the list.
   */
  @carbon.method
  @impl.implemented
  Seek(time)
  {
    const count = this.states.length;

    if (!count) return -1;

    if (time >= this.states[count - 1].time)
    {
      this.#currentKey = count - 1;
      return this.#currentKey;
    }

    if (this.#currentKey === count - 1) this.#currentKey = 0;

    const key = this.states[this.#currentKey];

    if (time < key.time || time >= this.states[this.#currentKey + 1].time)
    {
      for (this.#currentKey = 0; this.#currentKey < count - 1; this.#currentKey++)
      {
        if (time >= this.states[this.#currentKey].time
          && time < this.states[this.#currentKey + 1].time) break;
      }
    }

    return this.#currentKey;
  }

  /**
   * The orientation at a time measured from the start, written into `out`;
   * before the first key it is the retained value.
   */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  Update(out, time)
  {
    this.GetValueAt(this.value, time);
    return quat.copy(out, this.value);
  }

  #currentKey = 0;

}

const ANGLE_SCRATCH = vec3.create();
const CONVERTER_SCRATCH = quat.create();
