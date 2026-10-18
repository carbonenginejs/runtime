// Source: trinity/trinity/Utilities/MatrixUtils.h:9-17 (the struct)
//   trinity/trinity/Utilities/MatrixUtils.cpp:6-26 (both conversions)
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { mat4 } from "#math/mat4";

/**
 * A transform packed into twelve floats, dropping the constant fourth column.
 * Native Float4x3 is a plain struct without Blue exposure; registered typed
 * storage is JavaScript dictionary/inspection only, with no persistence or
 * query interfaces. Zero-filled default storage adapts native uninitialized
 * aggregate storage. The typed-array initializer fixes the runtime width at 12.
 * The conversions are mat4.getAffineCarbon / mat4.fromAffineCarbon.
 */
@blue.define("Float4x3")
export class Float4x3
{

  /**
   * Twelve components grouped as native matrix columns [_11, _21, _31, _41],
   * [_12, _22, _32, _42], [_13, _23, _33, _43]: three float4 registers, with the
   * affine fourth column (0, 0, 0, 1) omitted. The Float32Array storage belongs
   * to this record; its width of 12 comes from the initializer.
   * @type {Float32Array}
   */
  @type.float32Array
  elements = new Float32Array(12);

  // Carbon MatrixUtils.cpp:6-20 writes elements[0..3] from _11,_21,_31,_41 -
  // that is COLUMN one of its row-vector Matrix - then columns two and three.
  // So the packing is a transpose that drops the fourth column, which is
  // always (0,0,0,1) for an affine transform. It is the usual bone-matrix
  // packing: three float4 registers instead of four.
  //
  // Carbon's row-major memory order and gl-matrix's column-major memory order
  // coincide (see the carbon-math-conventions skill), so Carbon's _rc reads as
  // gl-matrix index (r-1)*4 + (c-1), and the mapping below is exactly
  // Carbon's with that substitution. It is its own inverse.

  /**
   * Packs a transform into the twelve floats, writing into `out`. The static
   * helper and optional output buffer adapt the native Matrix constructor.
   */
  @blue.method
  @meta.adapted
  static fromMat4(matrix, out = new Float32Array(12))
  {
    return mat4.getAffineCarbon(out, matrix);
  }

  /**
   * Unpacks twelve floats back into a transform, restoring the fourth column
   * Carbon reconstructs as (0, 0, 0, 1); writes into `out`. The static helper
   * and optional output buffer adapt the native Matrix conversion operator.
   */
  @blue.method
  @meta.adapted
  static toMat4(elements, out = mat4.create())
  {
    return mat4.fromAffineCarbon(out, elements);
  }

  /** Packs a transform into this record's elements. */
  SetFromMat4(matrix)
  {
    Float4x3.fromMat4(matrix, this.elements);
    return this;
  }

  /** This record's elements unpacked into a transform, written into `out`. */
  GetMat4(out = mat4.create())
  {
    return Float4x3.toMat4(this.elements, out);
  }

}

