import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';

let _initStatic, _initProto, _initClass, _init_elements, _init_extra_elements;

/** A transform packed into twelve floats, dropping the constant fourth column. */
let _Float4x;
class Float4x3 extends CjsModel {
  static {
    ({
      e: [_init_elements, _init_extra_elements, _initProto, _initStatic],
      c: [_Float4x, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Float4x3",
      family: "utilities"
    })], [[[type, type.float32], 16, "elements"], [[carbon, carbon.method, impl, impl.implemented], 26, "fromMat4"], [[carbon, carbon.method, impl, impl.implemented], 26, "toMat4"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetFromMat4"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMat4"]], 0, void 0, CjsModel));
    _initStatic(this);
  }
  constructor(...args) {
    super(...args);
    _init_extra_elements(this);
  }
  /** elements (float[12]) */
  elements = (_initProto(this), _init_elements(this, new Float32Array(12)));

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
  static fromMat4(matrix, out = new Float32Array(12)) {
    for (let column = 0; column < 3; column++) {
      for (let row = 0; row < 4; row++) {
        out[column * 4 + row] = matrix[row * 4 + column];
      }
    }
    return out;
  }

  /**
   * Unpacks twelve floats back into a transform, restoring the fourth column
   * Carbon reconstructs as (0, 0, 0, 1); writes into `out`.
   */
  static toMat4(elements, out = mat4.create()) {
    for (let column = 0; column < 3; column++) {
      for (let row = 0; row < 4; row++) {
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
  SetFromMat4(matrix) {
    _Float4x.fromMat4(matrix, this.elements);
    return this;
  }

  /** This record's elements unpacked into a transform, written into `out`. */
  GetMat4(out = mat4.create()) {
    return _Float4x.toMat4(this.elements, out);
  }
  static {
    _initClass();
  }
}

export { _Float4x as Float4x3 };
//# sourceMappingURL=Float4x3.js.map
