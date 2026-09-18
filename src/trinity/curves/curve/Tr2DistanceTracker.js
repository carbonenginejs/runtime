// Source: trinity/trinity/Curves/Tr2DistanceTracker.h
// Source: trinity/trinity/Curves/Tr2DistanceTracker.cpp
import { vec3 } from "#math/vec3";
import { blue, TimeAsDouble } from "#blue";
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";


/**
 * Scalar function reporting the distance between two tracked positions, either
 * the full separation or its projection onto a fixed direction, and optionally
 * signed by which side of that direction the target lies.
 */
@type.define({
  className: "Tr2DistanceTracker",
  family: "curves"
})
export class Tr2DistanceTracker extends CjsModel
{
  @edit.persist
  @type.string
  name = "";

  @edit.read
  @type.float32
  value = 0;

  @edit.persist
  @type.boolean
  signedDistance = true;

  @edit.persist
  @type.boolean
  distanceToClosest = true;

  @edit.persist
  @type.vec3
  direction = vec3.create();

  @edit.notify
  @edit.persist
  @type.objectRef("ITriVectorFunction")
  sourceObject = null;

  @edit.notify
  @edit.persist
  @type.objectRef("ITriVectorFunction")
  targetObject = null;

  @edit.persist
  @type.vec3
  sourcePosition = vec3.create();

  @edit.persist
  @type.vec3
  targetPosition = vec3.create();

  #difference = vec3.create();

  /**
   * Updates source and target positions, then recalculates distance.
   */
  @carbon.method
  @impl.implemented
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
    vec3.subtract(this.#difference, this.targetPosition, this.sourcePosition);
    const projection = vec3.dot(this.#difference, this.direction);
    if (this.distanceToClosest)
    {
      this.value = projection;
      if (!this.signedDistance)
      {
        this.value = Math.abs(this.value);
      }
      return;
    }
    this.value = vec3.length(this.#difference);
    if (this.signedDistance && projection < 0)
    {
      this.value = -this.value;
    }
  }

  /**
   * Refreshes the value after a notified source/target modification.
   */
  @carbon.method
  @impl.implemented
  OnModified(_value = null)
  {
    this.UpdateValue(TimeAsDouble(blue.os.GetCurrentFrameTime()));
    return true;
  }
}
