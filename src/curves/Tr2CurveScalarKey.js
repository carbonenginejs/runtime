// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveScalar.h
// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveScalar.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2CurveInterpolation, Tr2CurveTangentType } from "./enums.js";


/**
 * One key of a Tr2CurveScalar: a time in seconds, a value, its left and right
 * tangents in value units per unit time, the interpolation used to reach the
 * next key, and the tangent-type rule that maintains the tangents.
 */
@type.define({
  className: "Tr2CurveScalarKey",
  family: "curves"
})
export class Tr2CurveScalarKey extends CjsModel
{
  @type.float32
  time = 0;

  @type.float32
  value = 0;

  @type.float32
  leftTangent = 0;

  @type.float32
  rightTangent = 0;

  @type.uint16
  id = 0;

  @type.uint8
  interpolation = Tr2CurveInterpolation.HERMITE;

  @type.uint8
  tangentType = Tr2CurveTangentType.AUTO_CLAMP;
}
