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

import { CjsSchema } from "#schema";
import {
  PixelFormat,
  TextureType,
  IsCompressedFormat,
  GetBlockByteSize,
  GetBytesPerPixel
} from "../global/consts/renderContext/index.js";


/**
 * The dimensions, format and mip layout of a texture.
 *
 * STATE IS PRIVATE, BEHIND THE ACCESSORS CARBON ALREADY HAS. Its members were
 * public here and are not in Carbon: `TriTextureRes` DERIVES from this type and
 * reaches its size through `Tr2BitmapDimensions::GetWidth()`
 * (`TriTextureRes.h:33,48-52`), which only works because the members are not
 * the interface. The accessors below already existed, so the public fields were
 * a second way to read the same state.
 *
 * The abstraction layer is engine machinery, not authored parameters (operator,
 * 2026-09-05), so nothing here is a knob a human sets. The value TYPES it passes
 * around are a different matter: `Tr2MsaaDesc`, the texture box and subresource,
 * and the pass attachments are `struct`s in Carbon with public members, and stay
 * that way.
 */
export class Tr2BitmapDimensions
{
  /** Width of mip zero. */
  _width = 0;

  /** Height of mip zero. */
  _height = 0;

  /** Carbon's `m_volumeDepth`; 1 for anything that is not a volume texture. */
  _depth = 0;

  /** Declared mip count. Zero means "a full chain" - see `GetTrueMipCount`. */
  _mipCount = 0;

  /** Slices. Six for a cube. */
  _arraySize = 1;

  /** A `TextureType` value. */
  _type = TextureType.TEX_TYPE_INVALID;

  /** A `PixelFormat` value. */
  _format = PixelFormat.PIXEL_FORMAT_UNKNOWN;

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

    this._type = type;
    this._format = format;
    this._width = width;
    this._height = height;
    this._depth = depth;
    this._mipCount = mipCount;
    this._arraySize = arraySize;
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
    return this._width;
  }

  /**
   * Height of mip zero.
   *
   * @returns {number} Height in pixels.
   */
  GetHeight()
  {
    return this._height;
  }

  /**
   * Volume depth.
   *
   * @returns {number} Depth in slices.
   */
  GetDepth()
  {
    return this._depth;
  }

  /**
   * The pixel format.
   *
   * @returns {number} A `PixelFormat` value.
   */
  GetFormat()
  {
    return this._format;
  }

  /**
   * The texture type.
   *
   * @returns {number} A `TextureType` value.
   */
  GetType()
  {
    return this._type;
  }

  /**
   * Slices in the array.
   *
   * @returns {number} Array size.
   */
  GetArraySize()
  {
    return this._arraySize;
  }

  /**
   * The DECLARED mip count, which may be zero.
   *
   * @returns {number} Mip levels as declared.
   */
  GetMipCount()
  {
    return this._mipCount;
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
    if (this._mipCount > 0) return this._mipCount;

    let size = Math.max(this._width, this._height);
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
    return IsCompressedFormat(this._format);
  }

  /**
   * Carbon's `HasMipmap`: anything but exactly one level.
   *
   * @returns {boolean} True when the texture is mipped.
   */
  HasMipmap()
  {
    return this._mipCount !== 1;
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

    if (this.IsCompressed()) return Math.max(((this._width >> level) + 3) & ~3, 4);

    return Math.max(this._width >> level, 1);
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

    if (this.IsCompressed()) return Math.max(((this._height >> level) + 3) & ~3, 4);

    return Math.max(this._height >> level, 1);
  }

  /**
   * Depth of one mip. Only a volume texture has more than one.
   *
   * @param {number} level Mip level.
   * @returns {number} Depth, or zero past the end of the chain.
   */
  GetMipDepth(level)
  {
    if (this._type !== TextureType.TEX_TYPE_3D) return 1;

    if (level >= this.GetTrueMipCount()) return 0;

    return Math.max(this._depth >> level, 1);
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

    if (this.IsCompressed()) return this.GetMipWidth(level) / 4 * GetBlockByteSize(this._format);

    return this.GetMipWidth(level) * GetBytesPerPixel(this._format);
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

    if (this.IsCompressed()) return pixels / 16 * GetBlockByteSize(this._format);

    return pixels * GetBytesPerPixel(this._format);
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
   * Clears the description to "no texture".
   *
   * `BitmapDimensions::Destroy` (`imageio/include/BitmapDimensions.h:77-81`),
   * and the ODD PART IS CARBON'S: the line zeroing width, height, depth and mip
   * count is commented out there, so only the type and format are cleared and
   * the dimensions survive. `TriTextureRes::SetTexture` calls this when a
   * texture goes invalid (`TriTextureRes.cpp:1163`), where the surviving
   * dimensions are what a caller still reads back. Transcribed rather than
   * tidied - a port that also zeroed them would answer differently.
   *
   * @returns {void}
   */
  Destroy()
  {
    this._type = TextureType.TEX_TYPE_INVALID;
    this._format = PixelFormat.PIXEL_FORMAT_UNKNOWN;
  }

  /**
   * Whether two descriptions name the same texture layout.
   *
   * @param {Tr2BitmapDimensions} other The description to compare with.
   * @returns {boolean} True when every field matches.
   */
  Equals(other)
  {
    return this._width === other.width &&
      this._height === other.height &&
      this._depth === other.depth &&
      this._mipCount === other.mipCount &&
      this._arraySize === other.arraySize &&
      this._type === other.type &&
      this._format === other.format;
  }
}


// DECLARED AS A CALL, NOT A DECORATOR. The abstraction layer is imported
// straight from source by its tests - `#trinityal/...` resolves to `src/` - and
// raw Node cannot parse decorator syntax, so a decorator here breaks every test
// that reaches this file without a build first. `CjsSchema.define` is the same
// metadata through the door the schema already provides for exactly this, and
// it keeps the layer free of the decorator chain it has never carried.
CjsSchema.define(Tr2BitmapDimensions, { className: "Tr2BitmapDimensions", carbon: "BitmapDimensions" });
