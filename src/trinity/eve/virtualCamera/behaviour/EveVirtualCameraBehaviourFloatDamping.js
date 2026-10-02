// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { meta } from "#schema";
import { EveVirtualCameraBehaviourFloatBase } from "./EveVirtualCameraBehaviourFloatBase.js";


/**
 * Float behaviour that lags a scalar camera value behind the value the other
 * behaviours produced, smoothing sudden changes.
 */
@meta.define({
  className: "EveVirtualCameraBehaviourFloatDamping",
  family: "eve/virtualCamera/behaviour"
})
export class EveVirtualCameraBehaviourFloatDamping extends EveVirtualCameraBehaviourFloatBase
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  dampingFactor = 1;

  _lastValue = 0;

  /**
   * Names the behaviour "Damping"; the default damping factor of 1 follows the
   * input exactly.
   */
  constructor()
  {
    super();
    this.name = "Damping";
  }

  /**
   * Moves the retained value a dampingFactor fraction of the way towards the
   * incoming value and returns the difference, so the accumulated result lands
   * on the smoothed value; the first update (local time at or below zero) only
   * seeds the retained value and contributes nothing.
   */
  @meta.blue.method
  @meta.implemented
  Update(_camera, current, _deltaTime, localElapsedTime)
  {
    if (localElapsedTime <= 0)
    {
      this._lastValue = current;
      return 0;
    }
    this._lastValue += (current - this._lastValue) * this.dampingFactor;
    return this._lastValue - current;
  }
}
