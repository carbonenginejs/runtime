// Source: E:\carbonengine\trinity\trinity\TriProjection.h
// Source: E:\carbonengine\trinity\trinity\TriProjection.cpp
// Source: E:\carbonengine\trinity\trinity\TriProjection_Blue.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


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

  @carbon.method
  @impl.adapted
  CustomProjection(value)
  {
    this.projectionType = TriProjection.CUSTOM;
    mat4.copy(this.customTransform, value);
    mat4.copy(this.transform, value);
  }

  @carbon.method
  @impl.implemented
  GetProjectionType()
  {
    return this.projectionType;
  }

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

  @carbon.method
  @impl.adapted
  GetTransform(out = mat4.create())
  {
    this.GetMatrixWithoutViewAdjustment(this.transform);
    return mat4.copy(out, this.transform);
  }

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
