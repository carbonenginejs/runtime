// Source: trinity/trinity/Curves/Tr2FollowCurveKey.h
// Source: trinity/trinity/Curves/Tr2FollowCurveKey.cpp
// Source: trinity/trinity/Curves/Tr2FollowCurveKey_Blue.cpp:45-64
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { INotify, IInitialize } from "#blue";
import { mappedInterfaces } from "../../../global/compose/interface.js";
import { IWorldPosition } from "../../core/IWorldPosition.js";
import { EveSpaceObject2 } from "../../eve/spaceObject/EveSpaceObject2.js";
import { ITr2FollowCurveKey } from "../ITr2FollowCurveKey.js";
import { meta } from "#schema";
import { Tr2FollowCurveKeyInterpolation, RotationSetting } from "../enums.js";


/**
 * Follow-curve key positioned by another object rather than a fixed point,
 * taking its place from that object's locator or offset and optionally rotating
 * its tangents with the object.
 * Native exposure omits self and maps only the follow-key, notify and initialize
 * contracts. Vector output buffers and quaternion math retain the JS adapter.
 * Native destruction only clears references; no resource disposal is required.
 */
@meta.define({
  className: "Tr2ObjectFollowCurveKey",
  family: "curves"
})
@meta.blue.inherit(INotify, IInitialize)
export class Tr2ObjectFollowCurveKey extends ITr2FollowCurveKey
{
  /** Authored key name. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** Runtime followed object; notified but not persisted. */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.objectRef("IRoot")
  object = null;

  /** Authored key time. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  time = 0;

  /** Authored interpolation of the outgoing segment. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.Tr2FollowCurveKeyInterpolation")
  interpolation = Tr2FollowCurveKeyInterpolation.LINEAR;

  /** Authored incoming tangent. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  leftTangent = vec3.create();

  /** Authored outgoing tangent. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  rightTangent = vec3.create();

  /** Last sampled incoming tangent. */
  @meta.blue.read
  @meta.type.vec3
  rotatedLeftTangent = vec3.create();

  /** Last sampled outgoing tangent. */
  @meta.blue.read
  @meta.type.vec3
  rotatedRightTangent = vec3.create();

  /** Authored locator set name. */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  offsetLocatorName = "";

  /** Authored local position offset. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  offset = vec3.create();

  /** Authored rotation selection. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.Tr2ObjectFollowCurveKey.RotationSetting")
  rotationSetting = RotationSetting.NO_ROTATION;

  /** Cached first locator; owned by the followed object. */
  _locator = null;

  /** Reusable local offset scratch. */
  _offset = vec3.create();

  /** Reusable normalized rotation scratch. */
  _rotation = quat.create();

  /**
   * Resolves the current locator cache.
   */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    this._locator = this.GetLocator();
    return true;
  }

  /**
   * Re-resolves the locator after object or locator-name changes.
   * JavaScript property-name tokens replace native Be::Var member matching.
   * @param {string|null} propertyName Changed member name.
   * @returns {boolean} True.
   */
  @meta.blue.method
  @meta.adapted
  OnModified(propertyName = null)
  {
    if (propertyName === "object" || propertyName === "offsetLocatorName")
    {
      this._locator = this.GetLocator();
    }
    return true;
  }

  /**
   * Gets the key time.
   */
  @meta.blue.method
  @meta.implemented
  GetTime()
  {
    return this.time;
  }

  /**
   * Gets the segment interpolation mode starting at this key.
   */
  @meta.blue.method
  @meta.implemented
  GetInterpolationType()
  {
    return this.interpolation;
  }

  /**
   * Gets the rotated left tangent into `out`.
   * The caller's output buffer replaces the native vector value return.
   */
  @meta.blue.method
  @meta.adapted
  GetLeftTangent(out)
  {
    return vec3.copy(out, this.rotatedLeftTangent);
  }

  /**
   * Gets the rotated right tangent into `out`.
   * The caller's output buffer replaces the native vector value return.
   */
  @meta.blue.method
  @meta.adapted
  GetRightTangent(out)
  {
    return vec3.copy(out, this.rotatedRightTangent);
  }

  /**
   * Gets the followed object position plus local offset into `out`.
   * The caller's output buffer and quaternion transform replace native values
   * and rotation matrices while preserving the native sampling order.
   */
  @meta.blue.method
  @meta.adapted
  GetValue(out)
  {
    if (!this.object)
    {
      return vec3.copy(out, this.offset);
    }
    vec3.copy(this._offset, this.offset);
    if (this._locator)
    {
      vec3.add(this._offset, this._offset, this._locator.position);
    }
    const rotation = this.GetRotation();
    this.TransformByRotation(this.rotatedLeftTangent, this.leftTangent, rotation);
    this.TransformByRotation(this.rotatedRightTangent, this.rightTangent, rotation);
    this.TransformByRotation(out, this._offset, rotation);
    const worldPosition = this.GetWorldPosition();
    if (worldPosition)
    {
      vec3.add(out, worldPosition, out);
    }
    return out;
  }

  /**
   * Finds the first locator in the requested Carbon locator set.
   * Mapped constructor identities implement the native BlueCastPtr query.
   */
  @meta.blue.method
  @meta.adapted
  GetLocator()
  {
    const object = this.object;
    if (!object || this.offsetLocatorName === "")
    {
      return null;
    }
    if (mappedInterfaces(object.constructor).has(EveSpaceObject2))
    {
      const locators = object.GetLocatorsForSet(this.offsetLocatorName);
      if (locators && locators.length > 0)
      {
        return locators[0];
      }
    }
    return null;
  }

  /**
   * Gets the active rotation as a normalized quaternion, when any applies.
   * Retained JavaScript helper replaces native GetLocatorRotation and
   * GetModelRotation matrices with a reusable quaternion.
   */
  @meta.ours
  GetRotation()
  {
    switch (this.rotationSetting)
    {
      case RotationSetting.LOCATOR_ROTATION:
        if (this._locator)
        {
          return quat.normalize(this._rotation, this._locator.direction);
        }
        break;
      case RotationSetting.MODEL_ROTATION:
        {
          if (this.object && mappedInterfaces(this.object.constructor).has(IWorldPosition))
          {
            return quat.normalize(this._rotation, this.object.GetWorldRotation());
          }
          break;
        }
    }
    return null;
  }

  /**
   * Gets the followed object's world position, if it exposes one.
   */
  @meta.ours
  GetWorldPosition()
  {
    return this.object && mappedInterfaces(this.object.constructor).has(IWorldPosition)
      ? this.object.GetWorldPosition() : null;
  }

  /**
   * Applies a pure rotation transform, or copies unchanged for identity.
   */
  @meta.ours
  TransformByRotation(out, value, rotation)
  {
    if (!rotation)
    {
      return vec3.copy(out, value);
    }
    return vec3.transformQuat(out, value, rotation);
  }

  /** Existing JavaScript access to the native rotation enum. */
  static RotationSetting = RotationSetting;

  /** Existing JavaScript access to the native interpolation enum. */
  static Tr2FollowCurveKeyInterpolation = Tr2FollowCurveKeyInterpolation;

}

meta.blue.interfaceTable({
  interfaces: [ ITr2FollowCurveKey, INotify, IInitialize ],
  chainTo: null
})(Tr2ObjectFollowCurveKey);
