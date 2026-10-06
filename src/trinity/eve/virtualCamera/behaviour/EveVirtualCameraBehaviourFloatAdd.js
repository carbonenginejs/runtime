// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { meta } from "#schema";
import { INotify } from "#blue";
import { Tr2CurveScalar } from "../../../curves/curve/Tr2CurveScalar.js";
import { Tr2CurveExtrapolation, Tr2CurveInterpolation, Tr2CurveTangentType } from "../../../curves/enums.js";
import { EveVirtualCameraBehaviourFloatBase } from "./EveVirtualCameraBehaviourFloatBase.js";


/**
 * Float behaviour that adds an authored constant, optionally shaped across the
 * timeline by a scale curve.
 */
@meta.define({
  className: "EveVirtualCameraBehaviourFloatAdd",
  family: "eve/virtualCamera/behaviour"
})
@meta.blue.interface(INotify)
@meta.blue.chainTo(EveVirtualCameraBehaviourFloatBase)
export class EveVirtualCameraBehaviourFloatAdd extends EveVirtualCameraBehaviourFloatBase
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.rootRef("Tr2CurveScalar")
  scaleCurve = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  value = 0;

  /**
   * Creates Carbon's constant scale curve and names the behaviour "Add".
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp:30-35,106-113
   */
  constructor()
  {
    super();
    this.scaleCurve = new Tr2CurveScalar();
    this.scaleCurve.SetExtrapolation(Tr2CurveExtrapolation.LINEAR);
    this.scaleCurve.AddKey(0, 1, Tr2CurveInterpolation.HERMITE, 0, 0, Tr2CurveTangentType.AUTO_CLAMP);
    this.scaleCurve.AddKey(1, 1, Tr2CurveInterpolation.HERMITE, 0, 0, Tr2CurveTangentType.AUTO_CLAMP);
    this.SetName("Add");
  }

  /**
   * Sets the behaviour name and renames the owned scale curve to match.
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp:119-122
   */
  @meta.blue.method
  @meta.implemented
  SetName(name)
  {
    super.SetName(name);
    this.scaleCurve.SetName(`${this.name} - Scale Curve`);
  }

  /**
   * Returns the authored value, scaled by the scale curve at normalized timeline
   * time when one is set, and returned as-is when it is not.
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp:125-134
   */
  @meta.blue.method
  @meta.implemented
  Update(camera, _current, _deltaTime, localElapsedTime)
  {
    if (!this.scaleCurve)
    {
      return this.value;
    }
    const duration = camera.GetAnimationTimelineLength();
    const time = localElapsedTime / duration;
    return this.value * this.scaleCurve.GetValue(time);
  }
}
