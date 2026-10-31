import { meta } from "#schema";
import { IRoot } from "#blueexposure/IRoot";
// Source: trinity/trinity/ITr2SkinnedObject.h:7-13
import { CjsSchema, blue } from "#schema";

/** Carbon skinned-object transform interface; IRoot has no JavaScript base. */
export class ITr2SkinnedObject extends IRoot
{
  /**
   * Returns the object's scaling vector.
   *
   * @abstract
   * @returns {ArrayLike<number>} Three-component scaling supplied by the object.
   */
  @meta.abstract
  GetScaling() {}

  /**
   * Returns the object's rotation quaternion.
   *
   * @abstract
   * @returns {ArrayLike<number>} Four-component rotation supplied by the object.
   */
  @meta.abstract
  GetRotation() {}

  /**
   * Returns the object's position vector.
   *
   * @abstract
   * @returns {ArrayLike<number>} Three-component position supplied by the object.
   */
  @meta.abstract
  GetPosition() {}
}

CjsSchema.exposure.interface("ITr2SkinnedObject")(ITr2SkinnedObject);

meta.inherit(IRoot)(ITr2SkinnedObject);
