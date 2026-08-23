// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraBehaviour.h
// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraBehaviour.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveVirtualCameraBehaviourVector3Base } from "./EveVirtualCameraBehaviourVector3Base.js";


/**
 * Vector3 behaviour that lags the camera position or point of interest behind
 * its target, giving a smooth follow with no overshoot.
 */
@type.define({
  className: "EveVirtualCameraBehaviourVector3Damping",
  family: "eve/virtualCamera/behaviour"
})
export class EveVirtualCameraBehaviourVector3Damping extends EveVirtualCameraBehaviourVector3Base
{
  @io.persist
  @type.float32
  m_dampingRatio = 1;

  #lastPosition = vec3.create();

  /**
   * Names the behaviour "Damping"; the default ratio of 1 follows the input
   * exactly.
   */
  constructor()
  {
    super();
    this.name = "Damping";
  }

  /**
   * Lerps the retained position towards the incoming one by m_dampingRatio and
   * returns the offset from the incoming position to that smoothed one; the
   * first update (local time at or below zero) seeds the retained position and
   * returns zero.
   */
  @carbon.method
  @impl.adapted
  Update(_camera, current, _deltaTime, localElapsedTime, _anchorPosition, _anchorRadius, _anchorForwardDirection, out = vec3.create())
  {
    if (localElapsedTime <= 0)
    {
      vec3.copy(this.#lastPosition, current);
      return vec3.zero(out);
    }
    vec3.lerp(this.#lastPosition, this.#lastPosition, current, this.m_dampingRatio);
    return vec3.subtract(out, this.#lastPosition, current);
  }
}
