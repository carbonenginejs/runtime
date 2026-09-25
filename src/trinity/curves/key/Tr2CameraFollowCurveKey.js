// Source: trinity/trinity/Curves/Tr2FollowCurveKey.h
// Source: trinity/trinity/Curves/Tr2FollowCurveKey.cpp
import { vec3 } from "#math/vec3";
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
  @type.enum("Tr2FollowCurveKeyInterpolation")
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

  /**
   * Initializes derived camera-box values.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.CalculateBoxPosition();
    return true;
  }

  /**
   * Recalculates derived values after modification.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    this.fovMultiplication = Math.min(0.999, Math.max(0.001, this.fovMultiplication));
    this.CalculateBoxPosition();
    return true;
  }

  /**
   * Updates camera box/tangent positions.
   */
  @carbon.method
  @impl.adapted
  CalculateBoxPosition()
  {
    vec3.copy(this.boxPosition, this.offset);
    vec3.copy(this.rotatedLeftTangent, this.leftTangent);
    vec3.copy(this.rotatedRightTangent, this.rightTangent);
  }

  /**
   * Gets key value.
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
   * Gets left tangent.
   */
  @carbon.method
  @impl.adapted
  GetLeftTangent(out)
  {
    return vec3.copy(out, this.rotatedLeftTangent);
  }

  /**
   * Gets right tangent.
   */
  @carbon.method
  @impl.adapted
  GetRightTangent(out)
  {
    return vec3.copy(out, this.rotatedRightTangent);
  }

  static Tr2FollowCurveKeyInterpolation = Tr2FollowCurveKeyInterpolation;

}
