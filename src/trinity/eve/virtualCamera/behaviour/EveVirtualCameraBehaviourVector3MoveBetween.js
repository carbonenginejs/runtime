// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { vec3 } from "#math/vec3";
import { carbon, impl, io, type } from "#schema";
import { EveVirtualCameraBehaviourVector3Base } from "./EveVirtualCameraBehaviourVector3Base.js";


/**
 * Vector3 behaviour that sweeps the camera value from one authored endpoint to
 * another across the animation timeline.
 */
@type.define({
  className: "EveVirtualCameraBehaviourVector3MoveBetween",
  family: "eve/virtualCamera/behaviour"
})
export class EveVirtualCameraBehaviourVector3MoveBetween extends EveVirtualCameraBehaviourVector3Base
{
  @io.persist
  @type.vec3
  end = vec3.create();

  @io.persist
  @type.boolean
  proportional = false;

  @io.persist
  @type.boolean
  world = true;

  @io.persist
  @type.objectRef("Tr2CurveScalar")
  interpolationCurve = null;

  @io.persist
  @type.vec3
  start = vec3.create();

  /**
   * Creates the default linear 0-to-1 interpolation curve and names the
   * behaviour "Move Between".
   */
  constructor()
  {
    super();
    this.interpolationCurve = EveVirtualCameraBehaviourVector3Base.createEaseCurve();
    this.SetName("Move Between");
  }

  /** Sets the behaviour name and renames the owned interpolation curve to match. */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    super.SetName(name);
    this.interpolationCurve?.SetName?.(`${this.name} - Interpolation Curve`);
  }

  /**
   * Returns the point interpolated from start to end by the interpolation curve
   * at normalized timeline time; both endpoints are multiplied by the anchor
   * radius when proportional is set and yawed into the anchor's heading when
   * world is false, and end is returned directly when the timeline has zero
   * length.
   */
  @carbon.method
  @impl.adapted
  Update(camera, _current, _deltaTime, localElapsedTime, _anchorPosition, anchorRadius, anchorForwardDirection, out = vec3.create())
  {
    const duration = Number(camera?.GetAnimationTimelineLength?.() ?? 0);
    if (duration === 0)
    {
      return vec3.copy(out, this.end);
    }
    const start = vec3.clone(this.start);
    const end = vec3.clone(this.end);
    if (this.proportional)
    {
      vec3.scale(start, start, anchorRadius);
      vec3.scale(end, end, anchorRadius);
    }
    if (!this.world)
    {
      EveVirtualCameraBehaviourVector3Base.rotateVectorWithAnchor(start, start, anchorForwardDirection);
      EveVirtualCameraBehaviourVector3Base.rotateVectorWithAnchor(end, end, anchorForwardDirection);
    }
    const time = localElapsedTime / duration;
    const amount = Number(this.interpolationCurve?.GetValue?.(time) ?? time);
    return vec3.lerp(out, start, end, amount);
  }
}
