// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { vec3 } from "#math/vec3";
import { meta } from "#schema";
import { EveVirtualCameraBehaviourVector3Base } from "./EveVirtualCameraBehaviourVector3Base.js";


/**
 * Vector3 behaviour that gives the camera value momentum, so it accelerates
 * towards its target and coasts rather than tracking it exactly.
 */
@meta.define({
  className: "EveVirtualCameraBehaviourVector3Inertia",
  family: "eve/virtualCamera/behaviour"
})
export class EveVirtualCameraBehaviourVector3Inertia extends EveVirtualCameraBehaviourVector3Base
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  inertiaFactor = 1;

  _lastPosition = vec3.create();

  _lastVelocity = vec3.create();

  /**
   * Names the behaviour "Inertia"; the default factor of 1 applies the full
   * correction each update.
   */
  constructor()
  {
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
  @meta.blue.method
  @meta.adapted
  Update(_camera, current, deltaTime, localElapsedTime, _anchorPosition, _anchorRadius, _anchorForwardDirection, out = vec3.create())
  {
    if (localElapsedTime <= 0)
    {
      vec3.zero(this._lastVelocity);
      vec3.copy(this._lastPosition, current);
      return vec3.zero(out);
    }
    const delta = vec3.subtract(vec3.create(), current, this._lastPosition);
    vec3.subtract(delta, delta, this._lastVelocity);
    vec3.scaleAndAdd(this._lastVelocity, this._lastVelocity, delta, 1 / this.inertiaFactor);
    vec3.add(this._lastPosition, this._lastPosition, this._lastVelocity);
    vec3.scale(this._lastVelocity, this._lastVelocity, deltaTime);
    return vec3.subtract(out, this._lastPosition, current);
  }
}
