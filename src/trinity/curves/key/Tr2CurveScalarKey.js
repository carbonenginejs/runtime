// Source: trinity/trinity/Curves/Tr2CurveScalar.h
// Source: trinity/trinity/Curves/Tr2CurveScalar.cpp
import { meta } from "#schema";
import { Tr2CurveInterpolation, Tr2CurveTangentType } from "../enums.js";


/**
 * Native plain structure represented as a registered JavaScript data record.
 * One key of a Tr2CurveScalar: a time in seconds, a value, its left and right
 * tangents in value units per unit time, the interpolation used to reach the
 * next key, and the tangent-type rule that maintains the tangents.
 * Native 64-bit size 20; offsets and storage types: trinity/trinity/
 * Curves/Tr2CurveScalar.h:54-70; Curves/Tr2CurveScalar.cpp:12-21.
 */
@meta.define({
  className: "Tr2CurveScalarKey",
  family: "curves"
})
@meta.struct.define({ size: 20 })
export class Tr2CurveScalarKey
{
  /**
   * Key position on the curve's local timeline, in seconds.
   * @type {number}
   */
  @meta.blue.persist
  @meta.struct.FLOAT32_1(0)
  time = 0;

  /**
   * Scalar value at this key, in units chosen by the curve's consumer.
   * @type {number}
   */
  @meta.blue.persist
  @meta.struct.FLOAT32_1(4)
  value = 0;

  /**
   * Incoming slope in value units per second of local curve time.
   * @type {number}
   */
  @meta.blue.persist
  @meta.struct.FLOAT32_1(8)
  leftTangent = 0;

  /**
   * Outgoing slope in value units per second of local curve time.
   * @type {number}
   */
  @meta.blue.persist
  @meta.struct.FLOAT32_1(12)
  rightTangent = 0;

  /**
   * Unsigned 16-bit key identifier used by the editor.
   * @type {number}
   */
  @meta.blue.persist
  @meta.struct.USHORT_1(16)
  id = 0;

  /**
   * Tr2CurveInterpolation value selecting interpolation for the following segment.
   * @type {number}
   */
  @meta.blue.persist
  @meta.struct.UBYTE_1(18)
  interpolation = Tr2CurveInterpolation.HERMITE;

  /**
   * Tr2CurveTangentType value controlling automatic, joined or independent tangents.
   * @type {number}
   */
  @meta.blue.persist
  @meta.struct.UBYTE_1(19)
  tangentType = Tr2CurveTangentType.AUTO_CLAMP;
}
