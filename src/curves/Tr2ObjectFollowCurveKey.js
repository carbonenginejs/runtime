// Source: E:\carbonengine\trinity\trinity\Curves\Tr2FollowCurveKey.h
// Source: E:\carbonengine\trinity\trinity\Curves\Tr2FollowCurveKey.cpp
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2FollowCurveKeyInterpolation, RotationSetting } from "./enums.js";


/**
 * Follow-curve key positioned by another object rather than a fixed point,
 * taking its place from that object's locator or offset and optionally rotating
 * its tangents with the object.
 */
@type.define({
  className: "Tr2ObjectFollowCurveKey",
  family: "curves"
})
export class Tr2ObjectFollowCurveKey extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.notify
  @io.readwrite
  @type.objectRef("IRoot")
  object = null;

  @io.persist
  @type.float32
  time = 0;

  @io.persist
  @type.int32
  @schema.enum("Tr2FollowCurveKeyInterpolation")
  interpolation = Tr2FollowCurveKeyInterpolation.LINEAR;

  @io.persist
  @type.vec3
  leftTangent = vec3.create();

  @io.persist
  @type.vec3
  rightTangent = vec3.create();

  @io.read
  @type.vec3
  rotatedLeftTangent = vec3.create();

  @io.read
  @type.vec3
  rotatedRightTangent = vec3.create();

  @io.notify
  @io.persist
  @type.string
  offsetLocatorName = "";

  @io.persist
  @type.vec3
  offset = vec3.create();

  @io.persist
  @type.int32
  @schema.enum("RotationSetting")
  rotationSetting = RotationSetting.NO_ROTATION;

  #locator = null;

  #offset = vec3.create();

  #rotation = quat.create();

  /**
   * Resolves the current locator cache.
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.#locator = this.GetLocator();
    return true;
  }

  /**
   * Re-resolves the locator after object or locator-name changes.
   */
  @carbon.method
  @impl.adapted
  OnModified()
  {
    this.#locator = this.GetLocator();
    return true;
  }

  /**
   * Gets the key time.
   */
  @carbon.method
  @impl.implemented
  GetTime()
  {
    return this.time;
  }

  /**
   * Gets the segment interpolation mode starting at this key.
   */
  @carbon.method
  @impl.implemented
  GetInterpolationType()
  {
    return this.interpolation;
  }

  /**
   * Gets the rotated left tangent into `out`.
   */
  @carbon.method
  @impl.adapted
  GetLeftTangent(out)
  {
    return vec3.copy(out, this.rotatedLeftTangent);
  }

  /**
   * Gets the rotated right tangent into `out`.
   */
  @carbon.method
  @impl.adapted
  GetRightTangent(out)
  {
    return vec3.copy(out, this.rotatedRightTangent);
  }

  /**
   * Gets the followed object position plus local offset into `out`.
   */
  @carbon.method
  @impl.adapted
  GetValue(out)
  {
    if (!this.object)
    {
      return vec3.copy(out, this.offset);
    }
    vec3.copy(this.#offset, this.offset);
    if (this.#locator)
    {
      vec3.add(this.#offset, this.#offset, this.#locator.position);
    }
    const rotation = this.GetRotation();
    this.TransformByRotation(this.rotatedLeftTangent, this.leftTangent, rotation);
    this.TransformByRotation(this.rotatedRightTangent, this.rightTangent, rotation);
    this.TransformByRotation(out, this.#offset, rotation);
    const worldPosition = this.GetWorldPosition();
    if (worldPosition)
    {
      vec3.add(out, worldPosition, out);
    }
    return out;
  }

  /**
   * Finds the first locator in the requested Carbon locator set.
   */
  GetLocator()
  {
    const object = this.object;
    if (!object || this.offsetLocatorName === "")
    {
      return null;
    }
    const methodLocators = object.GetLocatorsForSet?.(this.offsetLocatorName);
    if (methodLocators && methodLocators.length > 0)
    {
      return methodLocators[0] ?? null;
    }
    const set = object.locatorSets?.find(entry => entry.name === this.offsetLocatorName);
    return set?.locators[0] ?? null;
  }

  /**
   * Gets the active rotation as a normalized quaternion, when any applies.
   */
  GetRotation()
  {
    switch (this.rotationSetting)
    {
      case RotationSetting.LOCATOR_ROTATION:
        if (this.#locator)
        {
          return quat.normalize(this.#rotation, this.#locator.direction);
        }
        break;
      case RotationSetting.MODEL_ROTATION:
        {
          const rotation = this.object?.GetWorldRotation?.() ?? this.object?.worldRotation;
          if (rotation)
          {
            return quat.normalize(this.#rotation, rotation);
          }
          break;
        }
    }
    return null;
  }

  /**
   * Gets the followed object's world position, if it exposes one.
   */
  GetWorldPosition()
  {
    return this.object?.GetWorldPosition?.() ?? this.object?.worldPosition ?? null;
  }

  /**
   * Applies a pure rotation transform, or copies unchanged for identity.
   */
  TransformByRotation(out, value, rotation)
  {
    if (!rotation)
    {
      return vec3.copy(out, value);
    }
    return vec3.transformQuat(out, value, rotation);
  }

  static RotationSetting = RotationSetting;

  static Tr2FollowCurveKeyInterpolation = Tr2FollowCurveKeyInterpolation;

}
