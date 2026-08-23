// Source: trinity/trinity/Curves/Tr2CurveQuaternion.h
// Source: trinity/trinity/Curves/Tr2CurveQuaternion.cpp
import { quat } from "#math/quat";
import { CjsModel } from "#model";
import { type } from "#schema";
import { Tr2CurveInterpolation } from "../enums.js";


/**
 * One key of a Tr2CurveQuaternion: a time in seconds, the quaternion value at
 * that time, and the interpolation used to reach the next key.
 */
@type.define({
  className: "Tr2CurveQuaternionKey",
  family: "curves"
})
export class Tr2CurveQuaternionKey extends CjsModel
{
  @type.float32
  time = 0;

  @type.quat
  value = quat.create();

  @type.uint16
  id = 0;

  @type.uint16
  interpolation = Tr2CurveInterpolation.LINEAR;
}
