// Source: trinity/trinity/Curves/Tr2DistanceTracker.h
// Source: trinity/trinity/Curves/Tr2DistanceTracker.cpp
// Source: trinity/trinity/Curves/Tr2DistanceTracker_Blue.cpp
import { vec3 } from "#math/vec3";
import { blue, TimeAsDouble, ITriFunction, INotify } from "#blue";
import { meta } from "#schema";


/**
 * Scalar function reporting the distance between two tracked positions, either
 * the full separation or its projection onto a fixed direction, and optionally
 * signed by which side of that direction the target lies.
 */
@meta.define({
  className: "Tr2DistanceTracker",
  family: "curves"
})
@meta.blue.inherit(INotify)
export class Tr2DistanceTracker extends ITriFunction
{
  /**
   * Authored name identifying this distance-tracking function; native wide string.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.wstring
  name = "";

  /**
   * Cached separation or directional projection; native float. Uses the positions' coordinate
   * units when direction is normalized. Read-only metadata; not persisted.
   * @type {number}
   */
  @meta.blue.read
  @meta.type.float32
  value = 0;

  /**
   * Whether the direction projection determines the result's sign; otherwise the result is
   * nonnegative.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  signedDistance = true;

  /**
   * Selects directional projection instead of full source-to-target separation.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  distanceToClosest = true;

  /**
   * Three-component projection and sign-testing direction. Native expects a normalized vector;
   * sampling uses the authored components unchanged.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  direction = vec3.create();

  /**
   * Optional position function sampled into sourcePosition during updates.
   * @type {ITriVectorFunction|null}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("ITriVectorFunction")
  sourceObject = null;

  /**
   * Optional position function sampled into targetPosition during updates.
   * @type {ITriVectorFunction|null}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("ITriVectorFunction")
  targetObject = null;

  /**
   * Three-component source position used for distance calculation; remains unchanged when no
   * source function is attached.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  sourcePosition = vec3.create();

  /**
   * Three-component target position used for distance calculation; remains unchanged when no
   * target function is attached.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  targetPosition = vec3.create();

  /**
   * Reusable JavaScript scratch vector holding target minus source, replacing the native stack
   * temporary.
   * @type {Float32Array}
   */
  _difference = vec3.create();

  /**
   * Updates source and target positions, then recalculates distance.
   * Adapted: the vector-function contract writes into an output buffer passed
   * after time; a reusable vector replaces the native stack temporary. Direction
   * is used as authored, without normalization or a zero-vector special case.
   * @param {number} time Sampling time in seconds.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
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
  @meta.blue.method
  @meta.implemented
  OnModified(_value = null)
  {
    this.UpdateValue(TimeAsDouble(blue.os.GetCurrentFrameTime()));
    return true;
  }
}

// Native exposure is deprecated in Jessica and maps no concrete self identity.
meta.blue.interfaceTable({
  interfaces: [ITriFunction, INotify],
  chainTo: null
})(Tr2DistanceTracker);
