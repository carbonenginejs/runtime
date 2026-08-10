// Source: E:\carbonengine\trinity\trinity\Curves\Tr2FollowCurveKey.h
// Source: E:\carbonengine\trinity\trinity\Curves\Tr2FollowCurveKey.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
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
  @io.persist
  @type.int32
  @schema.enum("Tr2FollowCurveKeyInterpolation")
  interpolation = Tr2FollowCurveKeyInterpolation.LINEAR;

  @io.notify
  @io.persist
  @type.float32
  fovMultiplication = 0.5;

  @io.persist
  @type.vec3
  offset = vec3.create();

  @io.notify
  @io.readwrite
  @type.boolean
  enabled = true;

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.float32
  angleZero = Math.PI / 2;

  @io.persist
  @type.float32
  angle = 0;

  @io.readwrite
  @type.vec3
  objectBounds = vec3.create();

  @io.persist
  @type.vec3
  leftTangent = vec3.create();

  @io.read
  @type.vec3
  boxPosition = vec3.create();

  @io.persist
  @type.vec3
  rightTangent = vec3.create();

  @io.read
  @type.vec3
  rotatedLeftTangent = vec3.create();

  @io.read
  @type.vec3
  rotatedRightTangent = vec3.create();

  @io.persist
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
