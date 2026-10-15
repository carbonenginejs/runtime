// Adapted from CCPWGL Tw2ColorKey2 (MIT, Copyright (c) 2020
// ccpgames rawrafox cppctamber) and corroborated by historical Tr2ColorKey
// Black records.
import { meta, type } from "#schema";
import { vec4 } from "#math/vec4";
import { IncarnaColorCurveInterpolation } from "./enums.js";

/** One key in a historical Incarna color curve. */
@meta.define("Tr2ColorKey")
export class Tr2ColorKey
{

  @meta.persist
  @type.string
  name = "";

  @meta.persist
  @type.float32
  time = 0;

  @meta.persist
  @type.color
  value = vec4.create();

  @meta.persist
  @type.vec4
  leftTangent = vec4.create();

  @meta.persist
  @type.vec4
  rightTangent = vec4.create();

  @meta.persist
  @type.uint32
  @type.enum("Interpolation")
  interpolation = IncarnaColorCurveInterpolation.LINEAR;

  static Interpolation = IncarnaColorCurveInterpolation;

}
