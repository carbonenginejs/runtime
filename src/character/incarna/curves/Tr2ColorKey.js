// Adapted from CCPWGL Tw2ColorKey2 (MIT, Copyright (c) 2020
// ccpgames rawrafox cppctamber) and corroborated by historical Tr2ColorKey
// Black records.
import { meta } from "#schema";
import { vec4 } from "#math/vec4";
import { IncarnaColorCurveInterpolation } from "./enums.js";

/** One key in a historical Incarna color curve. */
@meta.define({ className: "Tr2ColorKey", family: "incarna" })
export class Tr2ColorKey
{

  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.persist
  @meta.type.float32
  time = 0;

  @meta.blue.persist
  @meta.type.color
  value = vec4.create();

  @meta.blue.persist
  @meta.type.vec4
  leftTangent = vec4.create();

  @meta.blue.persist
  @meta.type.vec4
  rightTangent = vec4.create();

  @meta.blue.persist
  @meta.type.uint32
  @meta.type.enum("Interpolation")
  interpolation = IncarnaColorCurveInterpolation.LINEAR;

  static Interpolation = IncarnaColorCurveInterpolation;

}
