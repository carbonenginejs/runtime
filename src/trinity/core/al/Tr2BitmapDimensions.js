// Source: imageio/include/BitmapDimensions.h
//
// `Tr2BitmapDimensions` is the abstraction layer's own alias for
// `ImageIO::BitmapDimensions` (`Tr2RenderContextEnum.h:435`), and it is the
// type every texture create, map and copy is described in. It holds the seven
// numbers that always travel together - type, format, width, height, depth,
// mip count, array size - and the mip arithmetic that would otherwise be
// rewritten at every call site.
//
// THE MIP MATH IS THE POINT, and it is not obvious. A compressed mip is not
// "width >> level": it rounds UP to a multiple of four and never falls below
// four, because a BC block is 4x4 and a 2x2 mip still occupies a whole block.
// Getting that wrong produces a pitch that is right for the top mip and wrong
// for every mip after it, which is the kind of defect that shows up as a
// diagonal smear rather than as an error.
//
// ONE LANGUAGE DIFFERENCE. Carbon has four constructor overloads; JavaScript
// has none, so the constructor takes a description object whose defaults are
// the default constructor's values, and `Texture2D` names the four-argument
// overload the render context uses.

import {
  PixelFormat,
  TextureType,
  IsCompressedFormat,
  GetBlockByteSize,
  GetBytesPerPixel
} from "../../../global/consts/renderContext/index.js";


/**
 * The dimensions, format and mip layout of a texture.
 */
export class Tr2BitmapDimensions
{
  /** Width of mip zero. */
  width = 0;

  /** Height of mip zero. */
  height = 0;

  /** Carbon's `m_volumeDepth`; 1 for anything that is not a volume texture. */
  depth = 0;

  /** Declared mip count. Zero means "a full chain" - see `GetTrueMipCount`. */
  mipCount = 0;

  /** Slices. Six for a cube. */
  arraySize = 1;

  /** A `TextureType` value. */
  type = TextureType.TEX_TYPE_INVALID;

  /** A `PixelFormat` value. */
  format = PixelFormat.PIXEL_FORMAT_UNKNOWN;

  /**
   * @param {object} [description] Texture description.
   * @param {number} [description.type] A `TextureType` value.
   * @param {number} [description.format] A `PixelFormat` value.
   * @param {number} [description.width] Width of mip zero.
   * @param {number} [description.height] Height of mip zero.
   * @param {number} [description.depth] Volume depth.
   * @param {number} [description.mipCount] Declared mip count, or zero for a full chain.
   * @param {number} [description.arraySize] Slices; defaults to six for a cube.
   */
  constructor(description = {})
  {
    const {
      type = TextureType.TEX_TYPE_INVALID,
      format = PixelFormat.PIXEL_FORMAT_UNKNOWN,
      width = 0,
      height = 0,
      depth = 0,
      mipCount = 0,
      arraySize = type === TextureType.TEX_TYPE_CUBE ? 6 : 1
    } = description;

    this.type = type;
    this.format = format;
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.mipCount = mipCount;
    this.arraySize = arraySize;
  }

  /**
   * Carbon's four-argument overload: a plain 2D texture with one slice.
   *
   * @param {number} width Width of mip zero.
   * @param {number} height Height of mip zero.
   * @param {number} mipCount Declared mip count.
   * @param {number} format A `PixelFormat` value.
   * @returns {Tr2BitmapDimensions} The description.
   */
  static Texture2D(width, height, mipCount, format)
  {
    return new Tr2BitmapDimensions({
      type: TextureType.TEX_TYPE_2D,
      format,
      width,
      height,
      depth: 1,
      mipCount
    });
  }

  /**
   * Width of mip zero.
   *
   * @returns {number} Width in pixels.
   */
  GetWidth()
  {
    return this.width;
  }

  /**
   * Height of mip zero.
   *
   * @returns {number} Height in pixels.
   */
  GetHeight()
  {
    return this.height;
  }

  /**
   * Volume depth.
   *
   * @returns {number} Depth in slices.
   */
  GetDepth()
  {
    return this.depth;
  }

  /**
   * The pixel format.
   *
   * @returns {number} A `PixelFormat` value.
   */
  GetFormat()
  {
    return this.format;
  }

  /**
   * The texture type.
   *
   * @returns {number} A `TextureType` value.
   */
  GetType()
  {
    return this.type;
  }

  /**
   * Slices in the array.
   *
   * @returns {number} Array size.
   */
  GetArraySize()
  {
    return this.arraySize;
  }

  /**
   * The DECLARED mip count, which may be zero.
   *
   * @returns {number} Mip levels as declared.
   */
  GetMipCount()
  {
    return this.mipCount;
  }

  /**
   * The mip count in effect.
   *
   * A declared zero means "as many as the size allows", so this counts them
   * rather than reporting nothing.
   *
   * @returns {number} Mip levels.
   */
  GetTrueMipCount()
  {
    if (this.mipCount > 0) return this.mipCount;

    let size = Math.max(this.width, this.height);
    let count = 0;

    while (size)
    {
      ++count;
      size >>= 1;
    }

    return count;
  }

  /**
   * Whether the format stores blocks rather than pixels.
   *
   * @returns {boolean} True for the BC family.
   */
  IsCompressed()
  {
    return IsCompressedFormat(this.format);
  }

  /**
   * Carbon's `HasMipmap`: anything but exactly one level.
   *
   * @returns {boolean} True when the texture is mipped.
   */
  HasMipmap()
  {
    return this.mipCount !== 1;
  }

  /**
   * Width of one mip, in pixels.
   *
   * A compressed mip rounds up to a whole block and never falls below four.
   *
   * @param {number} level Mip level.
   * @returns {number} Width, or zero past the end of the chain.
   */
  GetMipWidth(level)
  {
    if (level >= this.GetTrueMipCount()) return 0;

    if (this.IsCompressed()) return Math.max(((this.width >> level) + 3) & ~3, 4);

    return Math.max(this.width >> level, 1);
  }

  /**
   * Height of one mip, in pixels. Rounds the same way as `GetMipWidth`.
   *
   * @param {number} level Mip level.
   * @returns {number} Height, or zero past the end of the chain.
   */
  GetMipHeight(level)
  {
    if (level >= this.GetTrueMipCount()) return 0;

    if (this.IsCompressed()) return Math.max(((this.height >> level) + 3) & ~3, 4);

    return Math.max(this.height >> level, 1);
  }

  /**
   * Depth of one mip. Only a volume texture has more than one.
   *
   * @param {number} level Mip level.
   * @returns {number} Depth, or zero past the end of the chain.
   */
  GetMipDepth(level)
  {
    if (this.type !== TextureType.TEX_TYPE_3D) return 1;

    if (level >= this.GetTrueMipCount()) return 0;

    return Math.max(this.depth >> level, 1);
  }

  /**
   * Bytes in one row of a mip.
   *
   * For a compressed format a "row" is a row of BLOCKS, so the width is
   * divided by four before the block size is applied.
   *
   * @param {number} level Mip level.
   * @returns {number} Pitch in bytes.
   */
  GetMipPitch(level)
  {
    if (level >= this.GetTrueMipCount()) return 0;

    if (this.IsCompressed()) return this.GetMipWidth(level) / 4 * GetBlockByteSize(this.format);

    return this.GetMipWidth(level) * GetBytesPerPixel(this.format);
  }

  /**
   * Bytes in one mip.
   *
   * @param {number} level Mip level.
   * @returns {number} Size in bytes.
   */
  GetMipSize(level)
  {
    const pixels = this.GetMipWidth(level) * this.GetMipHeight(level) * this.GetMipDepth(level);

    if (this.IsCompressed()) return pixels / 16 * GetBlockByteSize(this.format);

    return pixels * GetBytesPerPixel(this.format);
  }

  /**
   * Rows to copy for a mip: block rows when compressed, pixel rows otherwise.
   *
   * @param {number} level Mip level.
   * @returns {number} Row count.
   */
  GetMipNumRows(level)
  {
    return this.IsCompressed() ? this.GetMipHeight(level) / 4 : this.GetMipHeight(level);
  }

  /**
   * Whether two descriptions name the same texture layout.
   *
   * @param {Tr2BitmapDimensions} other The description to compare with.
   * @returns {boolean} True when every field matches.
   */
  Equals(other)
  {
    return this.width === other.width &&
      this.height === other.height &&
      this.depth === other.depth &&
      this.mipCount === other.mipCount &&
      this.arraySize === other.arraySize &&
      this.type === other.type &&
      this.format === other.format;
  }
}
