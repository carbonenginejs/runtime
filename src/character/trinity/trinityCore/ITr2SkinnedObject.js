import { IRoot } from "#blue/IRoot";
// Source: trinity/trinity/ITr2SkinnedObject.h:7-13
import { CjsSchema, blue } from "#schema";

/** Carbon skinned-object transform interface; IRoot has no JavaScript base. */
export class ITr2SkinnedObject
{
  /**
   * Returns the object's scaling vector.
   * @returns {ArrayLike<number>} Three-component scaling supplied by the object.
   */
  @blue.abstract
  GetScaling() {}

  /**
   * Returns the object's rotation quaternion.
   * @returns {ArrayLike<number>} Four-component rotation supplied by the object.
   */
  @blue.abstract
  GetRotation() {}

  /**
   * Returns the object's position vector.
   * @returns {ArrayLike<number>} Three-component position supplied by the object.
   */
  @blue.abstract
  GetPosition() {}
}

CjsSchema.blue.define(ITr2SkinnedObject, {
  className: "ITr2SkinnedObject",
  fields: {}
});

blue.inherit(IRoot)(ITr2SkinnedObject);
