// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { vec3 } from "#math/vec3";
import { carbon, impl, io, type } from "#schema";
import { EveVirtualCameraBehaviourVector3Base } from "./EveVirtualCameraBehaviourVector3Base.js";


/**
 * Vector3 behaviour that gives the camera value momentum, so it accelerates
 * towards its target and coasts rather than tracking it exactly.
 */
@type.define({
  className: "EveVirtualCameraBehaviourVector3Inertia",
  family: "eve/virtualCamera/behaviour"
})
export class EveVirtualCameraBehaviourVector3Inertia extends EveVirtualCameraBehaviourVector3Base
{
  @io.persist
  @type.float32
  inertiaFactor = 1;

  #lastPosition = vec3.create();

  #lastVelocity = vec3.create();

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
  @carbon.method
  @impl.adapted
  Update(_camera, current, deltaTime, localElapsedTime, _anchorPosition, _anchorRadius, _anchorForwardDirection, out = vec3.create())
  {
    if (localElapsedTime <= 0)
    {
      vec3.zero(this.#lastVelocity);
      vec3.copy(this.#lastPosition, current);
      return vec3.zero(out);
    }
    const delta = vec3.subtract(vec3.create(), current, this.#lastPosition);
    vec3.subtract(delta, delta, this.#lastVelocity);
    vec3.scaleAndAdd(this.#lastVelocity, this.#lastVelocity, delta, 1 / this.inertiaFactor);
    vec3.add(this.#lastPosition, this.#lastPosition, this.#lastVelocity);
    vec3.scale(this.#lastVelocity, this.#lastVelocity, deltaTime);
    return vec3.subtract(out, this.#lastPosition, current);
  }
}
