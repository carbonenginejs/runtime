import { exposure as be } from "#be";
// Source: trinity/trinity/Curves/Tr2FollowCurveKey.h
// Source: trinity/trinity/Curves/Tr2FollowCurveKey.cpp
// Source: trinity/trinity/Curves/Tr2FollowCurveKey_Blue.cpp:45-64
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { IsMatch, INotify, IInitialize, blue, CjsBlueClasses } from "#blue";
import { IWorldPosition } from "../../core/IWorldPosition.js";
import { EveSpaceObject2 } from "../../eve/spaceObject/EveSpaceObject2.js";
import { ITr2FollowCurveKey } from "../ITr2FollowCurveKey.js";
import { meta, type } from "#schema";
import { Tr2FollowCurveKeyInterpolation, RotationSetting } from "../enums.js";


/**
 * Follow-curve key positioned by another object rather than a fixed point,
 * taking its place from that object's locator or offset and optionally rotating
 * its tangents with the object.
 * Native exposure omits self and maps only the follow-key, notify and initialize
 * contracts. Vector output buffers retain the JS adapter.
 * Native destruction only clears references; no resource disposal is required.
 */
@be.define("Tr2ObjectFollowCurveKey")
@be.inherit(INotify, IInitialize)
@be.mapInterface(ITr2FollowCurveKey)
@be.mapInterface(INotify)
@be.mapInterface(IInitialize)
export class Tr2ObjectFollowCurveKey extends ITr2FollowCurveKey
{
  /** Authored key name. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** Runtime followed object; notified but not persisted. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.object.ref("IRoot")
  object = null;

  /** Authored key time. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  time = 0;

  /**
   * Authored interpolation of the outgoing segment.
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Curves/Tr2FollowCurveKey_Blue.cpp:51); chooser Tr2FollowCurveKeyInterpolationChooser (trinity/trinity/Curves/Tr2FollowCurveKey_Blue.cpp:24).
   */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.ENUM, "trinity.Tr2FollowCurveKeyInterpolation")
  @type.int32
  @type.enum("trinity.Tr2FollowCurveKeyInterpolation")
  interpolation = Tr2FollowCurveKeyInterpolation.LINEAR;

  /** Authored incoming tangent. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  leftTangent = vec3.create();

  /** Authored outgoing tangent. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  rightTangent = vec3.create();

  /** Last sampled incoming tangent. */
  @be.mapAttribute(be.READ)
  @type.vec3
  rotatedLeftTangent = vec3.create();

  /** Last sampled outgoing tangent. */
  @be.mapAttribute(be.READ)
  @type.vec3
  rotatedRightTangent = vec3.create();

  /** Authored locator set name. */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.string
  offsetLocatorName = "";

  /** Authored local position offset. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  offset = vec3.create();

  /**
   * Authored rotation selection.
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Curves/Tr2FollowCurveKey_Blue.cpp:58); chooser RotationChooser (trinity/trinity/Curves/Tr2FollowCurveKey_Blue.cpp:11).
   */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.ENUM, "trinity.Tr2ObjectFollowCurveKey.RotationSetting")
  @type.int32
  @type.enum("trinity.Tr2ObjectFollowCurveKey.RotationSetting")
  rotationSetting = RotationSetting.NO_ROTATION;

  /** Cached first locator; owned by the followed object. */
  _locator = null;

  /** Reusable local offset scratch. */
  _offset = vec3.create();

  /** Reusable normalized rotation scratch. */
  _rotation = quat.create();

  /**
   * Resolves the current locator cache.
   *
   * @implemented
   */

  @meta.implemented
  Initialize()
  {
    this._locator = this.GetLocator();
    return true;
  }

  /**
   * Re-resolves the locator after object or locator-name changes.
   * JavaScript property-name tokens replace native Be::Var member matching.
   *
   * @implemented
   * @param {string|null} propertyName Changed member name.
   * @returns {boolean} True.
   */

  @meta.implemented
  OnModified(propertyName = null)
  {
    if (IsMatch(propertyName, "object") || IsMatch(propertyName, "offsetLocatorName"))
    {
      this._locator = this.GetLocator();
    }
    return true;
  }

  /**
   * Gets the key time.
   *
   * @implemented
   */

  @meta.implemented
  GetTime()
  {
    return this.time;
  }

  /**
   * Gets the segment interpolation mode starting at this key.
   *
   * @implemented
   */

  @meta.implemented
  GetInterpolationType()
  {
    return this.interpolation;
  }

  /**
   * Gets the rotated left tangent into `out`.
   * The caller's output buffer replaces the native vector value return.
   *
   * @adapted
   */

  @meta.adapted
  GetLeftTangent(out)
  {
    return vec3.copy(out, this.rotatedLeftTangent);
  }

  /**
   * Gets the rotated right tangent into `out`.
   * The caller's output buffer replaces the native vector value return.
   *
   * @adapted
   */

  @meta.adapted
  GetRightTangent(out)
  {
    return vec3.copy(out, this.rotatedRightTangent);
  }

  /**
   * Gets the followed object position plus local offset into `out`.
   * Carbon: Tr2ObjectFollowCurveKey::GetValue (trinity/trinity/Curves/Tr2FollowCurveKey.cpp:101-141).
   * The caller's output buffer replaces the native vector value return.
   *
   * @adapted
   */

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

    const { mat4_0: rotationMatrix } = Tr2ObjectFollowCurveKey.scratch;
    switch (this.rotationSetting)
    {
      case RotationSetting.LOCATOR_ROTATION:
        this._GetLocatorRotation(rotationMatrix);
        break;
      case RotationSetting.MODEL_ROTATION:
        this._GetModelRotation(rotationMatrix);
        break;
      case RotationSetting.NO_ROTATION:
      default:
        mat4.identity(rotationMatrix);
        break;
    }

    vec3.transformMat4(this.rotatedLeftTangent, this.leftTangent, rotationMatrix);
    vec3.transformMat4(this.rotatedRightTangent, this.rightTangent, rotationMatrix);
    vec3.transformMat4(out, this._offset, rotationMatrix);

    const { vec3_0 } = Tr2ObjectFollowCurveKey.scratch;
    if (this.GetWorldPosition(vec3_0))
    {
      vec3.add(out, vec3_0, out);
    }
    return out;
  }

  /**
   * Finds the first locator in the requested Carbon locator set.
   * Mapped constructor identities implement the native BlueCastPtr query.
   *
   * @adapted
   */

  @meta.adapted
  GetLocator()
  {
    const object = this.object;
    if (!object || this.offsetLocatorName === "")
    {
      return null;
    }
    if (blue.classes.QueryThisInterface(object, EveSpaceObject2, object.constructor, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) !== null)
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
   * Gets the rotation of the cached locator as a matrix, or identity without one.
   * Carbon: Tr2ObjectFollowCurveKey::GetLocatorRotation (trinity/trinity/Curves/Tr2FollowCurveKey.cpp:82-89).
   * Carbon's RotationMatrix( Normalize( direction ) ) (Matrix_inline.h:365-386) shares its byte layout with
   * gl-matrix's fromQuat, so the matrix ports unchanged; the caller's output replaces the native value return.
   *
   * @adapted
   * @param {Float32Array} out Destination matrix.
   * @returns {Float32Array} The destination.
   */
  @meta.adapted
  _GetLocatorRotation(out)
  {
    if (this._locator)
    {
      return mat4.fromQuat(out, quat.normalize(this._rotation, this._locator.direction));
    }

    return mat4.identity(out);
  }

  /**
   * Gets the followed object's world rotation as a matrix, or identity when it has no world position.
   * Carbon: Tr2ObjectFollowCurveKey::GetModelRotation (trinity/trinity/Curves/Tr2FollowCurveKey.cpp:91-98).
   * Same layout note as _GetLocatorRotation; the caller's output replaces the native value return.
   *
   * @adapted
   * @param {Float32Array} out Destination matrix.
   * @returns {Float32Array} The destination.
   */
  @meta.adapted
  _GetModelRotation(out)
  {
    if (this.object && blue.classes.QueryThisInterface(this.object, IWorldPosition, this.object.constructor, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) !== null)
    {
      quat.normalize(this._rotation, this.object.GetWorldRotation(this._rotation));
      return mat4.fromQuat(out, this._rotation);
    }

    return mat4.identity(out);
  }

  /**
   * Writes the followed object's world position into out when it maps IWorldPosition; null otherwise.
   * @param {Float32Array} out Caller-owned position.
   * @returns {Float32Array|null} out, or null without a positioned object.
   */
  GetWorldPosition(out)
  {
    return this.object && blue.classes.QueryThisInterface(this.object, IWorldPosition, this.object.constructor, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) !== null
      ? this.object.GetWorldPosition(out) : null;
  }

  /** Named scratch slots; always dirty, used within one method. */
  static scratch = { vec3_0: vec3.create(), mat4_0: mat4.create() };

  /** Existing JavaScript access to the native rotation enum. */
  static RotationSetting = RotationSetting;

  /** Existing JavaScript access to the native interpolation enum. */
  static Tr2FollowCurveKeyInterpolation = Tr2FollowCurveKeyInterpolation;

}

