// Adapted from CCPWGL Tw2ScalarKey2 (MIT, Copyright (c) 2020
// ccpgames rawrafox cppctamber) and corroborated by historical Tr2ScalarKey
// Black records.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { IncarnaScalarCurveInterpolation } from "./enums.js";

/** One key in a historical Incarna scalar curve. */
@type.define({ className: "Tr2ScalarKey", family: "incarna" })
export class Tr2ScalarKey extends CjsModel
{

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.float32
  time = 0;

  @io.persist
  @type.float32
  value = 0;

  @io.persist
  @type.float32
  leftTangent = 0;

  @io.persist
  @type.float32
  rightTangent = 0;

  @io.persist
  @type.uint32
  @type.enum("Interpolation")
  interpolation = IncarnaScalarCurveInterpolation.LINEAR;

  static Interpolation = IncarnaScalarCurveInterpolation;

}
