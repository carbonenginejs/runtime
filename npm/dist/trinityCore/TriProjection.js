import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_transform, _init_extra_transform;

/**
 * The camera projection: the selected projection mode with its parameters, plus
 * the 4x4 matrix built from them.
 */
let _TriProjection;
new class extends _identity {
  static [class TriProjection extends CjsModel {
    static {
      ({
        e: [_init_transform, _init_extra_transform, _initProto],
        c: [_TriProjection, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriProjection",
        family: "trinityCore"
      })], [[[io, io.read, type, type.mat4], 16, "transform"], [[carbon, carbon.method, impl, impl.implemented], 18, "PerspectiveFov"], [[carbon, carbon.method, impl, impl.implemented], 18, "PerspectiveOffCenter"], [[carbon, carbon.method, impl, impl.implemented], 18, "PerspectiveOrthographic"], [[carbon, carbon.method, impl, impl.adapted], 18, "CustomProjection"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetProjectionType"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMatrixWithoutViewAdjustment"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetTransform"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_transform(this);
    }
    projectionType = (_initProto(this), 0);
    fov = 0;
    aspect = 0;
    left = 0;
    right = 0;
    bottom = 0;
    top = 0;
    zn = 0;
    zf = 0;
    customTransform = mat4.create();
    transform = _init_transform(this, mat4.create());

    /**
     * Selects the field-of-view perspective mode, storing fov (in radians), aspect
     * and the near/far planes, and rebuilds the transform.
     */
    PerspectiveFov(fov, aspect, zn, zf) {
      this.projectionType = _TriProjection.FOV;
      this.fov = fov;
      this.aspect = aspect;
      this.zn = zn;
      this.zf = zf;
      _TriProjection.#perspectiveFov(this.transform, fov, aspect, zn, zf);
    }

    /**
     * Selects the off-centre perspective mode from explicit frustum edges measured
     * at the near plane, and rebuilds the transform.
     */
    PerspectiveOffCenter(left, right, bottom, top, zn, zf) {
      this.projectionType = _TriProjection.OFF_CENTER;
      this.left = left;
      this.right = right;
      this.bottom = bottom;
      this.top = top;
      this.zn = zn;
      this.zf = zf;
      _TriProjection.#perspectiveOffCenter(this.transform, left, right, bottom, top, zn, zf);
    }

    /**
     * Selects the orthographic mode; width and height are stored in the left and
     * top slots and front/back in the near and far slots.
     */
    PerspectiveOrthographic(width, height, front, back) {
      this.projectionType = _TriProjection.ORTHO;
      this.left = width;
      this.top = height;
      this.zn = front;
      this.zf = back;
      _TriProjection.#ortho(this.transform, width, height, front, back);
    }

    /**
     * Adopts a caller-supplied matrix verbatim as the projection, copying it
     * rather than retaining the caller's buffer.
     */
    CustomProjection(value) {
      this.projectionType = _TriProjection.CUSTOM;
      mat4.copy(this.customTransform, value);
      mat4.copy(this.transform, value);
    }

    /** The active mode, one of the FOV, OFF_CENTER, ORTHO or CUSTOM constants. */
    GetProjectionType() {
      return this.projectionType;
    }

    /**
     * Rebuilds the projection matrix from the stored parameters, without any view-dependent adjustment; an unset projection type yields identity.
     * @param {mat4} [out] Caller-owned destination; a new matrix is allocated when omitted.
     * @returns {mat4} The destination matrix.
     */
    GetMatrixWithoutViewAdjustment(out = mat4.create()) {
      switch (this.projectionType) {
        case _TriProjection.FOV:
          return _TriProjection.#perspectiveFov(out, this.fov, this.aspect, this.zn, this.zf);
        case _TriProjection.OFF_CENTER:
          return _TriProjection.#perspectiveOffCenter(out, this.left, this.right, this.bottom, this.top, this.zn, this.zf);
        case _TriProjection.ORTHO:
          return _TriProjection.#ortho(out, this.left, this.top, this.zn, this.zf);
        case _TriProjection.CUSTOM:
          return mat4.copy(out, this.customTransform);
        default:
          return mat4.identity(out);
      }
    }

    /**
     * Rebuilds the cached transform field from the current parameters, then copies
     * it into out (a fresh matrix when omitted) and returns it.
     */
    GetTransform(out = mat4.create()) {
      this.GetMatrixWithoutViewAdjustment(this.transform);
      return mat4.copy(out, this.transform);
    }

    /**
     * Builds the right-handed field-of-view perspective matrix with a zero-to-one
     * depth range (w takes -z).
     */

    /**
     * Builds the right-handed off-centre perspective matrix from the near-plane
     * frustum edges; the vertical terms follow Carbon's top-above-bottom
     * convention and so carry the opposite sign to the usual form.
     */

    /**
     * Builds the orthographic matrix from width, height and the near/far planes,
     * with a zero-to-one depth range.
     */
  }];
  FOV = 1;
  OFF_CENTER = 2;
  ORTHO = 3;
  CUSTOM = 4;
  #perspectiveFov(out, fov, aspect, zn, zf) {
    const yScale = 1 / Math.tan(fov * 0.5);
    const xScale = yScale / aspect;
    out.fill(0);
    out[0] = xScale;
    out[5] = yScale;
    out[10] = zf / (zn - zf);
    out[11] = -1;
    out[14] = zn * zf / (zn - zf);
    return out;
  }
  #perspectiveOffCenter(out, left, right, bottom, top, zn, zf) {
    out.fill(0);
    out[0] = 2 * zn / (right - left);
    out[5] = -2 * zn / (bottom - top);
    out[8] = 1 + 2 * left / (right - left);
    out[9] = -1 - 2 * top / (bottom - top);
    out[10] = zf / (zn - zf);
    out[11] = -1;
    out[14] = zn * zf / (zn - zf);
    return out;
  }
  #ortho(out, width, height, zn, zf) {
    mat4.identity(out);
    out[0] = 2 / width;
    out[5] = 2 / height;
    out[10] = 1 / (zn - zf);
    out[14] = zn / (zn - zf);
    return out;
  }
  constructor() {
    super(_TriProjection), _initClass();
  }
}();

export { _TriProjection as TriProjection };
//# sourceMappingURL=TriProjection.js.map
