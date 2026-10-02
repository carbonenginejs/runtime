// Source: trinity/trinity/Curves/Tr2DistanceTracker.h
// Source: trinity/trinity/Curves/Tr2DistanceTracker.cpp
// Source: trinity/trinity/Curves/Tr2DistanceTracker_Blue.cpp
import { vec3 } from "#math/vec3";
import { blue, TimeAsDouble, ITriFunction, INotify } from "#blue";
import { meta, types } from "#schema";


/**
 * Scalar function reporting the distance between two tracked positions, either
 * the full separation or its projection onto a fixed direction, and optionally
 * signed by which side of that direction the target lies.
 */
@meta.define({
  className: "Tr2DistanceTracker",
  family: "curves"
})
@meta.carbon.inherit(INotify)
export class Tr2DistanceTracker extends ITriFunction
{
  @meta.edit.readwrite
  @meta.edit.persist
  @types.wstring
  name = "";

  /** Native READ stored value, not a live accessor or persisted input. */
  @meta.edit.read
  @types.float32
  value = 0;

  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  signedDistance = true;

  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  distanceToClosest = true;

  @meta.edit.readwrite
  @meta.edit.persist
  @types.vec3
  direction = vec3.create();

  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.objectRef("ITriVectorFunction")
  sourceObject = null;

  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.objectRef("ITriVectorFunction")
  targetObject = null;

  @meta.edit.readwrite
  @meta.edit.persist
  @types.vec3
  sourcePosition = vec3.create();

  @meta.edit.readwrite
  @meta.edit.persist
  @types.vec3
  targetPosition = vec3.create();

  /** Reused JS vector replaces native UpdateValue's stack temporary. */
  _difference = vec3.create();

  /**
   * Updates source and target positions, then recalculates distance.
   * Adapted: the vector-function contract writes into an output buffer passed
   * after time; a reusable vector replaces the native stack temporary. Direction
   * is used as authored, without normalization or a zero-vector special case.
   * @param {number} time Sampling time in seconds.
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.adapted
  UpdateValue(time)
  {
    if (this.sourceObject)
    {
      this.sourceObject.GetValueAt(time, this.sourcePosition);
    }
    if (this.targetObject)
    {
      this.targetObject.GetValueAt(time, this.targetPosition);
    }
    vec3.subtract(this._difference, this.targetPosition, this.sourcePosition);
    const projection = vec3.dot(this._difference, this.direction);
    if (this.distanceToClosest)
    {
      this.value = projection;
      if (!this.signedDistance)
      {
        this.value = Math.abs(this.value);
      }
      return;
    }
    this.value = vec3.length(this._difference);
    if (this.signedDistance && projection < 0)
    {
      this.value = -this.value;
    }
  }

  /**
   * Refreshes the value at Blue's current frame time after a notification.
   * Only sourceObject and targetObject have native NOTIFY flags; explicit calls
   * still recompute regardless of the supplied member name, as Carbon does.
   * @param {string|null} [_value=null] Unused notified member identity.
   * @returns {boolean} True after updating the stored value.
   */
  @meta.carbon.method
  @meta.impl.implemented
  OnModified(_value = null)
  {
    this.UpdateValue(TimeAsDouble(blue.os.GetCurrentFrameTime()));
    return true;
  }
}

// Native exposure is deprecated in Jessica and maps no concrete self identity.
meta.carbon.interfaceTable({
  interfaces: [ITriFunction, INotify],
  chainTo: null
})(Tr2DistanceTracker);
