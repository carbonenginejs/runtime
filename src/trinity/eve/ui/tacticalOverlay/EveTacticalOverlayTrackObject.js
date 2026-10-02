// Source: trinity/trinity/Eve/UI/EveTacticalOverlay.h
// Source: trinity/trinity/Eve/UI/EveTacticalOverlay.cpp
// Source: trinity/trinity/Eve/UI/EveTacticalOverlay_Blue.cpp
import { vec3 } from "#math/vec3";
import { meta } from "#schema";

/**
 * One object tracked by the tactical overlay, sampling a translation curve for
 * its position and velocity and carrying the radius and flags the overlay
 * presents it with.
 */
@meta.define({ className: "EveTacticalOverlayTrackObject", family: "eve/ui" })
export class EveTacticalOverlayTrackObject
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("ITriVectorFunction")
  translationCurve = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  position = vec3.create();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  radius = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  isAggressive = false;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  showVelocity = true;

  _velocity = vec3.create();

  /**
   * Samples the translation curve at the update context's time, storing the
   * position and the curve derivative as the tracked velocity; does nothing when
   * no curve is assigned.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon vector functions use output pointers; runtime curves use the established time-first, out-last calling convention.")
  UpdatePosition(updateContext)
  {
    if (!this.translationCurve) return;
    const time = updateContext.GetTime();
    this.translationCurve.GetValueDotAt(time, this._velocity);
    this.translationCurve.GetValueAt(time, this.position);
  }

  /** Copies the velocity sampled by the last UpdatePosition into out. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon returns Vector3 by value; JavaScript follows the runtime vector out-parameter convention.")
  GetVelocity(out = vec3.create())
  {
    return vec3.copy(out, this._velocity);
  }

  /** Copies the tracked position into out. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon returns Vector3 by value; JavaScript follows the runtime vector out-parameter convention.")
  GetPosition(out = vec3.create())
  {
    return vec3.copy(out, this.position);
  }

  /** Returns the authored radius the overlay sizes this object's marker from. */
  @meta.blue.method
  @meta.implemented
  GetRadius()
  {
    return this.radius;
  }

  /**
   * Reports whether the object is flagged as aggressive, which the overlay uses
   * to choose its presentation.
   */
  @meta.blue.method
  @meta.implemented
  IsAggressive()
  {
    return this.isAggressive;
  }

  /** Reports whether the overlay should draw this object's velocity indicator. */
  @meta.blue.method
  @meta.implemented
  ShowVelocity()
  {
    return this.showVelocity;
  }
}
