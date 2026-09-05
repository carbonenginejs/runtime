// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { carbon, impl, io, type } from "#schema";
import { EveVirtualCameraBehaviourFloatBase } from "./EveVirtualCameraBehaviourFloatBase.js";


/**
 * Float behaviour that adds an authored constant, optionally shaped across the
 * timeline by a scale curve.
 */
@type.define({
  className: "EveVirtualCameraBehaviourFloatAdd",
  family: "eve/virtualCamera/behaviour"
})
export class EveVirtualCameraBehaviourFloatAdd extends EveVirtualCameraBehaviourFloatBase
{
  @io.persist
  @type.objectRef("Tr2CurveScalar")
  scaleCurve = null;

  @io.persist
  @type.float32
  value = 0;

  /**
   * Names the behaviour "Add"; no scale curve is created, so the constant is
   * unshaped until one is authored.
   */
  constructor()
  {
    super();
    this.name = "Add";
  }

  /** Sets the behaviour name and renames the owned scale curve to match. */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    super.SetName(name);
    this.scaleCurve?.SetName(`${this.name} - Scale Curve`);
  }

  /**
   * Returns the authored value, scaled by the scale curve at normalized timeline
   * time when one is set, and returned as-is when it is not.
   */
  @carbon.method
  @impl.adapted
  Update(camera, _current, _deltaTime, localElapsedTime)
  {
    if (!this.scaleCurve)
    {
      return this.value;
    }
    const duration = Number(camera?.GetAnimationTimelineLength?.() ?? 0);
    const time = duration !== 0 ? localElapsedTime / duration : 0;
    return this.value * Number(this.scaleCurve.GetValue(time) ?? 1);
  }
}
