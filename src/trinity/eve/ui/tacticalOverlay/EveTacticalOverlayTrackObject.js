// Source: trinity/trinity/Eve/UI/EveTacticalOverlay.h
// Source: trinity/trinity/Eve/UI/EveTacticalOverlay.cpp
// Source: trinity/trinity/Eve/UI/EveTacticalOverlay_Blue.cpp
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { carbon, impl, io, type } from "#schema";

/**
 * One object tracked by the tactical overlay, sampling a translation curve for
 * its position and velocity and carrying the radius and flags the overlay
 * presents it with.
 */
@type.define({ className: "EveTacticalOverlayTrackObject", family: "eve/ui" })
export class EveTacticalOverlayTrackObject extends CjsModel
{
  @io.persist
  @type.model("ITriVectorFunction")
  translationCurve = null;

  @io.persist
  @type.vec3
  position = vec3.create();

  @io.persist
  @type.float32
  radius = 0;

  @io.persist
  @type.boolean
  isAggressive = false;

  @io.persist
  @type.boolean
  showVelocity = true;

  #velocity = vec3.create();

  /**
   * Samples the translation curve at the update context's time, storing the
   * position and the curve derivative as the tracked velocity; does nothing when
   * no curve is assigned.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon vector functions use output pointers; runtime curves use the established time-first, out-last calling convention.")
  UpdatePosition(updateContext)
  {
    if (!this.translationCurve) return;
    const time = updateContext.GetTime();
    this.translationCurve.GetValueDotAt(time, this.#velocity);
    this.translationCurve.GetValueAt(time, this.position);
  }

  /** Copies the velocity sampled by the last UpdatePosition into out. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns Vector3 by value; JavaScript follows the runtime vector out-parameter convention.")
  GetVelocity(out = vec3.create())
  {
    return vec3.copy(out, this.#velocity);
  }

  /** Copies the tracked position into out. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns Vector3 by value; JavaScript follows the runtime vector out-parameter convention.")
  GetPosition(out = vec3.create())
  {
    return vec3.copy(out, this.position);
  }

  /** Returns the authored radius the overlay sizes this object's marker from. */
  @carbon.method
  @impl.implemented
  GetRadius()
  {
    return this.radius;
  }

  /**
   * Reports whether the object is flagged as aggressive, which the overlay uses
   * to choose its presentation.
   */
  @carbon.method
  @impl.implemented
  IsAggressive()
  {
    return this.isAggressive;
  }

  /** Reports whether the overlay should draw this object's velocity indicator. */
  @carbon.method
  @impl.implemented
  ShowVelocity()
  {
    return this.showVelocity;
  }
}
