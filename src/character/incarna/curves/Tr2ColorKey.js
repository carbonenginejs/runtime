// Adapted from CCPWGL Tw2ColorKey2 (MIT, Copyright (c) 2020
// ccpgames rawrafox cppctamber) and corroborated by historical Tr2ColorKey
// Black records.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { vec4 } from "#math/vec4";
import { IncarnaColorCurveInterpolation } from "./enums.js";

/** One key in a historical Incarna color curve. */
@type.define({ className: "Tr2ColorKey", family: "incarna" })
export class Tr2ColorKey extends CjsModel
{

  @edit.persist
  @type.string
  name = "";

  @edit.persist
  @type.float32
  time = 0;

  @edit.persist
  @type.color
  value = vec4.create();

  @edit.persist
  @type.vec4
  leftTangent = vec4.create();

  @edit.persist
  @type.vec4
  rightTangent = vec4.create();

  @edit.persist
  @type.uint32
  @type.enum("Interpolation")
  interpolation = IncarnaColorCurveInterpolation.LINEAR;

  static Interpolation = IncarnaColorCurveInterpolation;

}
