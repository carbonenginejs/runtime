// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { meta } from "#schema";
import { EveVirtualCameraBehaviourFloatBase } from "./EveVirtualCameraBehaviourFloatBase.js";


/**
 * Float behaviour that adds an authored constant, optionally shaped across the
 * timeline by a scale curve.
 */
@meta.define({
  className: "EveVirtualCameraBehaviourFloatAdd",
  family: "eve/virtualCamera/behaviour"
})
export class EveVirtualCameraBehaviourFloatAdd extends EveVirtualCameraBehaviourFloatBase
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2CurveScalar")
  scaleCurve = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
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
  @meta.blue.method
  @meta.implemented
  SetName(name)
  {
    super.SetName(name);
    this.scaleCurve?.SetName(`${this.name} - Scale Curve`);
  }

  /**
   * Returns the authored value, scaled by the scale curve at normalized timeline
   * time when one is set, and returned as-is when it is not.
   */
  @meta.blue.method
  @meta.adapted
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
