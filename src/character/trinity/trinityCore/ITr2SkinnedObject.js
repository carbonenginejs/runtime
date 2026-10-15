// Source: trinity/trinity/ITr2SkinnedObject.h:7-13
import { CjsSchema, meta } from "#schema";

/** Carbon skinned-object transform interface; IRoot has no JavaScript base. */
export class ITr2SkinnedObject
{
  /**
   * Returns the object's scaling vector.
   * @returns {ArrayLike<number>} Three-component scaling supplied by the object.
   */
  @meta.abstract
  GetScaling()
  {
    throw new Error("ITr2SkinnedObject.GetScaling must be implemented by a skinned object.");
  }

  /**
   * Returns the object's rotation quaternion.
   * @returns {ArrayLike<number>} Four-component rotation supplied by the object.
   */
  @meta.abstract
  GetRotation()
  {
    throw new Error("ITr2SkinnedObject.GetRotation must be implemented by a skinned object.");
  }

  /**
   * Returns the object's position vector.
   * @returns {ArrayLike<number>} Three-component position supplied by the object.
   */
  @meta.abstract
  GetPosition()
  {
    throw new Error("ITr2SkinnedObject.GetPosition must be implemented by a skinned object.");
  }
}

CjsSchema.blue.define(ITr2SkinnedObject, {
  className: "ITr2SkinnedObject",
  fields: {}
});
