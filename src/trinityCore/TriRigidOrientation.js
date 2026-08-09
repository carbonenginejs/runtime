// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/TriRigidOrientation.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

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

}
