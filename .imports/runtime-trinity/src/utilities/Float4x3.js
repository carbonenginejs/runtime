// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Utilities/MatrixUtils.h:9-17 (the struct)
//   trinity/trinity/Utilities/MatrixUtils.cpp:6-26 (both conversions)
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";

/** A transform packed into twelve floats, dropping the constant fourth column. */
@type.define({ className: "Float4x3", family: "utilities" })
export class Float4x3 extends CjsModel
{

  /** elements (float[12]) */
  @type.float32
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
   * Packs a transform into the twelve floats, writing into `out`.
   */
  @carbon.method
  @impl.implemented
  static fromMat4(matrix, out = new Float32Array(12))
  {
    for (let column = 0; column < 3; column++)
    {
      for (let row = 0; row < 4; row++)
      {
        out[column * 4 + row] = matrix[row * 4 + column];
      }
    }
    return out;
  }

  /**
   * Unpacks twelve floats back into a transform, restoring the fourth column
   * Carbon reconstructs as (0, 0, 0, 1); writes into `out`.
   */
  @carbon.method
  @impl.implemented
  static toMat4(elements, out = mat4.create())
  {
    for (let column = 0; column < 3; column++)
    {
      for (let row = 0; row < 4; row++)
      {
        out[row * 4 + column] = elements[column * 4 + row];
      }
    }

    out[3] = 0;
    out[7] = 0;
    out[11] = 0;
    out[15] = 1;
    return out;
  }

  /** Packs a transform into this record's elements. */
  @carbon.method
  @impl.implemented
  SetFromMat4(matrix)
  {
    Float4x3.fromMat4(matrix, this.elements);
    return this;
  }

  /** This record's elements unpacked into a transform, written into `out`. */
  @carbon.method
  @impl.implemented
  GetMat4(out = mat4.create())
  {
    return Float4x3.toMat4(this.elements, out);
  }

}
