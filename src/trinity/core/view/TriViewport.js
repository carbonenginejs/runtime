// Source: trinity/trinity/TriViewport.h
// Source: trinity/trinity/TriViewport_Blue.cpp
import { carbon, impl, edit, type } from "#schema";


/**
 * A screen viewport rectangle in pixels together with its minimum and maximum
 * depth. Native IRoot contributes no JavaScript storage or lifecycle services;
 * the native query table exposes only this concrete class.
 */
@type.define({
  className: "TriViewport",
  family: "trinityCore"
})
export class TriViewport
{
  /** Horizontal raster origin; negative window coordinates are valid. */
  @edit.readwrite
  @edit.persist
  @type.int32
  x = 0;

  /** Vertical raster origin; negative window coordinates are valid. */
  @edit.readwrite
  @edit.persist
  @type.int32
  y = 0;

  /** Raster width in pixels. */
  @edit.readwrite
  @edit.persist
  @type.int32
  width = 1;

  /** Raster height in pixels. */
  @edit.readwrite
  @edit.persist
  @type.int32
  height = 1;

  /** Minimum viewport depth. */
  @edit.readwrite
  @edit.persist
  @type.float32
  minZ = 0;

  /** Maximum viewport depth. */
  @edit.readwrite
  @edit.persist
  @type.float32
  maxZ = 1;

  /**
   * Python-style constructor hook; assigns origin, size and depth range,
   * defaulting to a 1x1 viewport over the full zero-to-one depth range.
   * JavaScript default arguments replace the native optional Python wrapper;
   * direct field assignments preserve the existing JavaScript number adapter.
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

carbon.interfaceTable({ interfaces: [ TriViewport ], chainTo: null })(TriViewport);
