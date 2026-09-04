// Source: trinity/trinityal/Tr2HalHelperStructures.h
// Source: trinity/trinityal/Tr2HalHelperStructures.cpp
//
// The small value types the abstraction layer passes around: a multisample
// description, and the region of a texture that a map, an update or a copy
// applies to.
//
// `Tr2TextureSubresource` LOOKS like a plain rectangle and is not. Its default
// is "all of it", spelled as an all-ones box rather than as a flag, and
// `HasBox` is what distinguishes "the caller named a region" from "the caller
// named the whole texture". Half the validation in the texture stub turns on
// that distinction, so it is transcribed here rather than simplified into a
// nullable box.
//
// TWO LANGUAGE DIFFERENCES. Carbon's three constructor overloads become the
// default constructor plus two named factories, and `operator==` becomes
// `Equals`.
//
// Carbon's `AdvanceMip` is NOT ported: nothing in this runtime walks a copy
// down a mip chain yet, and its depth branch shrinks the vertical box rather
// than the depth one, which is a bug worth reading again before relying on.

import { TextureType } from "../../../global/consts/renderContext/index.js";


/** Carbon's "not set" for every box coordinate: `0xffffffff`. */
const UNSET = 0xffffffff;


/**
 * A multisample description.
 */
export class Tr2MsaaDesc
{
  /** Samples per pixel; never below one. */
  samples = 1;

  /** Backend-defined quality level. */
  quality = 0;

  /**
   * @param {number} [samples] Samples per pixel.
   * @param {number} [quality] Quality level.
   */
  constructor(samples = 1, quality = 0)
  {
    this.samples = Math.max(samples, 1);
    this.quality = quality;
  }

  /**
   * Whether two descriptions match.
   *
   * Carbon clamps both sample counts to at least one before comparing, so a
   * zero and a one are the same description.
   *
   * @param {Tr2MsaaDesc} other The description to compare with.
   * @returns {boolean} True when they match.
   */
  Equals(other)
  {
    return Math.max(this.samples, 1) === Math.max(other.samples, 1) && this.quality === other.quality;
  }
}


/**
 * A box within a texture, in pixels.
 */
export class Tr2TextureCoordBox
{
  /** @type {number} */
  left = UNSET;

  /** @type {number} */
  top = UNSET;

  /** @type {number} */
  front = UNSET;

  /** @type {number} */
  right = UNSET;

  /** @type {number} */
  bottom = UNSET;

  /** @type {number} */
  back = UNSET;

  /**
   * Width of the box.
   *
   * @returns {number} Right minus left.
   */
  GetWidth()
  {
    return this.right - this.left;
  }

  /**
   * Height of the box.
   *
   * @returns {number} Bottom minus top.
   */
  GetHeight()
  {
    return this.bottom - this.top;
  }

  /**
   * Depth of the box.
   *
   * @returns {number} Back minus front.
   */
  GetDepth()
  {
    return this.back - this.front;
  }

  /**
   * Whether two boxes cover the same region.
   *
   * @param {Tr2TextureCoordBox} other The box to compare with.
   * @returns {boolean} True when every coordinate matches.
   */
  Equals(other)
  {
    return this.left === other.left &&
      this.top === other.top &&
      this.front === other.front &&
      this.right === other.right &&
      this.bottom === other.bottom &&
      this.back === other.back;
  }
}


/**
 * A range of faces, mip levels and pixels within a texture.
 *
 * The default is the whole resource. `ForMipLevel` and `ForFace` are Carbon's
 * other two constructors.
 */
export class Tr2TextureSubresource
{
  /** First slice. */
  m_startFace = 0;

  /** One past the last slice. */
  m_endFace = UNSET;

  /** First mip level. */
  m_startMipLevel = 0;

  /** One past the last mip level. */
  m_endMipLevel = UNSET;

  /** @type {Tr2TextureCoordBox} */
  m_box = new Tr2TextureCoordBox();

  /**
   * A single mip level of the first slice.
   *
   * @param {number} mipLevel The mip level.
   * @returns {Tr2TextureSubresource} The region.
   */
  static ForMipLevel(mipLevel)
  {
    const region = new Tr2TextureSubresource();

    region.m_startFace = 0;
    region.m_endFace = 1;
    region.m_startMipLevel = mipLevel;
    region.m_endMipLevel = mipLevel + 1;

    return region;
  }

  /**
   * A single mip level of a single slice.
   *
   * @param {number} face The slice or cube face.
   * @param {number} mipLevel The mip level.
   * @returns {Tr2TextureSubresource} The region.
   */
  static ForFace(face, mipLevel)
  {
    const region = Tr2TextureSubresource.ForMipLevel(mipLevel);

    region.m_startFace = face;
    region.m_endFace = face + 1;

    return region;
  }

  /**
   * Width of the box.
   *
   * @returns {number} Width in pixels.
   */
  GetWidth()
  {
    return this.m_box.GetWidth();
  }

  /**
   * Height of the box.
   *
   * @returns {number} Height in pixels.
   */
  GetHeight()
  {
    return this.m_box.GetHeight();
  }

  /**
   * Depth of the box.
   *
   * @returns {number} Depth in slices.
   */
  GetDepth()
  {
    return this.m_box.GetDepth();
  }

  /**
   * Mip levels in the range.
   *
   * @returns {number} Level count.
   */
  GetMipCount()
  {
    return this.m_endMipLevel - this.m_startMipLevel;
  }

  /**
   * Slices in the range.
   *
   * @returns {number} Face count.
   */
  GetFaceCount()
  {
    return this.m_endFace - this.m_startFace;
  }

  /**
   * Whether the caller named a box at all.
   *
   * An untouched box is all ones, which means "the whole mip". This is the
   * test the rest of the type turns on.
   *
   * @returns {boolean} True when any coordinate was set.
   */
  HasBox()
  {
    const box = this.m_box;

    return box.left !== UNSET ||
      box.top !== UNSET ||
      box.front !== UNSET ||
      box.right !== UNSET ||
      box.bottom !== UNSET ||
      box.back !== UNSET;
  }

  /**
   * Whether the range names exactly one face and one mip level.
   *
   * @returns {boolean} True for a single subresource.
   */
  IsSingleSubresource()
  {
    return this.m_endFace === this.m_startFace + 1 && this.m_endMipLevel === this.m_startMipLevel + 1;
  }

  /**
   * Sets the box from six coordinates: left, top, front, right, bottom, back.
   *
   * @param {number[]} ltfrbb The six coordinates, in that order.
   * @returns {Tr2TextureSubresource} This region, for chaining.
   */
  SetBox(ltfrbb)
  {
    const box = this.m_box;

    box.left = ltfrbb[0];
    box.top = ltfrbb[1];
    box.front = ltfrbb[2];
    box.right = ltfrbb[3];
    box.bottom = ltfrbb[4];
    box.back = ltfrbb[5];

    return this;
  }

  /**
   * Sets the box from a rectangle, spanning one slice in depth.
   *
   * @param {number} left Left edge.
   * @param {number} top Top edge.
   * @param {number} right One past the right edge.
   * @param {number} bottom One past the bottom edge.
   * @returns {Tr2TextureSubresource} This region, for chaining.
   */
  SetRect(left, top, right, bottom)
  {
    return this.SetBox([ left, top, 0, right, bottom, 1 ]);
  }

  /**
   * Clamps the range to a texture, filling in a box if there was none.
   *
   * @param {import("./Tr2BitmapDimensions.js").Tr2BitmapDimensions} texture The texture to clamp against.
   */
  ClampToTexture(texture)
  {
    const arraySize = Math.max(texture.GetArraySize(), 1);

    this.m_startFace = Math.min(this.m_startFace, arraySize - 1);
    this.m_endFace = Math.min(this.m_endFace, arraySize);

    this.m_startMipLevel = Math.min(this.m_startMipLevel, texture.GetTrueMipCount() - 1);
    this.m_endMipLevel = Math.min(this.m_endMipLevel, texture.GetTrueMipCount());

    const mipWidth = texture.GetMipWidth(this.m_startMipLevel);
    const mipHeight = texture.GetMipHeight(this.m_startMipLevel);
    const mipDepth = Math.max(texture.GetDepth() >> this.m_startMipLevel, 1);
    const box = this.m_box;

    if (this.HasBox())
    {
      box.left = Math.min(box.left, mipWidth - 1);
      box.right = Math.min(box.right, mipWidth);
      box.top = Math.min(box.top, mipHeight - 1);
      box.bottom = Math.min(box.bottom, mipHeight);

      if (texture.GetType() === TextureType.TEX_TYPE_3D)
      {
        box.front = Math.min(box.front, mipDepth - 1);
        box.back = Math.min(box.back, mipDepth);
      }
      else
      {
        box.front = 0;
        box.back = 1;
      }
    }
    else
    {
      box.left = 0;
      box.top = 0;
      box.front = 0;
      box.right = mipWidth;
      box.bottom = mipHeight;
      box.back = mipDepth;
    }
  }

  /**
   * Whether the range covers the entire texture.
   *
   * @param {import("./Tr2BitmapDimensions.js").Tr2BitmapDimensions} texture The texture to check against.
   * @returns {boolean} True when nothing is left out.
   */
  IsSubresourceFull(texture)
  {
    if (this.m_startFace > 0 || this.m_endFace < texture.GetArraySize()) return false;

    if (this.m_startMipLevel > 0) return false;

    if (this.m_endMipLevel < texture.GetTrueMipCount()) return false;

    if (this.HasBox())
    {
      const box = this.m_box;

      if (box.left > 0 || box.top > 0 || box.front > 0) return false;

      if (box.right < texture.GetWidth() || box.bottom < texture.GetHeight() || box.back < texture.GetDepth())
      {
        return false;
      }
    }

    return true;
  }

  /**
   * Whether the range fits inside a texture.
   *
   * @param {import("./Tr2BitmapDimensions.js").Tr2BitmapDimensions} bitmap The texture to check against.
   * @returns {boolean} True when it fits.
   */
  IsValidForBitmap(bitmap)
  {
    if (this.m_endFace > bitmap.GetArraySize()) return false;

    if (this.m_endMipLevel > bitmap.GetTrueMipCount()) return false;

    if (this.HasBox())
    {
      const box = this.m_box;

      if (box.right > bitmap.GetMipWidth(this.m_startMipLevel)) return false;

      if (box.bottom > bitmap.GetMipHeight(this.m_startMipLevel)) return false;

      if (bitmap.GetType() === TextureType.TEX_TYPE_3D && box.back > bitmap.GetMipDepth(this.m_startMipLevel)) return false;
    }

    return true;
  }

  /**
   * Whether the range is self-consistent: non-empty in every dimension.
   *
   * @returns {boolean} True when valid.
   */
  IsValid()
  {
    if (this.HasBox())
    {
      const box = this.m_box;

      if (box.left >= box.right || box.top >= box.bottom || box.front >= box.back) return false;
    }

    return this.m_startFace < this.m_endFace && this.m_startMipLevel < this.m_endMipLevel;
  }

  /**
   * Whether two ranges name the same region.
   *
   * @param {Tr2TextureSubresource} other The region to compare with.
   * @returns {boolean} True when they match.
   */
  Equals(other)
  {
    return this.m_startFace === other.m_startFace &&
      this.m_endFace === other.m_endFace &&
      this.m_startMipLevel === other.m_startMipLevel &&
      this.m_endMipLevel === other.m_endMipLevel &&
      this.m_box.Equals(other.m_box);
  }
}


/**
 * Crops a source and destination region to their textures and to each other.
 *
 * Carbon runs the clamp TWICE on purpose: the first pass fits each region to
 * its own texture, the shrink then makes them the same size, and the second
 * pass catches a box the shrink pushed back out of range.
 *
 * @param {Tr2TextureSubresource} sourceSR Source region; mutated in place.
 * @param {import("./Tr2BitmapDimensions.js").Tr2BitmapDimensions} sourceBD Source texture.
 * @param {Tr2TextureSubresource} destSR Destination region; mutated in place.
 * @param {import("./Tr2BitmapDimensions.js").Tr2BitmapDimensions} destBD Destination texture.
 * @returns {boolean} True when a copy would make sense.
 */
export function Crop(sourceSR, sourceBD, destSR, destBD)
{
  if (destSR.GetFaceCount() !== sourceSR.GetFaceCount()) return false;

  if (sourceSR.HasBox() && destSR.HasBox() && destSR.GetDepth() !== sourceSR.GetDepth()) return false;

  sourceSR.ClampToTexture(sourceBD);
  destSR.ClampToTexture(destBD);

  if (sourceSR.GetWidth() < destSR.GetWidth())
  {
    destSR.m_box.right = destSR.m_box.left + sourceSR.GetWidth();
  }
  else
  {
    sourceSR.m_box.right = sourceSR.m_box.left + destSR.GetWidth();
  }

  if (sourceSR.GetHeight() < destSR.GetHeight())
  {
    destSR.m_box.bottom = destSR.m_box.top + sourceSR.GetHeight();
  }
  else
  {
    sourceSR.m_box.bottom = sourceSR.m_box.top + destSR.GetHeight();
  }

  sourceSR.ClampToTexture(sourceBD);
  destSR.ClampToTexture(destBD);

  return sourceSR.IsValid() && destSR.IsValid();
}
