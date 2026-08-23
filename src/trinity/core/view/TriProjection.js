// Source: trinity/trinity/TriProjection.h
// Source: trinity/trinity/TriProjection.cpp
// Source: trinity/trinity/TriProjection_Blue.cpp
import { mat4 } from "#math/mat4";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * The camera projection: the selected projection mode with its parameters, plus
 * the 4x4 matrix built from them.
 */
@type.define({
  className: "TriProjection",
  family: "trinityCore"
})
export class TriProjection extends CjsModel
{
  static FOV = 1;

  static OFF_CENTER = 2;

  static ORTHO = 3;

  static CUSTOM = 4;

  projectionType = 0;

  fov = 0;

  aspect = 0;

  left = 0;

  right = 0;

  bottom = 0;

  top = 0;

  zn = 0;

  zf = 0;

  customTransform = mat4.create();

  @io.read
  @type.mat4
  transform = mat4.create();

  /**
   * Selects the field-of-view perspective mode, storing fov (in radians), aspect
   * and the near/far planes, and rebuilds the transform.
   */
  @carbon.method
  @impl.implemented
  PerspectiveFov(fov, aspect, zn, zf)
  {
    this.projectionType = TriProjection.FOV;
    this.fov = fov;
    this.aspect = aspect;
    this.zn = zn;
    this.zf = zf;
    TriProjection.#perspectiveFov(this.transform, fov, aspect, zn, zf);
  }

  /**
   * Selects the off-centre perspective mode from explicit frustum edges measured
   * at the near plane, and rebuilds the transform.
   */
  @carbon.method
  @impl.implemented
  PerspectiveOffCenter(left, right, bottom, top, zn, zf)
  {
    this.projectionType = TriProjection.OFF_CENTER;
    this.left = left;
    this.right = right;
    this.bottom = bottom;
    this.top = top;
    this.zn = zn;
    this.zf = zf;
    TriProjection.#perspectiveOffCenter(this.transform, left, right, bottom, top, zn, zf);
  }

  /**
   * Selects the orthographic mode; width and height are stored in the left and
   * top slots and front/back in the near and far slots.
   */
  @carbon.method
  @impl.implemented
  PerspectiveOrthographic(width, height, front, back)
  {
    this.projectionType = TriProjection.ORTHO;
    this.left = width;
    this.top = height;
    this.zn = front;
    this.zf = back;
    TriProjection.#ortho(this.transform, width, height, front, back);
  }

  /**
   * Adopts a caller-supplied matrix verbatim as the projection, copying it
   * rather than retaining the caller's buffer.
   */
  @carbon.method
  @impl.adapted
  CustomProjection(value)
  {
    this.projectionType = TriProjection.CUSTOM;
    mat4.copy(this.customTransform, value);
    mat4.copy(this.transform, value);
  }

  /** The active mode, one of the FOV, OFF_CENTER, ORTHO or CUSTOM constants. */
  @carbon.method
  @impl.implemented
  GetProjectionType()
  {
    return this.projectionType;
  }

  /**
   * Rebuilds the projection matrix from the stored parameters, without any view-dependent adjustment; an unset projection type yields identity.
   * @param {mat4} [out] Caller-owned destination; a new matrix is allocated when omitted.
   * @returns {mat4} The destination matrix.
   */
  @carbon.method
  @impl.adapted
  GetMatrixWithoutViewAdjustment(out = mat4.create())
  {
    switch (this.projectionType)
    {
      case TriProjection.FOV:
        return TriProjection.#perspectiveFov(out, this.fov, this.aspect, this.zn, this.zf);
      case TriProjection.OFF_CENTER:
        return TriProjection.#perspectiveOffCenter(out, this.left, this.right, this.bottom, this.top, this.zn, this.zf);
      case TriProjection.ORTHO:
        return TriProjection.#ortho(out, this.left, this.top, this.zn, this.zf);
      case TriProjection.CUSTOM:
        return mat4.copy(out, this.customTransform);
      default:
        return mat4.identity(out);
    }
  }

  /**
   * Rebuilds the cached transform field from the current parameters, then copies
   * it into out (a fresh matrix when omitted) and returns it.
   */
  @carbon.method
  @impl.adapted
  GetTransform(out = mat4.create())
  {
    this.GetMatrixWithoutViewAdjustment(this.transform);
    return mat4.copy(out, this.transform);
  }

  /**
   * Builds the right-handed field-of-view perspective matrix with a zero-to-one
   * depth range (w takes -z).
   */
  static #perspectiveFov(out, fov, aspect, zn, zf)
  {
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

  /**
   * Builds the right-handed off-centre perspective matrix from the near-plane
   * frustum edges; the vertical terms follow Carbon's top-above-bottom
   * convention and so carry the opposite sign to the usual form.
   */
  static #perspectiveOffCenter(out, left, right, bottom, top, zn, zf)
  {
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

  /**
   * Builds the orthographic matrix from width, height and the near/far planes,
   * with a zero-to-one depth range.
   */
  static #ortho(out, width, height, zn, zf)
  {
    mat4.identity(out);
    out[0] = 2 / width;
    out[5] = 2 / height;
    out[10] = 1 / (zn - zf);
    out[14] = zn / (zn - zf);
    return out;
  }
}
