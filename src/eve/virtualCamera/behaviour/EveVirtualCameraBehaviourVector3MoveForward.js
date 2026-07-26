// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraBehaviour.h
// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraBehaviour.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveVirtualCameraBehaviourVector3Base } from "./EveVirtualCameraBehaviourVector3Base.js";


/**
 * Vector3 behaviour that displaces the camera along its own forward axis by a
 * curve-shaped distance, and the base for the sideways and vertical variants.
 */
@type.define({
  className: "EveVirtualCameraBehaviourVector3MoveForward",
  family: "eve/virtualCamera/behaviour"
})
export class EveVirtualCameraBehaviourVector3MoveForward extends EveVirtualCameraBehaviourVector3Base
{
  @io.persist
  @type.objectRef("Tr2CurveScalar")
  scaleCurve = null;

  @io.persist
  @type.boolean
  proportional = true;

  @io.persist
  @type.float32
  value = 0;

  /**
   * Creates the constant scale curve and applies the behaviour name, which the
   * axis subclasses supply.
   */
  constructor(name = "Move Forward")
  {
    super();
    this.scaleCurve = EveVirtualCameraBehaviourVector3Base.createConstantCurve(1);
    this.SetName(name);
  }

  /** Sets the behaviour name and renames the owned scale curve to match. */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    super.SetName(name);
    this.scaleCurve?.SetName?.(`${this.name} - Scale Curve`);
  }

  /** Returns the camera's forward direction scaled by the current distance. */
  @carbon.method
  @impl.adapted
  Update(camera, _current, _deltaTime, localElapsedTime, _anchorPosition, anchorRadius, _anchorForwardDirection, out = vec3.create())
  {
    return vec3.scale(out, camera.GetForwardDirection(out), this.GetCurrentValue(camera, localElapsedTime, anchorRadius));
  }

  /**
   * Evaluates the authored distance for this frame: value shaped by the scale
   * curve at normalized timeline time, multiplied by the anchor radius when
   * proportional is set so the move scales with the anchored object's size.
   */
  GetCurrentValue(camera, localElapsedTime, anchorRadius)
  {
    const duration = Number(camera?.GetAnimationTimelineLength?.() ?? 0);
    const time = duration !== 0 ? localElapsedTime / duration : 0;
    let value = this.value * Number(this.scaleCurve?.GetValue?.(time) ?? 1);
    if (this.proportional)
    {
      value *= anchorRadius;
    }
    return value;
  }
}
