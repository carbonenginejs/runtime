import { exposure as be } from "#be";
// Source: trinity/trinity/Curves/Tr2FollowCurveKey.h
// Source: trinity/trinity/Curves/Tr2FollowCurveKey.cpp
// Source: trinity/trinity/Curves/Tr2FollowCurveKey_Blue.cpp:63-85
import { vec3 } from "#math/vec3";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { IsMatch, INotify, IInitialize } from "#blue";
import { ITr2FollowCurveKey } from "../ITr2FollowCurveKey.js";
import { meta, type, blue } from "#schema";
import { Tr2FollowCurveKeyInterpolation } from "../enums.js";


/**
 * Key of a camera follow curve, holding the camera offset and its tangents plus
 * the field-of-view multiplier and framing angles used to place the camera box
 * at that point in time.
 *
 * Native exposure maps only ITr2FollowCurveKey, INotify and IInitialize; it
 * omits the concrete class and has no inherited query chain. Native destruction
 * is empty. Cached camera values and scratch buffers own no resources.
 * Existing ambient-context and gl-matrix framing adaptations are unchanged.
 */
@be.define("Tr2CameraFollowCurveKey")
@blue.inherit(INotify, IInitialize)
@be.mapInterface(ITr2FollowCurveKey)
@be.mapInterface(INotify)
@be.mapInterface(IInitialize)
export class Tr2CameraFollowCurveKey extends ITr2FollowCurveKey
{
  /** Authored shared-string key name. */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** Authored key time. */
  @blue.readwrite
  @blue.persist
  @type.float32
  time = 0;

  /** Native follow-key segment interpolation. */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.Tr2FollowCurveKeyInterpolation")
  interpolation = Tr2FollowCurveKeyInterpolation.LINEAR;

  /** Authored incoming tangent. */
  @blue.readwrite
  @blue.persist
  @type.vec3
  leftTangent = vec3.create();

  /** Authored outgoing tangent. */
  @blue.readwrite
  @blue.persist
  @type.vec3
  rightTangent = vec3.create();

  /** Last incoming tangent after the inverse-view coordinate transform. */
  @blue.read
  @type.vec3
  rotatedLeftTangent = vec3.create();

  /** Last outgoing tangent after the inverse-view coordinate transform. */
  @blue.read
  @type.vec3
  rotatedRightTangent = vec3.create();

  /** Runtime object bounds used for framing. */
  @blue.readwrite
  @type.vec3
  objectBounds = vec3.create();

  /** Authored angle around the view axis. */
  @blue.readwrite
  @blue.persist
  @type.float32
  angle = 0;

  /** Authored zero-angle reference, initially PI/2. */
  @blue.readwrite
  @blue.persist
  @type.float32
  angleZero = Math.PI / 2;

  /** Authored fraction of the field of view reserved inside the frame. */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  fovMultiplication = 0.5;

  /** Authored camera-box offset. */
  @blue.readwrite
  @blue.persist
  @type.vec3
  offset = vec3.create();

  /** Last calculated camera-box position. */
  @blue.read
  @type.vec3
  boxPosition = vec3.create();

  /** Runtime switch between live and captured camera state. */
  @blue.notify
  @blue.readwrite
  @type.boolean
  enabled = true;

  /** Native cached half-FOV and near plane used by the framing calculation. */
  _fov = 0;

  /** Cached near clip distance. */
  _frontClip = 0;

  /** Cached minimum distance along the view direction. */
  _minDistanceAlongViewAngle = 0;

  /** Cached minimum distance from the view direction. */
  _minDistanceFromViewAngle = 0;

  /** Camera state captured when enabled changes, used while disabled. */
  _lastEnabledFOV = 0;

  /** Near clip captured by an enabled-field notification. */
  _lastEnabledFrontClip = 10;

  /** Independent inverse-view snapshot captured on enabled changes. */
  _lastEnabledInverseViewMatrix = mat4.create();

  /** Quaternion scratch for the existing JavaScript framing calculation. */
  _orientation = quat.create();

  /** Vector scratch for the existing JavaScript framing calculation. */
  _boxOffset = vec3.create();

  /**
   * Initializes derived camera-box values.
   *
   * @returns {boolean} True after calculating the camera box.
   */
  @blue.method
  @meta.implemented
  Initialize()
  {
    this.CalculateBoxPosition();
    return true;
  }

  /**
   * Clamps the FOV multiplier or captures camera state for an enabled change.
   *
   * @param {string|null} [propertyName=null] Changed field name.
   * @returns {boolean} True.
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName = null)
  {
    if (IsMatch(propertyName, "fovMultiplication"))
    {
      this.fovMultiplication = Math.min(0.999, Math.max(0.001, this.fovMultiplication));
    }
    if (IsMatch(propertyName, "enabled"))
    {
      // Tr2FollowCurveKey.cpp:187-189.
      this._lastEnabledFOV = Math.fround(Tr2Renderer.GetFieldOfView() * 0.5);
      mat4.copy(this._lastEnabledInverseViewMatrix, Tr2Renderer.GetInverseViewTransform());
      this._lastEnabledFrontClip = Math.fround(Tr2Renderer.GetFrontClip());
    }
    return true;
  }

  /**
   * Fits the bounds between the outer and inner view cones and transforms the result.
   *
   * Adapted: gl-matrix carries its vector/quaternion transforms. Disabled keys
   * retain the captured FOV, near plane and inverse view, but still use the
   * current aspect (Tr2FollowCurveKey.cpp:204-220). Tangents use coordinate
   * transforms, including translation, as Carbon does.
   *
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  CalculateBoxPosition()
  {
    let inverseView = Tr2Renderer.GetInverseViewTransform();
    this._fov = Math.fround(Tr2Renderer.GetFieldOfView() * 0.5);
    this._frontClip = Math.fround(Tr2Renderer.GetFrontClip());
    if (!this.enabled)
    {
      inverseView = this._lastEnabledInverseViewMatrix;
      this._fov = this._lastEnabledFOV;
      this._frontClip = this._lastEnabledFrontClip;
    }

    const outer = Math.fround(Math.tan(this._fov));
    const inner = Math.fround(Math.tan(Math.fround(this._fov * this.fovMultiplication)));
    const nearSize = Math.fround(this._frontClip / outer);
    const aspect = Math.fround(Tr2Renderer.GetAspectRatio());
    const nearDistance = Math.max(Math.fround(nearSize * aspect), Math.fround(nearSize / aspect));
    const radius = Math.max(Math.fround(Math.hypot(this.objectBounds[0], this.objectBounds[1])), nearDistance);
    if (inner === outer)
    {
      this._minDistanceFromViewAngle = 0;
      this._minDistanceAlongViewAngle = 0;
      return;
    }

    this._minDistanceAlongViewAngle = Math.fround(Math.fround(2 * radius) / Math.fround(outer - inner));
    this._minDistanceFromViewAngle = Math.fround(this._minDistanceAlongViewAngle * inner);
    const minimum = Math.fround(this._frontClip + this.objectBounds[2]);
    if (this._minDistanceAlongViewAngle < minimum)
    {
      this._minDistanceAlongViewAngle = minimum;
      this._minDistanceFromViewAngle = Math.fround(minimum * inner);
    }

    quat.setAxisAngle(this._orientation, [0, 0, -1], Math.fround(this.angle + this.angleZero));
    vec3.set(this._boxOffset, Math.fround(radius + this._minDistanceFromViewAngle), 0, 0);
    vec3.transformQuat(this._boxOffset, this._boxOffset, this._orientation);
    this._boxOffset[0] += this.offset[0];
    this._boxOffset[1] += this.offset[1];
    this._boxOffset[2] += Math.fround(-this._minDistanceAlongViewAngle - this.objectBounds[2]) - this.offset[2];
    vec3.transformMat4(this.rotatedLeftTangent, this.leftTangent, inverseView);
    vec3.transformMat4(this.rotatedRightTangent, this.rightTangent, inverseView);
    vec3.transformMat4(this.boxPosition, this._boxOffset, inverseView);
  }

  /**
   * Recalculates framing and copies the camera-box position into the output.
   *
   * Adapted: Returns the caller-provided vector instead of a native value copy.
   *
   * @param {Float32Array} out Destination vector.
   * @returns {Float32Array} The destination vector.
   */
  @blue.method
  @meta.adapted
  GetValue(out)
  {
    this.CalculateBoxPosition();
    return vec3.copy(out, this.boxPosition);
  }

  /**
   * Gets key time.
   * @returns {number} Authored key time.
   */
  @blue.method
  @meta.implemented
  GetTime()
  {
    return this.time;
  }

  /**
   * Gets key interpolation.
   * @returns {number} Native follow-key interpolation enum value.
   */
  @blue.method
  @meta.implemented
  GetInterpolationType()
  {
    return this.interpolation;
  }

  /**
   * Copies the last calculated left tangent into the output.
   *
   * Adapted: Uses a caller-provided output vector instead of a native value copy.
   *
   * @param {Float32Array} out Destination vector.
   * @returns {Float32Array} The destination vector.
   */
  @blue.method
  @meta.adapted
  GetLeftTangent(out)
  {
    return vec3.copy(out, this.rotatedLeftTangent);
  }

  /**
   * Copies the last calculated right tangent into the output.
   *
   * Adapted: Uses a caller-provided output vector instead of a native value copy.
   *
   * @param {Float32Array} out Destination vector.
   * @returns {Float32Array} The destination vector.
   */
  @blue.method
  @meta.adapted
  GetRightTangent(out)
  {
    return vec3.copy(out, this.rotatedRightTangent);
  }

  /** Existing JavaScript access to the shared native interpolation enum. */
  static Tr2FollowCurveKeyInterpolation = Tr2FollowCurveKeyInterpolation;

}

