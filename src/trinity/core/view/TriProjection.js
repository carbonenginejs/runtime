import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/TriProjection.h
// Source: trinity/trinity/TriProjection.cpp
// Source: trinity/trinity/TriProjection_Blue.cpp
import { mat4 } from "#math/mat4";
import { meta, type, blue } from "#schema";
import { Tr2Renderer } from "../Tr2Renderer.js";

/** SetProjection__RenderContext's viewport adjustment, rebuilt on each call. */
const VIEWPORT_ADJUSTMENT = mat4.create();


/**
 * The camera projection: the selected projection mode with its parameters, plus
 * the 4x4 matrix built from them.
 */
@be.define("TriProjection")
@blue.inherit(IRoot)
export class TriProjection extends IRoot
{
  static FOV = 1;

  static OFF_CENTER = 2;

  static ORTHO = 3;

  static CUSTOM = 4;

  @type.int8
  projectionType = 0;

  @type.float32
  fov = 0;

  @type.float32
  aspect = 0;

  @type.float32
  left = 0;

  @type.float32
  right = 0;

  @type.float32
  bottom = 0;

  @type.float32
  top = 0;

  @type.float32
  zn = 0;

  @type.float32
  zf = 0;

  @type.mat4
  customTransform = mat4.create();

  @blue.read
  @type.mat4
  transform = mat4.create();

  /**
   * Selects the field-of-view perspective mode, storing fov (in radians), aspect
   * and the near/far planes, and rebuilds the transform.
   */
  @be.mapMethodAndWrap()
  @meta.implemented
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
  @be.mapMethodAndWrap()
  @meta.implemented
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
  @be.mapMethodAndWrap()
  @meta.implemented
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
  @be.mapMethodAndWrap()
  @meta.adapted
  CustomProjection(value)
  {
    this.projectionType = TriProjection.CUSTOM;
    mat4.copy(this.customTransform, value);
    mat4.copy(this.transform, value);
  }

  /**
   * Carbon SetProjection( renderContext ) (TriProjection.cpp:71-109): sets this
   * projection on the renderer, scaled and offset when the authored viewport
   * extends past the render target and was clipped to the device viewport.
   * Carbon's `_11 _22 _31 _32` are indices 0, 5, 8 and 9.
   *
   * Adapted: our state manager has no viewport until a render target or a
   * viewport is set, where Carbon's always has one; with none, the adjustment
   * stays the identity.
   *
   * @param {Tr2RenderContext} renderContext The context whose viewport is read.
   * @returns {void}
   */

  @meta.adapted
  SetProjection__RenderContext(renderContext)
  {
    const adjustment = mat4.identity(VIEWPORT_ADJUSTMENT);
    const esm = renderContext.GetEffectStateManager();
    const viewport = esm.GetViewport();
    const deviceViewport = esm.GetDeviceViewport();

    // In case we shrunk the viewport we need to scale and/or offset the
    // projection matrix.
    if (viewport && deviceViewport)
    {
      adjustment[0] = viewport.width / deviceViewport.width;
      adjustment[5] = viewport.height / deviceViewport.height;
      adjustment[8] = (viewport.width - deviceViewport.width) / deviceViewport.width;
      adjustment[9] = (viewport.height - deviceViewport.height) / deviceViewport.height;
      if (viewport.x < 0)
      {
        adjustment[8] *= -1;
      }

      if (viewport.y + viewport.height > Math.trunc(esm.renderTargetHeight))
      {
        adjustment[9] *= -1;
      }
    }

    switch (this.projectionType)
    {
      case TriProjection.FOV:
        Tr2Renderer.SetPerspectiveProjection__FovAspect(this.fov, this.zn, this.zf, this.aspect, adjustment);
        break;
      case TriProjection.OFF_CENTER:
        Tr2Renderer.SetPerspectiveProjection__LeftRightBottomTop(this.left, this.right, this.bottom, this.top, this.zn, this.zf, adjustment);
        break;
      case TriProjection.ORTHO:
        Tr2Renderer.SetOrthoProjection__WidthHeight(this.left, this.top, this.zn, this.zf, adjustment);
        break;
      case TriProjection.CUSTOM:
        Tr2Renderer.SetProjectionTransform(this.customTransform, adjustment);
        break;
    }
  }

  /**
   * Carbon SetProjection() (TriProjection.cpp:111-128): sets this projection
   * on the renderer with no viewport adjustment.
   *
   * @returns {void}
   */

  @meta.implemented
  SetProjection()
  {
    switch (this.projectionType)
    {
      case TriProjection.FOV:
        Tr2Renderer.SetPerspectiveProjection__FovAspect(this.fov, this.zn, this.zf, this.aspect);
        break;
      case TriProjection.OFF_CENTER:
        Tr2Renderer.SetPerspectiveProjection__LeftRightBottomTop(this.left, this.right, this.bottom, this.top, this.zn, this.zf);
        break;
      case TriProjection.ORTHO:
        Tr2Renderer.SetOrthoProjection__WidthHeight(this.left, this.top, this.zn, this.zf);
        break;
      case TriProjection.CUSTOM:
        Tr2Renderer.SetProjectionTransform(this.customTransform);
        break;
    }
  }

  /** The active mode, one of the FOV, OFF_CENTER, ORTHO or CUSTOM constants. */
  @be.mapMethodAndWrap()
  @meta.implemented
  GetProjectionType()
  {
    return this.projectionType;
  }

  /**
   * Rebuilds the projection matrix from the stored parameters, without any view-dependent adjustment; an unset projection type yields identity.
   * @param {mat4} [out] Caller-owned destination; a new matrix is allocated when omitted.
   * @returns {mat4} The destination matrix.
   */

  @meta.adapted
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

  @meta.adapted
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
