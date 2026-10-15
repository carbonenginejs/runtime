// Source: trinity/trinity/Eve/UI/EveTacticalOverlay.h
// Source: trinity/trinity/Eve/UI/EveTacticalOverlay.cpp
// Source: trinity/trinity/Eve/UI/EveTacticalOverlay_Blue.cpp
import { vec3 } from "#math/vec3";
import { meta, type, blue } from "#schema";

/**
 * One object tracked by the tactical overlay, sampling a translation curve for
 * its position and velocity and carrying the radius and flags the overlay
 * presents it with.
 */
@blue.define("EveTacticalOverlayTrackObject")
export class EveTacticalOverlayTrackObject
{
  @blue.readwrite
  @blue.persist
  @type.rootRef("ITriVectorFunction")
  translationCurve = null;

  @blue.readwrite
  @blue.persist
  @type.vec3
  position = vec3.create();

  @blue.readwrite
  @blue.persist
  @type.float32
  radius = 0;

  @blue.readwrite
  @blue.persist
  @type.boolean
  isAggressive = false;

  @blue.readwrite
  @blue.persist
  @type.boolean
  showVelocity = true;

  _velocity = vec3.create();

  /**
   * Samples the translation curve at the update context's time, storing the
   * position and the curve derivative as the tracked velocity; does nothing when
   * no curve is assigned.
   *
   * Adapted: Carbon vector functions use output pointers; runtime curves use the established
   * time-first, out-last calling convention.
   */
  @blue.method
  @meta.adapted
  UpdatePosition(updateContext)
  {
    if (!this.translationCurve) return;
    const time = updateContext.GetTime();
    this.translationCurve.GetValueDotAt__Ticks(time, this._velocity);
    this.translationCurve.GetValueAt__Ticks(time, this.position);
  }

  /**
   * Copies the velocity sampled by the last UpdatePosition into out.
   *
   * Adapted: Carbon returns Vector3 by value; JavaScript follows the runtime vector
   * out-parameter convention.
   */
  @blue.method
  @meta.adapted
  GetVelocity(out = vec3.create())
  {
    return vec3.copy(out, this._velocity);
  }

  /**
   * Copies the tracked position into out.
   *
   * Adapted: Carbon returns Vector3 by value; JavaScript follows the runtime vector
   * out-parameter convention.
   */
  @blue.method
  @meta.adapted
  GetPosition(out = vec3.create())
  {
    return vec3.copy(out, this.position);
  }

  /** Returns the authored radius the overlay sizes this object's marker from. */
  @blue.method
  @meta.implemented
  GetRadius()
  {
    return this.radius;
  }

  /**
   * Reports whether the object is flagged as aggressive, which the overlay uses
   * to choose its presentation.
   */
  @blue.method
  @meta.implemented
  IsAggressive()
  {
    return this.isAggressive;
  }

  /** Reports whether the overlay should draw this object's velocity indicator. */
  @blue.method
  @meta.implemented
  ShowVelocity()
  {
    return this.showVelocity;
  }
}
