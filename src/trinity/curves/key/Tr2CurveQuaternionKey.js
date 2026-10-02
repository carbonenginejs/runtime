// Source: trinity/trinity/Curves/Tr2CurveQuaternion.h
// Source: trinity/trinity/Curves/Tr2CurveQuaternion.cpp
import { quat } from "#math/quat";
import { edit, type } from "#schema";
import { Tr2CurveInterpolation } from "../enums.js";


/**
 * Native plain structure represented as a registered JavaScript data record.
 * One key of a Tr2CurveQuaternion: a time in seconds, the quaternion value at
 * that time, and the interpolation used to reach the next key.
 */
@type.define({
  className: "Tr2CurveQuaternionKey",
  family: "curves"
})
export class Tr2CurveQuaternionKey
{
  /**
   * Key position on the curve's local timeline, in seconds.
   * @type {number}
   */
  @edit.persist
  @type.float32
  time = 0;

  /**
   * Quaternion value in [x, y, z, w] order; initial storage belongs to this key.
   * @type {Float32Array|Float64Array|number[]}
   */
  @edit.persist
  @type.quat
  value = quat.create();

  /**
   * Unsigned 16-bit key identifier used by the editor.
   * @type {number}
   */
  @edit.persist
  @type.uint16
  id = 0;

  /**
   * Tr2CurveInterpolation value selecting interpolation for the following segment.
   * @type {number}
   */
  @edit.persist
  @type.uint16
  interpolation = Tr2CurveInterpolation.LINEAR;
}
