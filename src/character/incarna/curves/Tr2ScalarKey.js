// Adapted from CCPWGL Tw2ScalarKey2 (MIT, Copyright (c) 2020
// ccpgames rawrafox cppctamber) and corroborated by historical Tr2ScalarKey
// Black records.
import { meta } from "#schema";
import { IncarnaScalarCurveInterpolation } from "./enums.js";

/** One key in a historical Incarna scalar curve. */
@meta.define({ className: "Tr2ScalarKey", family: "incarna" })
export class Tr2ScalarKey
{

  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.persist
  @meta.type.float32
  time = 0;

  @meta.blue.persist
  @meta.type.float32
  value = 0;

  @meta.blue.persist
  @meta.type.float32
  leftTangent = 0;

  @meta.blue.persist
  @meta.type.float32
  rightTangent = 0;

  @meta.blue.persist
  @meta.type.uint32
  @meta.type.enum("Interpolation")
  interpolation = IncarnaScalarCurveInterpolation.LINEAR;

  static Interpolation = IncarnaScalarCurveInterpolation;

}
