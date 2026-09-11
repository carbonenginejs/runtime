// Source: trinity/trinity/Tr2GpuResourcePool.h
// Source: trinity/trinity/Tr2GpuResourcePool.cpp
//
// Where a render pass gets a scratch texture or buffer, and how one is kept
// alive only as long as something holds it.
//
// THIS IS THE CLASS FOUR INVENTED ONES WERE STANDING IN FOR. Carbon's
// `Tr2ShadowMap::PrepareShadowRendering( gpuResourcePool, renderContext )` and
// the whole `EveSpaceScene` volumetrics family take a pool and do their own
// work. Ours had the methods but bounced them to an engine-supplied executor,
// because there was no pool to hand them. So an interface was invented per
// subsystem rather than porting the one class they all needed.
//
// TWO LIFETIMES, and the distinction is the whole design. A TEMP resource is
// recycled as soon as nothing holds it and it has not been touched for a few
// frames; a PERSISTENT one is initialized once and kept. Asking for a temp
// texture with the same shape twice in a frame therefore gets the same texture
// only if the first handle has been released - which is what makes a pass able
// to say "give me a working surface" without owning one.
//
// THE HANDLE IS THE LIFETIME. Carbon's `GpuResourceHandle` counts locks on copy
// and release, and a record with a live lock is never recycled. JavaScript has
// no destructor, so `Release()` is explicit here - see the note on the class.
//
// NESTING IS CARBON'S: a pool may have an OUTER pool, and a lookup that misses
// walks outward. That is how a scene-local pool shares the global one's
// resources without owning them.



/**
 * A width and height, with Carbon's scaling and comparison.
 */
export class TextureSize2D
{
  /** Width in pixels. */
  width = 0;

  /** Height in pixels. */
  height = 0;

  /**
   * @param {number|object} [widthOrDimensions] A width, or a `Tr2BitmapDimensions`.
   * @param {number} [height] The height, when a width was given.
   */
  constructor(widthOrDimensions = 0, height = 0)
  {
    if (widthOrDimensions && typeof widthOrDimensions === "object")
    {
      this.width = widthOrDimensions.GetWidth();
      this.height = widthOrDimensions.GetHeight();

      return;
    }

    this.width = widthOrDimensions;
    this.height = height;
  }

  /**
   * Whether two sizes match.
   *
   * @param {TextureSize2D} other The size to compare with.
   * @returns {boolean} True when they match.
   */
  Equals(other)
  {
    return !!other && this.width === other.width && this.height === other.height;
  }

  /**
   * This size scaled, never below one pixel in either direction.
   *
   * Carbon clamps to one (`h:TextureSize2D::operator*`), because a half-size
   * chain reaches zero before it reaches one and a zero-sized target is not a
   * target.
   *
   * @param {number} scale The factor.
   * @returns {TextureSize2D} The scaled size.
   */
  Scaled(scale)
  {
    return new TextureSize2D(
      Math.max(1, Math.trunc(this.width * scale)),
      Math.max(1, Math.trunc(this.height * scale))
    );
  }
}
