// Source: trinity/trinityal/Tr2HalHelperStructures.h
import { CjsSchema, type, blue, meta } from "#schema";
// Source: trinity/trinityal/Tr2HalHelperStructures.cpp
//
// ONE FOLDER PER DONOR HEADER. Carbon declares six types in this header, and a
// C++ header is an include unit rather than a class container. Splitting them one
// per file keeps every class findable by its own name without inventing anything:
// the folder still names the donor, so each file has something to be diffed
// against. It also makes an unported sibling visible as a missing FILE, which is
// how two of these were found absent.

import { TextureType } from "../../global/consts/renderContext/index.js";
// Implicit while both lived in one file: Carbon's subresource HOLDS a coord box.
import { Tr2TextureCoordBox } from "./Tr2TextureCoordBox.js";

/** Carbon's "not set" for every box coordinate: `0xffffffff`. */
const UNSET = 0xffffffff;

/**
 * A range of faces, mip levels and pixels within a texture.
 *
 * The default is the whole resource (Carbon's default constructor,
 * Tr2HalHelperStructures.cpp:19-26). `create__MipLevel` and
 * `create__FaceMipLevel` are Carbon's other two constructors.
 */
export class Tr2TextureSubresource
{
  /** First slice. */
  startFace = 0;

  /** One past the last slice. */
  endFace = UNSET;

  /** First mip level. */
  startMipLevel = 0;

  /** One past the last mip level. */
  endMipLevel = UNSET;

  /**
   * Pixel box; every coordinate `0xffffffff` means "no box" (Carbon's
   * constructors, Tr2HalHelperStructures.cpp:24,33,47).
   * @type {Tr2TextureCoordBox}
   */
  box = Object.assign(new Tr2TextureCoordBox(), {
    left: UNSET,
    top: UNSET,
    front: UNSET,
    right: UNSET,
    bottom: UNSET,
    back: UNSET
  });

  /**
   * Carbon's `Tr2TextureSubresource( uint32_t mipLevel )`
   * (Tr2HalHelperStructures.cpp:28-35): a single mip level of the first slice,
   * with no box.
   *
   * @param {number} mipLevel The mip level.
   * @returns {Tr2TextureSubresource} The region.
   */
  static create__MipLevel(mipLevel)
  {
    const region = new Tr2TextureSubresource();

    region.startFace = 0;
    region.endFace = 1;
    region.startMipLevel = mipLevel;
    region.endMipLevel = mipLevel + 1;

    return region;
  }

  /**
   * Carbon's `Tr2TextureSubresource( uint32_t face, uint32_t mipLevel )`
   * (Tr2HalHelperStructures.cpp:42-49): a single mip level of a single slice,
   * with no box.
   *
   * @param {number} face The slice or cube face.
   * @param {number} mipLevel The mip level.
   * @returns {Tr2TextureSubresource} The region.
   */
  static create__FaceMipLevel(face, mipLevel)
  {
    const region = new Tr2TextureSubresource();

    region.startFace = face;
    region.endFace = face + 1;
    region.startMipLevel = mipLevel;
    region.endMipLevel = mipLevel + 1;

    return region;
  }

  /**
   * Width of the box.
   *
   * @returns {number} Width in pixels.
   */
  GetWidth()
  {
    return this.box.GetWidth();
  }

  /**
   * Height of the box.
   *
   * @returns {number} Height in pixels.
   */
  GetHeight()
  {
    return this.box.GetHeight();
  }

  /**
   * Depth of the box.
   *
   * @returns {number} Depth in slices.
   */
  GetDepth()
  {
    return this.box.GetDepth();
  }

  /**
   * Mip levels in the range.
   *
   * @returns {number} Level count.
   */
  GetMipCount()
  {
    return this.endMipLevel - this.startMipLevel;
  }

  /**
   * Slices in the range.
   *
   * @returns {number} Face count.
   */
  GetFaceCount()
  {
    return this.endFace - this.startFace;
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
    const box = this.box;

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
    return this.endFace === this.startFace + 1 && this.endMipLevel === this.startMipLevel + 1;
  }

  /**
   * Sets the box from six coordinates: left, top, front, right, bottom, back.
   *
   * @param {number[]} ltfrbb The six coordinates, in that order.
   * @returns {Tr2TextureSubresource} This region, for chaining.
   */
  SetBox(ltfrbb)
  {
    const box = this.box;

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
   * @param {import("#imageio").BitmapDimensions} texture The texture to clamp against.
   */
  ClampToTexture(texture)
  {
    const arraySize = Math.max(texture.GetArraySize(), 1);

    this.startFace = Math.min(this.startFace, arraySize - 1);
    this.endFace = Math.min(this.endFace, arraySize);

    this.startMipLevel = Math.min(this.startMipLevel, texture.GetTrueMipCount() - 1);
    this.endMipLevel = Math.min(this.endMipLevel, texture.GetTrueMipCount());

    const mipWidth = texture.GetMipWidth(this.startMipLevel);
    const mipHeight = texture.GetMipHeight(this.startMipLevel);
    const mipDepth = Math.max(texture.GetDepth() >> this.startMipLevel, 1);
    const box = this.box;

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
   * @param {import("#imageio").BitmapDimensions} texture The texture to check against.
   * @returns {boolean} True when nothing is left out.
   */
  IsSubresourceFull(texture)
  {
    if (this.startFace > 0 || this.endFace < texture.GetArraySize()) return false;

    if (this.startMipLevel > 0) return false;

    if (this.endMipLevel < texture.GetTrueMipCount()) return false;

    if (this.HasBox())
    {
      const box = this.box;

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
   * @param {import("#imageio").BitmapDimensions} bitmap The texture to check against.
   * @returns {boolean} True when it fits.
   */
  IsValidForBitmap(bitmap)
  {
    if (this.endFace > bitmap.GetArraySize()) return false;

    if (this.endMipLevel > bitmap.GetTrueMipCount()) return false;

    if (this.HasBox())
    {
      const box = this.box;

      if (box.right > bitmap.GetMipWidth(this.startMipLevel)) return false;

      if (box.bottom > bitmap.GetMipHeight(this.startMipLevel)) return false;

      if (bitmap.GetType() === TextureType.TEX_TYPE_3D && box.back > bitmap.GetMipDepth(this.startMipLevel)) return false;
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
      const box = this.box;

      if (box.left >= box.right || box.top >= box.bottom || box.front >= box.back) return false;
    }

    return this.startFace < this.endFace && this.startMipLevel < this.endMipLevel;
  }

  /**
   * Whether two ranges name the same region.
   *
   * @param {Tr2TextureSubresource} other The region to compare with.
   * @returns {boolean} True when they match.
   */
  Equals(other)
  {
    return this.startFace === other.startFace &&
      this.endFace === other.endFace &&
      this.startMipLevel === other.startMipLevel &&
      this.endMipLevel === other.endMipLevel &&
      this.box.Equals(other.box);
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
 * @param {import("#imageio").BitmapDimensions} sourceBD Source texture.
 * @param {Tr2TextureSubresource} destSR Destination region; mutated in place.
 * @param {import("#imageio").BitmapDimensions} destBD Destination texture.
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
    destSR.box.right = destSR.box.left + sourceSR.GetWidth();
  }
  else
  {
    sourceSR.box.right = sourceSR.box.left + destSR.GetWidth();
  }

  if (sourceSR.GetHeight() < destSR.GetHeight())
  {
    destSR.box.bottom = destSR.box.top + sourceSR.GetHeight();
  }
  else
  {
    sourceSR.box.bottom = sourceSR.box.top + destSR.GetHeight();
  }

  sourceSR.ClampToTexture(sourceBD);
  destSR.ClampToTexture(destBD);

  return sourceSR.IsValid() && destSR.IsValid();
}

CjsSchema.decorateField(Tr2TextureSubresource, "startFace", type.uint32);
CjsSchema.decorateField(Tr2TextureSubresource, "endFace", type.uint32);
CjsSchema.decorateField(Tr2TextureSubresource, "startMipLevel", type.uint32);
CjsSchema.decorateField(Tr2TextureSubresource, "endMipLevel", type.uint32);
CjsSchema.decorateField(Tr2TextureSubresource, "box", type.rawStruct("Tr2TextureCoordBox"));
CjsSchema.decorateMethod(Tr2TextureSubresource, "GetWidth", blue.method);
CjsSchema.decorateMethod(Tr2TextureSubresource, "GetHeight", blue.method);
CjsSchema.decorateMethod(Tr2TextureSubresource, "GetDepth", blue.method);
CjsSchema.decorateMethod(Tr2TextureSubresource, "GetMipCount", blue.method);
CjsSchema.decorateMethod(Tr2TextureSubresource, "GetFaceCount", blue.method);
CjsSchema.decorateMethod(Tr2TextureSubresource, "HasBox", blue.method);
CjsSchema.decorateMethod(Tr2TextureSubresource, "IsSingleSubresource", blue.method);
CjsSchema.decorateMethod(Tr2TextureSubresource, "SetBox", blue.method);
CjsSchema.decorateMethod(Tr2TextureSubresource, "SetRect", blue.method);
CjsSchema.decorateMethod(Tr2TextureSubresource, "ClampToTexture", blue.method);
CjsSchema.decorateMethod(Tr2TextureSubresource, "IsSubresourceFull", blue.method);
CjsSchema.decorateMethod(Tr2TextureSubresource, "IsValidForBitmap", blue.method);
CjsSchema.decorateMethod(Tr2TextureSubresource, "IsValid", blue.method);
CjsSchema.decorateMethod(Tr2TextureSubresource, "Equals", blue.method, meta.renamed("operator=="));
CjsSchema.meta.carbon("Tr2TextureSubresource")(Tr2TextureSubresource);
