// Source: trinity/trinity/Curves/Tr2CurveQuaternion.h
// Source: trinity/trinity/Curves/Tr2CurveQuaternion.cpp
import { quat } from "#math/quat";
import { meta, edit, type } from "#schema";
import { Tr2CurveInterpolation } from "../enums.js";


/**
 * Native plain structure represented as a registered JavaScript data record.
 * One key of a Tr2CurveQuaternion: a time in seconds, the quaternion value at
 * that time, and the interpolation used to reach the next key.
 * Native 64-bit size 24; offsets and storage types: trinity/trinity/
 * Curves/Tr2CurveQuaternion.h:9-19; Curves/Tr2CurveQuaternion.cpp:11-17.
 */
@type.define({
  className: "Tr2CurveQuaternionKey",
  family: "curves"
})
@meta.struct.define({ size: 24 })
export class Tr2CurveQuaternionKey
{
  /**
   * Key position on the curve's local timeline, in seconds.
   * @type {number}
   */
  @edit.persist
  @meta.struct.FLOAT32_1(0)
  time = 0;

  /**
   * Quaternion value in [x, y, z, w] order; initial storage belongs to this key.
   * @type {Float32Array|Float64Array|number[]}
   */
  @edit.persist
  @meta.struct.FLOAT32_4(4)
  @type.quat
  value = quat.create();

  /**
   * Unsigned 16-bit key identifier used by the editor.
   * @type {number}
   */
  @edit.persist
  @meta.struct.USHORT_1(20)
  id = 0;

  /**
   * Tr2CurveInterpolation value selecting interpolation for the following segment.
   * @type {number}
   */
  @edit.persist
  @meta.struct.USHORT_1(22)
  interpolation = Tr2CurveInterpolation.LINEAR;
}
