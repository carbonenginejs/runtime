// Source: trinity/trinity/TriViewport.h
// Source: trinity/trinity/TriViewport_Blue.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * A screen viewport rectangle in pixels together with its minimum and maximum
 * depth.
 */
@type.define({
  className: "TriViewport",
  family: "trinityCore"
})
export class TriViewport extends CjsModel
{
  @io.persist
  @type.int32
  x = 0;

  @io.persist
  @type.int32
  y = 0;

  @io.persist
  @type.int32
  width = 1;

  @io.persist
  @type.int32
  height = 1;

  @io.persist
  @type.float32
  minZ = 0;

  @io.persist
  @type.float32
  maxZ = 1;

  /**
   * Python-style constructor hook; assigns origin, size and depth range,
   * defaulting to a 1x1 viewport over the full zero-to-one depth range.
   */
  @carbon.method
  @impl.adapted
  __init__(x = 0, y = 0, width = 1, height = 1, minZ = 0, maxZ = 1)
  {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.minZ = minZ;
    this.maxZ = maxZ;
  }

  /** Pixel width divided by pixel height; a zero height is not guarded against. */
  @carbon.method
  @impl.implemented
  GetAspectRatio()
  {
    return this.width / this.height;
  }
}

/**
 * Maps a clip-space vector into viewport screen space in place, matching
 * Carbon's inline Vec3TransformByViewport.
 */
export function Vec3TransformByViewport(vec, viewport)
{
  vec[0] = viewport.x + (1 + vec[0]) * 0.5 * viewport.width;
  vec[1] = viewport.y + (1 - vec[1]) * 0.5 * viewport.height;
  vec[2] = viewport.minZ + vec[2] * (viewport.maxZ - viewport.minZ);
  return vec;
}
