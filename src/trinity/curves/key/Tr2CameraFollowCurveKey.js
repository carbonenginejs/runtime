// Source: trinity/trinity/Curves/Tr2FollowCurveKey.h
// Source: trinity/trinity/Curves/Tr2FollowCurveKey.cpp
import { vec3 } from "#math/vec3";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";
import { Tr2FollowCurveKeyInterpolation } from "../enums.js";


/**
 * Key of a camera follow curve, holding the camera offset and its tangents plus
 * the field-of-view multiplier and framing angles used to place the camera box
 * at that point in time.
 */
@type.define({
  className: "Tr2CameraFollowCurveKey",
  family: "curves"
})
export class Tr2CameraFollowCurveKey extends CjsModel
{
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.Tr2FollowCurveKeyInterpolation")
  interpolation = Tr2FollowCurveKeyInterpolation.LINEAR;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  fovMultiplication = 0.5;

  @edit.readwrite
  @edit.persist
  @type.vec3
  offset = vec3.create();

  @edit.notify
  @edit.readwrite
  @type.boolean
  enabled = true;

  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  @edit.readwrite
  @edit.persist
  @type.float32
  angleZero = Math.PI / 2;

  @edit.readwrite
  @edit.persist
  @type.float32
  angle = 0;

  @edit.readwrite
  @type.vec3
  objectBounds = vec3.create();

  @edit.readwrite
  @edit.persist
  @type.vec3
  leftTangent = vec3.create();

  @edit.read
  @type.vec3
  boxPosition = vec3.create();

  @edit.readwrite
  @edit.persist
  @type.vec3
  rightTangent = vec3.create();

  @edit.read
  @type.vec3
  rotatedLeftTangent = vec3.create();

  @edit.read
  @type.vec3
  rotatedRightTangent = vec3.create();

  @edit.readwrite
  @edit.persist
  @type.float32
  time = 0;

  /** Native cached half-FOV and near plane used by the framing calculation. */
  _fov = 0;

  _frontClip = 0;

  _minDistanceAlongViewAngle = 0;

  _minDistanceFromViewAngle = 0;

  /** Camera state captured when enabled changes, used while disabled. */
  _lastEnabledFOV = 0;

  _lastEnabledFrontClip = 10;

  _lastEnabledInverseViewMatrix = mat4.create();

  _orientation = quat.create();

  _boxOffset = vec3.create();

  /**
   * Initializes derived camera-box values.
   *
   * Adapted: Reads Carbon's renderer camera state from the ambient render context.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.CalculateBoxPosition();
    return true;
  }

  /**
   * Clamps the FOV multiplier or captures camera state for an enabled change.
   *
   * Adapted: Uses a property name instead of Carbon's changed-field pointer.
   * Renderer camera state lives on the ambient render context.
   *
   * @param {string|null} [propertyName=null] Changed field name.
   * @returns {boolean} True.
   */
  @carbon.method
  @impl.adapted
  OnModified(propertyName = null)
  {
    if (propertyName === "fovMultiplication")
    {
      this.fovMultiplication = Math.min(0.999, Math.max(0.001, this.fovMultiplication));
    }
    if (propertyName === "enabled")
    {
      const context = Tr2RenderContext_GetMainThreadRenderContext();
      this._lastEnabledFOV = Math.fround(context.GetFieldOfView() * 0.5);
      mat4.copy(this._lastEnabledInverseViewMatrix, context.GetInverseViewTransform());
      this._lastEnabledFrontClip = Math.fround(context.GetFrontClip());
    }
    return true;
  }

  /**
   * Fits the bounds between the outer and inner view cones and transforms the result.
   *
   * Adapted: Uses the ambient render context for Carbon's renderer state and
   * gl-matrix for its vector/quaternion transforms. Aspect is derived from the
   * projection as in Tr2Renderer::UpdateProjectionParameters. Disabled keys retain
   * the captured FOV, near plane and inverse view, but still use the current aspect.
   * Tangents use coordinate transforms, including translation, as Carbon does.
   *
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  CalculateBoxPosition()
  {
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    let inverseView = context.GetInverseViewTransform();
    this._fov = Math.fround(context.GetFieldOfView() * 0.5);
    this._frontClip = Math.fround(context.GetFrontClip());
    if (!this.enabled)
    {
      inverseView = this._lastEnabledInverseViewMatrix;
      this._fov = this._lastEnabledFOV;
      this._frontClip = this._lastEnabledFrontClip;
    }

    const outer = Math.fround(Math.tan(this._fov));
    const inner = Math.fround(Math.tan(Math.fround(this._fov * this.fovMultiplication)));
    const nearSize = Math.fround(this._frontClip / outer);
    const projection = context.GetProjection();
    const aspect = projection && projection[0] ? Math.fround(projection[5] / projection[0]) : 0;
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
  @carbon.method
  @impl.adapted
  GetValue(out)
  {
    this.CalculateBoxPosition();
    return vec3.copy(out, this.boxPosition);
  }

  /**
   * Gets key time.
   */
  @carbon.method
  @impl.implemented
  GetTime()
  {
    return this.time;
  }

  /**
   * Gets key interpolation.
   */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.adapted
  GetRightTangent(out)
  {
    return vec3.copy(out, this.rotatedRightTangent);
  }

  static Tr2FollowCurveKeyInterpolation = Tr2FollowCurveKeyInterpolation;

}
