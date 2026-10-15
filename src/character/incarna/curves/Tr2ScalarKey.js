// Adapted from CCPWGL Tw2ScalarKey2 (MIT, Copyright (c) 2020
// ccpgames rawrafox cppctamber) and corroborated by historical Tr2ScalarKey
// Black records.
import { meta, type, blue } from "#schema";
import { IncarnaScalarCurveInterpolation } from "./enums.js";

/** One key in a historical Incarna scalar curve. */
@meta.define("Tr2ScalarKey")
export class Tr2ScalarKey
{

  @blue.persist
  @type.string
  name = "";

  @blue.persist
  @type.float32
  time = 0;

  @blue.persist
  @type.float32
  value = 0;

  @blue.persist
  @type.float32
  leftTangent = 0;

  @blue.persist
  @type.float32
  rightTangent = 0;

  @blue.persist
  @type.uint32
  @type.enum("Interpolation")
  interpolation = IncarnaScalarCurveInterpolation.LINEAR;

  static Interpolation = IncarnaScalarCurveInterpolation;

}
