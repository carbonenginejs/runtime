// Source: trinity/trinity/IWorldPosition.h:11-15
import { CjsSchema, meta } from "#schema";


/** Native IRoot-derived contract for a receiver's world position and rotation. */
export class IWorldPosition
{
  /**
   * Writes the receiver's world position into a caller-owned vector (Carbon returns it by value, IWorldPosition.h:13).
   * @param {Float32Array} out Caller-owned position.
   * @returns {Float32Array} out
   */
  GetWorldPosition(out)
  {
  }

  /**
   * Gets the receiver's world rotation.
   * @returns {Float32Array} Rotation quaternion.
   */
  GetWorldRotation()
  {
  }
}

for (const method of [ "GetWorldPosition", "GetWorldRotation" ])
{
  CjsSchema.decorateMethod(IWorldPosition, method, meta.requires, meta.abstract);
}
CjsSchema.define(IWorldPosition, {
  className: "IWorldPosition", carbon: "IWorldPosition", family: "core", fields: {}
});
