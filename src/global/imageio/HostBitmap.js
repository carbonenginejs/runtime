// Source: imageio/include/HostBitmap.h
// Source: imageio/HostBitmap.cpp
//
// Carbon's CPU-side image: a `BitmapDimensions` plus the bytes it describes.
// It is what image data travels in between a reader and a texture - the image
// handlers fill one, the texture pipeline steps pass it along, and the upload
// reads its mips out of it.
//
// LAYOUT (HostBitmap.cpp:11-40, 437-470). Array-element-major: each array
// element (each cube face) holds its whole mip chain, level 0 first, and
// element k starts at `k * size / arraySize`. There is no padding; the pitch of
// an uncompressed level is width * bytes-per-pixel. A compressed level rounds
// each dimension up to a whole 4x4 block, never below one block.
//
// JAVASCRIPT DIFFERENCES, each marked `adapted:` at its site:
// - `m_data` is a Uint8Array, and a raw pointer becomes a view into it
//   (`subarray`) that runs to the end of the buffer, as the pointer does.
// - Out-parameters (`GetAverageColor`, `GetPixel`) return an object, or null
//   where Carbon returns false.
// - Carbon's move constructor and move assignment become `Swap`.
// - No logging facility is ported; each CCP_LOG call is kept as a comment
//   with its message, and the failure is reported by the return value alone.
//
// Carbon bugs and quirks are reproduced, not fixed, and marked `bug:` or
// `quirk:` with their line. See /docs/research/carbon-known-defects.md and
// /docs/projects/hostbitmap-port.md.
import {
  PixelFormat,
  TextureType,
  IsCompressedFormat,
  GetBlockByteSize,
  GetBytesPerPixel
} from "../consts/renderContext/index.js";
import { BitmapDimensions } from "./BitmapDimensions.js";
import { ImageUtility } from "./ImageUtility.js";


/**
 * Bytes needed for a description's whole mip chain times its array size
 * (the anonymous-namespace `GetDataSize`, HostBitmap.cpp:11-40).
 *
 * @param {BitmapDimensions} dim Description.
 * @returns {number} Byte size.
 */
function GetDataSize(dim)
{
  let mipCount = dim.GetTrueMipCount();
  let width = dim.GetWidth();
  let height = dim.GetHeight();
  let depth = dim.GetType() === TextureType.TEX_TYPE_3D ? dim.GetDepth() : 1;
  let size = 0;

  if (IsCompressedFormat(dim.GetFormat()))
  {
    const blockBytes = GetBlockByteSize(dim.GetFormat());

    while (mipCount-- > 0)
    {
      size += Math.floor(Math.max((width + 3) & ~3, 4) * Math.max((height + 3) & ~3, 4) * depth * blockBytes / 16);
      width = Math.max(Math.floor(width / 2), 1);
      height = Math.max(Math.floor(height / 2), 1);
      depth = Math.max(Math.floor(depth / 2), 1);
    }
  }
  else
  {
    const bpp = GetBytesPerPixel(dim.GetFormat());

    while (mipCount-- > 0)
    {
      size += width * height * depth * bpp;
      width = Math.max(Math.floor(width / 2), 1);
      height = Math.max(Math.floor(height / 2), 1);
      depth = Math.max(Math.floor(depth / 2), 1);
    }
  }

  return size * dim.GetArraySize();
}

/** The 8-bit-per-channel formats Downsample2x2 and GenerateMipMaps accept (HostBitmap.cpp:653-676, 1044-1072). */
const EIGHT_BIT_FORMATS = new Set([
  PixelFormat.PIXEL_FORMAT_R8G8B8A8_TYPELESS,
  PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM,
  PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM_SRGB,
  PixelFormat.PIXEL_FORMAT_R8G8B8A8_UINT,
  PixelFormat.PIXEL_FORMAT_R8G8B8A8_SNORM,
  PixelFormat.PIXEL_FORMAT_R8G8B8A8_SINT,
  PixelFormat.PIXEL_FORMAT_R8G8_TYPELESS,
  PixelFormat.PIXEL_FORMAT_R8G8_UNORM,
  PixelFormat.PIXEL_FORMAT_R8G8_UINT,
  PixelFormat.PIXEL_FORMAT_R8G8_SNORM,
  PixelFormat.PIXEL_FORMAT_R8G8_SINT,
  PixelFormat.PIXEL_FORMAT_R8_TYPELESS,
  PixelFormat.PIXEL_FORMAT_R8_UNORM,
  PixelFormat.PIXEL_FORMAT_R8_UINT,
  PixelFormat.PIXEL_FORMAT_R8_SNORM,
  PixelFormat.PIXEL_FORMAT_R8_SINT,
  PixelFormat.PIXEL_FORMAT_A8_UNORM,
  PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM,
  PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM,
  PixelFormat.PIXEL_FORMAT_B8G8R8A8_TYPELESS,
  PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM_SRGB,
  PixelFormat.PIXEL_FORMAT_B8G8R8X8_TYPELESS,
  PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM_SRGB
]);

const EMPTY = new Uint8Array(0);


/** `ImageIO::HostBitmap` - a texture description and its CPU bytes. */
export class HostBitmap extends BitmapDimensions
{

  /** m_name - never set by Carbon; only swapped by the moves. */
  _name = "";

  /** m_data - the bytes; empty means invalid. */
  _data = EMPTY;

  /** HostBitmap() (HostBitmap.cpp:47-49): an empty, invalid bitmap. */
  constructor()
  {
    super();
  }

  /**
   * Resize `_data`, keeping the prefix, as `CcpMallocBuffer::resize` does.
   *
   * @param {number} size New byte size.
   */
  _Resize(size)
  {
    if (size === this._data.length) return;

    const next = new Uint8Array(size);
    next.set(size < this._data.length ? this._data.subarray(0, size) : this._data);
    this._data = next;
  }

  /**
   * Exchange everything with another bitmap.
   *
   * adapted: Carbon's move assignment (HostBitmap.cpp:63-69) swaps the
   * dimensions, name and data; `std::swap(HostBitmap, HostBitmap)` does the
   * same through it (Tr2TexturePipelineStepLimitSize). JavaScript has no moves,
   * so the swap is named.
   *
   * @param {HostBitmap} other The bitmap to exchange with.
   * @returns {HostBitmap} This bitmap.
   */
  Swap(other)
  {
    for (const key of [ "_width", "_height", "_depth", "_mipCount", "_arraySize", "_type", "_format", "_name", "_data" ])
    {
      const value = this[key];
      this[key] = other[key];
      other[key] = value;
    }

    return this;
  }

  /**
   * A 2D bitmap with one array element (HostBitmap.cpp:71-110).
   *
   * @param {number} width Width of mip 0.
   * @param {number} height Height of mip 0.
   * @param {number} mipCount Mip count; 0 means the full chain.
   * @param {number} format A `PixelFormat` value.
   * @returns {boolean} Whether it was created.
   */
  Create(width, height, mipCount, format)
  {
    this.Destroy();

    if (!width || !height || format >= PixelFormat.PIXEL_FORMAT_SENTINEL)
    {
      // Carbon: CCP_LOGWARN("HostBitmap::Create invalid parameters: %d x %d, %d mips, format %d")
      return false;
    }

    if (IsCompressedFormat(format) && ((width % 4) !== 0 || (height % 4) !== 0))
    {
      // Carbon: CCP_LOGWARN("HostBitmap::Create invalid compressed size: %d x %d")
      return false;
    }

    this._width = width;
    this._height = height;
    this._depth = 1;
    this._format = format;
    this._mipCount = mipCount;
    this._arraySize = 1;
    this._type = TextureType.TEX_TYPE_2D;

    this._data = new Uint8Array(GetDataSize(this));

    return true;
  }

  /**
   * A 2D array bitmap (HostBitmap.cpp:112-151).
   *
   * @param {number} width Width of mip 0.
   * @param {number} height Height of mip 0.
   * @param {number} mipCount Mip count; 0 means the full chain.
   * @param {number} arraySize Array elements.
   * @param {number} format A `PixelFormat` value.
   * @returns {boolean} Whether it was created.
   */
  Create2DArray(width, height, mipCount, arraySize, format)
  {
    this.Destroy();

    if (!width || !height || !arraySize || format >= PixelFormat.PIXEL_FORMAT_SENTINEL)
    {
      // Carbon: CCP_LOGWARN("HostBitmap::Create2DArray invalid parameters: %d x %d, %d mips, %d array elements, format %d")
      return false;
    }

    if (IsCompressedFormat(format) && ((width % 4) !== 0 || (height % 4) !== 0))
    {
      // Carbon: CCP_LOGWARN("HostBitmap::Create invalid compressed size: %d x %d")
      return false;
    }

    this._width = width;
    this._height = height;
    this._depth = 1;
    this._format = format;
    this._mipCount = mipCount;
    this._arraySize = arraySize;
    this._type = TextureType.TEX_TYPE_2D;

    this._data = new Uint8Array(GetDataSize(this));

    return true;
  }

  /**
   * A cube bitmap: six square faces (HostBitmap.cpp:153-182).
   *
   * quirk: no logging, and the allocation is not checked (178-181).
   *
   * @param {number} width Face width and height.
   * @param {number} mipCount Mip count; 0 means the full chain.
   * @param {number} format A `PixelFormat` value.
   * @returns {boolean} Whether it was created.
   */
  CreateCube(width, mipCount, format)
  {
    this.Destroy();

    if (!width || format >= PixelFormat.PIXEL_FORMAT_SENTINEL) return false;
    if (IsCompressedFormat(format) && (width % 4) !== 0) return false;

    this._width = width;
    this._height = width;
    this._depth = 1;
    this._format = format;
    this._mipCount = mipCount;
    this._type = TextureType.TEX_TYPE_CUBE;
    this._arraySize = 6;

    this._data = new Uint8Array(GetDataSize(this));

    return true;
  }

  /**
   * A volume bitmap (HostBitmap.cpp:184-213).
   *
   * quirk: height and depth are not checked for zero (188), there is no
   * logging, and the allocation is not checked (209-212).
   *
   * @param {number} width Width of mip 0.
   * @param {number} height Height of mip 0.
   * @param {number} depth Depth of mip 0.
   * @param {number} mipCount Mip count; 0 means the full chain.
   * @param {number} format A `PixelFormat` value.
   * @returns {boolean} Whether it was created.
   */
  CreateVolume(width, height, depth, mipCount, format)
  {
    this.Destroy();

    if (!width || format >= PixelFormat.PIXEL_FORMAT_SENTINEL) return false;
    if (IsCompressedFormat(format) && ((width % 4) !== 0 || (height % 4) !== 0)) return false;

    this._width = width;
    this._height = height;
    this._depth = depth;
    this._format = format;
    this._mipCount = mipCount;
    this._type = TextureType.TEX_TYPE_3D;
    this._arraySize = 1;

    this._data = new Uint8Array(GetDataSize(this));

    return true;
  }

  /**
   * Take a description and allocate its bytes (HostBitmap.cpp:215-228).
   *
   * quirk: unlike the Create family it does not call Destroy() first, and it
   * does not check that a compressed size is a multiple of 4 (217).
   *
   * @param {BitmapDimensions} dimensions Description to copy.
   * @returns {boolean} Whether it was created.
   */
  CreateFromBitmapDimensions(dimensions)
  {
    if (dimensions.GetWidth() === 0 || dimensions.GetFormat() === PixelFormat.PIXEL_FORMAT_UNKNOWN)
    {
      return false;
    }

    this._width = dimensions.GetWidth();
    this._height = dimensions.GetHeight();
    this._depth = dimensions.GetDepth();
    this._mipCount = dimensions.GetMipCount();
    this._arraySize = dimensions.GetArraySize();
    this._type = dimensions.GetType();
    this._format = dimensions.GetFormat();

    this._Resize(GetDataSize(this));

    return true;
  }

  /**
   * Whether the bitmap holds data (HostBitmap.cpp:230-233).
   *
   * @returns {boolean} Whether it is valid.
   */
  IsValid()
  {
    return this._data.length !== 0;
  }

  /**
   * Clear the data and invalidate the description (HostBitmap.cpp:235-240).
   * Only the type and format are reset; the sizes are kept, as in Carbon.
   *
   * @returns {void}
   */
  Destroy()
  {
    super.Destroy();
    this._data = EMPTY;
  }

  /**
   * Relabel the format without touching the bytes (HostBitmap.cpp:242-255).
   *
   * @param {number} format A `PixelFormat` value of the same byte size.
   * @returns {boolean} Whether the label changed.
   */
  ChangeFormat(format)
  {
    if (!this.IsValid()) return false;

    if (IsCompressedFormat(format) || IsCompressedFormat(this._format) ||
      GetBytesPerPixel(format) !== GetBytesPerPixel(this._format))
    {
      return false;
    }

    this._format = format;

    return true;
  }

  /**
   * Convert the bytes to another format, for the few transitions Carbon
   * supports (HostBitmap.cpp:270-403): BGRA <-> BGRX, BGRA/BGRX -> R8,
   * RGBA8 <-> BGRA/BGRX, R8 -> BGRA/BGRX and R8G8 -> BGRA. Every mip and array
   * element is converted.
   *
   * Compressed formats are refused here, as in Carbon. The browser conversions
   * that decode and encode block formats are layered on top in resource/imageio.
   *
   * @param {number} format A `PixelFormat` value.
   * @returns {boolean} Whether the conversion was done.
   */
  ConvertFormat(format)
  {
    if (!this.IsValid()) return false;
    if (format === this._format) return true;

    const F = PixelFormat;
    const current = this._format;
    const isBgra = current === F.PIXEL_FORMAT_B8G8R8A8_UNORM;
    const isBgrx = current === F.PIXEL_FORMAT_B8G8R8X8_UNORM;

    if (format === F.PIXEL_FORMAT_B8G8R8X8_UNORM && isBgra)
    {
      this._format = format;
      return true;
    }

    if (format === F.PIXEL_FORMAT_B8G8R8A8_UNORM && isBgrx)
    {
      const data = this._data;
      for (let i = 0; i !== data.length; i += 4)
      {
        data[i + 3] = 0xff;
      }
      this._format = F.PIXEL_FORMAT_B8G8R8A8_UNORM;
      return true;
    }

    if (format === F.PIXEL_FORMAT_R8_UNORM && (isBgra || isBgrx))
    {
      // quirk: keeps byte 0 of each pixel, which is BLUE in B8G8R8 memory
      // order (HostBitmap.cpp:321-325).
      const pixelCount = Math.floor(this._data.length / GetBytesPerPixel(current));
      const src = this._data;
      const dst = new Uint8Array(pixelCount);

      for (let i = 0; i < pixelCount; ++i)
      {
        dst[i] = src[i * 4];
      }

      this._data = dst;
      this._format = format;
      return true;
    }

    if ((format === F.PIXEL_FORMAT_R8G8B8A8_UNORM && (isBgra || isBgrx)) ||
      (current === F.PIXEL_FORMAT_R8G8B8A8_UNORM && (format === F.PIXEL_FORMAT_B8G8R8A8_UNORM || format === F.PIXEL_FORMAT_B8G8R8X8_UNORM)))
    {
      // quirk: swaps bytes 0 and 2 only; a BGRX source keeps its undefined X
      // byte as alpha (HostBitmap.cpp:332-349).
      const data = this._data;
      const bpp = GetBytesPerPixel(current);

      for (let i = 0; i < data.length - 2; i += bpp)
      {
        const tmp = data[i];
        data[i] = data[i + 2];
        data[i + 2] = tmp;
      }

      this._format = format;
      return true;
    }

    if ((format === F.PIXEL_FORMAT_B8G8R8A8_UNORM && (current === F.PIXEL_FORMAT_R8_UNORM || current === F.PIXEL_FORMAT_R8G8_UNORM)) ||
      (format === F.PIXEL_FORMAT_B8G8R8X8_UNORM && current === F.PIXEL_FORMAT_R8_UNORM))
    {
      const pixelCount = Math.floor(this._data.length / GetBytesPerPixel(current));
      const src = this._data;
      const dst = new Uint8Array(pixelCount * 4);
      let s = 0;
      let d = 0;

      if (current === F.PIXEL_FORMAT_R8_UNORM)
      {
        for (let i = 0; i < pixelCount; ++i)
        {
          dst[d++] = src[s];
          dst[d++] = src[s];
          dst[d++] = src[s];
          ++s;
          dst[d++] = 0xff;
        }
      }
      else
      {
        for (let i = 0; i < pixelCount; ++i)
        {
          dst[d++] = src[s];
          dst[d++] = src[s];
          dst[d++] = src[s];
          ++s;
          dst[d++] = src[s++];
        }
      }

      this._data = dst;
      this._format = format;
      return true;
    }

    return false;
  }

  /**
   * Whether another description can take this bitmap's data (HostBitmap.cpp:405-435).
   *
   * adapted: Carbon returns bool and writes `alphaConvert` through a
   * reference; JavaScript returns both. Protected in Carbon and unused in
   * imageio.
   *
   * @param {BitmapDimensions} bd Description to compare with.
   * @param {boolean} checkDimensions Whether width and height must match.
   * @param {string} _log Log prefix (no logging is ported).
   * @returns {{match: boolean, alphaConvert: boolean}} The answer.
   */
  _CheckForMatch(bd, checkDimensions, _log)
  {
    if (!this.IsValid())
    {
      // Carbon: CCP_LOGWARN("%s: invalid source or destination")
      return { match: false, alphaConvert: false };
    }

    if (checkDimensions && (bd.GetWidth() !== this._width || bd.GetHeight() !== this._height))
    {
      // Carbon: CCP_LOGWARN("%s: incompatible size")
      return { match: false, alphaConvert: false };
    }

    // Carbon: CCP_LOGWARN("%s: miplevels mismatch, data may be truncated")
    // when the true mip counts differ - a warning only, not a failure.

    const formatMatch = bd.GetFormat() === this._format;
    const alphaConvert = bd.GetFormat() === PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM &&
      this._format === PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM;

    if (!formatMatch && !alphaConvert)
    {
      // Carbon: CCP_LOGWARN("%s: incompatible size/pixelformat")
      return { match: false, alphaConvert };
    }

    return { match: true, alphaConvert };
  }

  /**
   * The bytes of one mip of one array element (HostBitmap.cpp:437-470).
   *
   * adapted: returns a view from that mip to the end of the buffer, as the
   * pointer Carbon returns does, or null.
   *
   * quirk: a compressed offset adds `GetMipHeight(i) / 4` block rows per level
   * (448-453), and assumes every array element is `size / arraySize` bytes
   * (Carbon's own comment: "is it safe to assume this?").
   *
   * @param {number} level Mip level.
   * @param {number} [arrayIndex=0] Array element.
   * @returns {Uint8Array|null} View of the mip's bytes onward.
   */
  GetMipRawData(level, arrayIndex = 0)
  {
    if (!this.IsValid() || level >= this.GetTrueMipCount()) return null;
    if (arrayIndex >= this.GetArraySize()) return null;

    let offset = 0;

    if (IsCompressedFormat(this._format))
    {
      for (let i = 0; i !== level; ++i)
      {
        offset += Math.floor(this.GetMipHeight(i) / 4) * this.GetMipPitch(i) * Math.max(this._depth >>> i, 1);
      }
    }
    else
    {
      for (let i = 0; i !== level; ++i)
      {
        offset += this.GetMipHeight(i) * this.GetMipPitch(i) * Math.max(this._depth >>> i, 1);
      }
    }

    if (arrayIndex > 0)
    {
      offset += Math.floor(this._data.length / this.GetArraySize()) * arrayIndex;
    }

    return this._data.subarray(offset);
  }

  /**
   * The pitch of mip 0 in bytes (HostBitmap.cpp:477-489); for a compressed
   * format, the bytes in one row of blocks.
   *
   * @returns {number} Pitch.
   */
  GetPitch()
  {
    if (!this.IsValid()) return 0;

    if (this.IsCompressed())
    {
      return Math.floor(this._width * GetBlockByteSize(this._format) / 4);
    }

    return this._width * GetBytesPerPixel(this._format);
  }

  /**
   * The bytes, or a view from one pixel of mip 0 onward
   * (HostBitmap.cpp:491-522).
   *
   * adapted: Carbon's two overloads - `GetRawData()` and `GetRawData(x, y)` -
   * are one method told apart by argument count.
   *
   * quirk: for a compressed format `y` indexes block rows while `x` advances a
   * quarter block per pixel (517-519); ported as written.
   *
   * @param {number} [x] Column.
   * @param {number} [y] Row.
   * @returns {Uint8Array|null} The bytes, a view into them, or null.
   */
  GetRawData(x, y)
  {
    if (!this.IsValid()) return null;
    if (x === undefined) return this._data;

    if (this.IsCompressed())
    {
      return this._data.subarray(y * this.GetPitch() + Math.floor(x * GetBlockByteSize(this._format) / 4));
    }

    return this._data.subarray(y * this.GetPitch() + x * GetBytesPerPixel(this._format));
  }

  /**
   * The byte size of the data (HostBitmap.cpp:524-527).
   *
   * @returns {number} Byte size.
   */
  GetRawDataSize()
  {
    return this._data.length;
  }

  /**
   * The byte size of one array element (HostBitmap.cpp:529-532).
   *
   * @returns {number} Byte size.
   */
  GetArrayElementSize()
  {
    return Math.floor(this._data.length / this._arraySize);
  }

  /**
   * Copy the inner rectangle's edge pixels outward into a margin, for a
   * clamping effect (HostBitmap.cpp:539-595). The corners are not written.
   *
   * @param {number} margin Margin width in pixels.
   * @returns {boolean} Whether the margin was filled.
   */
  PopulateMargin(margin)
  {
    if (!this.IsValid() || this.IsCompressed() || this._mipCount !== 1 ||
      2 * margin >= this.GetWidth() || 2 * margin >= this.GetHeight() ||
      this.GetType() !== TextureType.TEX_TYPE_2D || this._arraySize > 1)
    {
      return false;
    }

    const data = this._data;
    const bpp = GetBytesPerPixel(this.GetFormat());
    const pitch = this.GetPitch();
    const at = (x, y) => y * pitch + x * bpp;
    const width = this.GetWidth() - 2 * margin;
    const height = this.GetHeight() - 2 * margin;

    let src = at(margin, margin);
    for (let i = 0; i !== margin; ++i)
    {
      data.copyWithin(at(margin, i), src, src + bpp * width);
    }

    src = at(margin, height + margin - 1);
    for (let i = 0; i !== margin; ++i)
    {
      data.copyWithin(at(margin, height + margin + i), src, src + bpp * width);
    }

    for (let y = 0; y !== height; ++y)
    {
      src = at(margin, y + margin);
      let dst = at(0, y + margin);
      for (let i = 0; i !== margin; ++i)
      {
        for (let j = 0; j !== bpp; ++j)
        {
          data[dst + i * bpp + j] = data[src + j];
        }
      }

      src += (width - 1) * bpp;
      dst += width * bpp + bpp * margin;
      for (let i = 0; i !== margin; ++i)
      {
        for (let j = 0; j !== bpp; ++j)
        {
          data[dst + i * bpp + j] = data[src + j];
        }
      }
    }

    return true;
  }

  /**
   * Copy one byte channel from another bitmap of the same shape
   * (HostBitmap.cpp:597-643). Channels are byte indices, so for BGRA formats
   * they are in memory order: 0 is blue.
   *
   * @param {HostBitmap} source Source bitmap.
   * @param {number} srcChannel Source byte index within a pixel.
   * @param {number} dstChannel Destination byte index within a pixel.
   * @returns {boolean} Whether the channel was copied.
   */
  CopyChannel(source, srcChannel, dstChannel)
  {
    if (!this.IsValid() || this.IsCompressed() || !source.IsValid() || source.IsCompressed())
    {
      // Carbon: CCP_LOGWARN("HostBitmap.CopyChannel: Need a valid uncompressed bitmap")
      return false;
    }

    if (this._type !== source._type || this._arraySize !== source._arraySize ||
      this._mipCount !== source._mipCount || this._width !== source._width || this._height !== source._height)
    {
      // Carbon: CCP_LOGWARN("HostBitmap.CopyChannel: Bitmaps need same type and dimensions")
      return false;
    }

    const dstBPP = GetBytesPerPixel(this.GetFormat());
    const srcBPP = GetBytesPerPixel(source.GetFormat());

    // Carbon: CCP_LOGWARN("HostBitmap.CopyChannel: Destination channel out of range")
    if (dstChannel >= dstBPP) return false;

    // Carbon: CCP_LOGWARN("HostBitmap.CopyChannel: Source channel out of range")
    if (srcChannel >= srcBPP) return false;

    if (source === this && srcChannel === dstChannel) return true;

    const src = source._data;
    const dst = this._data;

    for (let srcPos = srcChannel, dstPos = dstChannel; dstPos < dst.length && srcPos < src.length; srcPos += srcBPP, dstPos += dstBPP)
    {
      dst[dstPos] = src[srcPos];
    }

    return true;
  }

  /**
   * Halve the bitmap in place with a 2x2 box filter (HostBitmap.cpp:645-743).
   * New level k is the box-filtered old level k; the smallest old level is
   * dropped when there was more than one.
   *
   * quirk: SNORM and SINT bytes are averaged as unsigned (716-719).
   *
   * @returns {boolean} Whether it was downsampled.
   */
  Downsample2x2()
  {
    if (!this.IsValid() || (this._width & 1) || (this._height & 1) ||
      (this._type !== TextureType.TEX_TYPE_2D && this._type !== TextureType.TEX_TYPE_CUBE))
    {
      // Carbon: CCP_LOGWARN("Downsample2x2 only works with valid, even sized bitmaps")
      return false;
    }

    if (!EIGHT_BIT_FORMATS.has(this.GetFormat()))
    {
      // Carbon: CCP_LOGWARN("Downsample2x2 does not support this pixel format")
      return false;
    }

    if (this._mipCount === 0)
    {
      // bug: `m_mipCount - 1` wraps to UINT_MAX on an unsigned full-chain count
      // (689), so Carbon loops ~4 billion levels and the final resize asks for
      // an impossible size, which fails into Destroy() and false. The loop is
      // not run here - it would hang JavaScript - but the outcome is the same.
      this.Destroy();
      return false;
    }

    const data = this._data;
    const bpp = GetBytesPerPixel(this._format);
    const newMipCount = Math.max(this._mipCount - 1, 1);
    let src = 0;
    let dst = 0;

    for (let l = 0; l < this._arraySize; l++)
    {
      let curWidth = this._width;
      let curHeight = this._height;

      for (let k = 0; k < newMipCount; k++, curWidth = Math.floor(curWidth / 2), curHeight = Math.floor(curHeight / 2))
      {
        for (let j = 0; j !== Math.floor(curHeight / 2); ++j)
        {
          for (let i = 0; i !== Math.floor(curWidth / 2); ++i)
          {
            for (let byte = 0; byte < bpp; ++byte, ++src, ++dst)
            {
              const sum = data[src] + data[src + bpp] + data[src + curWidth * bpp] + data[src + curWidth * bpp + bpp];
              data[dst] = Math.floor(sum / 4);
            }
            src += bpp;
          }
          src += curWidth * bpp;
        }
      }

      // Skip lowest mip level, but only if we had any mips to begin with.
      if (this._mipCount !== 1)
      {
        src += curHeight * curWidth * bpp;
      }
    }

    this._mipCount = newMipCount;
    this._width = Math.floor(this._width / 2);
    this._height = Math.floor(this._height / 2);

    let mipCount = newMipCount;
    let width = this._width;
    let height = this._height;
    let size = 0;

    while (mipCount-- > 0)
    {
      size += width * height * bpp;
      width = Math.max(Math.floor(width / 2), 1);
      height = Math.max(Math.floor(height / 2), 1);
    }

    this._Resize(size * this._arraySize);

    return true;
  }

  /**
   * Crop a single-mip 2D bitmap in place (HostBitmap.cpp:745-781); `right` and
   * `bottom` are exclusive.
   *
   * quirk: an empty rectangle Destroy()s the bitmap and returns true (758-762).
   *
   * @param {number} left Left column.
   * @param {number} top Top row.
   * @param {number} right Right column, exclusive.
   * @param {number} bottom Bottom row, exclusive.
   * @returns {boolean} Whether it was cropped.
   */
  Crop(left, top, right, bottom)
  {
    if (!this.IsValid() || this._mipCount !== 1 || this._type !== TextureType.TEX_TYPE_2D ||
      this._arraySize > 1 || IsCompressedFormat(this._format))
    {
      // Carbon: CCP_LOGWARN("Crop only works with valid, single miplevel 2D bitmaps in uncompressed format")
      return false;
    }

    left = Math.min(left, this._width);
    right = Math.min(right, this._width);
    top = Math.min(top, this._height);
    bottom = Math.min(bottom, this._height);

    if (left >= right || top >= bottom)
    {
      this.Destroy();
      return true;
    }

    const data = this._data;
    const bpp = GetBytesPerPixel(this._format);
    const srcStride = this._width * bpp;
    const dstStride = (right - left) * bpp;
    let src = left * bpp + srcStride * top;
    let dst = 0;

    for (let j = top; j !== bottom; ++j)
    {
      data.copyWithin(dst, src, src + dstStride);
      dst += dstStride;
      src += srcStride;
    }

    this._width = right - left;
    this._height = bottom - top;
    this._Resize(this._width * this._height * bpp);

    return true;
  }

  /**
   * Rotate one face clockwise by a multiple of 90 degrees (HostBitmap.cpp:787-868).
   *
   * quirk: a full-chain bitmap (mip count 0) passes the single-mip check
   * (`GetMipCount() > 1`, 795), and the face offset then ignores its mips.
   *
   * @param {number} face Array element.
   * @param {number} times Quarter turns.
   * @returns {boolean} Whether it was rotated.
   */
  RotateFaceClockwise(face, times)
  {
    if (!this.IsValid()) return false;

    if ((this.GetType() !== TextureType.TEX_TYPE_2D && this.GetType() !== TextureType.TEX_TYPE_CUBE) || this.GetMipCount() > 1)
    {
      // Carbon: CCP_LOGERR("HostBitmap.RotateFaceClockwise requires 2D/CUBE bitmap with a single mip level")
      return false;
    }

    // Carbon: CCP_LOGERR("HostBitmap.RotateFaceClockwise: index out of range")
    if (face >= this.GetArraySize()) return false;

    // Carbon: CCP_LOGERR("HostBitmap.RotateFaceClockwise: width must be equal to height")
    if (this.GetWidth() !== this.GetHeight()) return false;

    // Carbon: CCP_LOGERR("HostBitmap.RotateFaceClockwise: don't support compressed images")
    if (IsCompressedFormat(this.GetFormat())) return false;

    times = times % 4;
    if (!times) return true;

    const size = this.GetWidth();
    const pitch = this.GetPitch();
    const bpp = GetBytesPerPixel(this._format);
    const srcRaw = this._data;
    const dstRaw = srcRaw.slice();
    const offset = pitch * size * face;

    for (let oldX = 0; oldX < size; oldX++)
    {
      for (let oldY = 0; oldY < size; oldY++)
      {
        let newX = oldX;
        let newY = oldY;

        for (let i = 0; i < times; i++)
        {
          const y = newX;
          newX = size - 1 - newY;
          newY = y;
        }

        const src = offset + (oldX + oldY * size) * bpp;
        const dst = offset + (newX + newY * size) * bpp;

        for (let k = 0; k < bpp; ++k)
        {
          dstRaw[dst + k] = srcRaw[src + k];
        }
      }
    }

    this._data = dstRaw;

    return true;
  }

  /**
   * Convert a 3:4 cross map into a cube (HostBitmap.cpp:874-953). Faces are
   * +X (2,1), -X (0,1), +Y (1,0), -Y (1,2), +Z (1,1), -Z (1,3) in face-size
   * cells, and -Z is turned 180 degrees.
   *
   * @returns {boolean} Whether it was converted.
   */
  ConvertCrossmapToCubemap()
  {
    if (!this.IsValid()) return false;

    // Carbon: CCP_LOGERR("HostBitmap.ConvertCrossmapToCubemap requires a 2D bitmap")
    if (this.GetType() !== TextureType.TEX_TYPE_2D || this._arraySize > 1) return false;

    // Carbon: CCP_LOGERR("HostBitmap.ConvertCrossmapToCubemap: Bitmap has mips. Use DropMipMaps() first.")
    if (this.GetMipCount() !== 1) return false;

    // Carbon: CCP_LOGERR("HostBitmap.ConvertCrossmapToCubemap: source image does not represent a 3:4 crossmap!")
    if (this.GetWidth() % 3 !== 0 || this.GetHeight() % 4 !== 0 || this.GetWidth() / 3 !== this.GetHeight() / 4) return false;

    // Carbon: CCP_LOGERR("HostBitmap.ConvertCrossmapToCubemap: don't support compressed images")
    if (IsCompressedFormat(this.GetFormat())) return false;

    const cubeSize = this.GetWidth() / 3;
    const srcPitch = this.GetPitch();
    const dstPitch = cubeSize * GetBytesPerPixel(this._format);
    const third = Math.floor(srcPitch / 3);

    const faceOffsets = [
      srcPitch * cubeSize + third * 2,
      srcPitch * cubeSize,
      third,
      srcPitch * cubeSize * 2 + third,
      srcPitch * cubeSize + third,
      srcPitch * cubeSize * 3 + third
    ];

    const srcRaw = this._data;
    const dstRaw = new Uint8Array(dstPitch * cubeSize * 6);

    for (let face = 0; face < 6; face++)
    {
      const srcOffset = faceOffsets[face];
      const dstOffset = face * cubeSize * dstPitch;

      for (let line = 0; line < cubeSize; ++line)
      {
        const from = srcOffset + line * srcPitch;
        dstRaw.set(srcRaw.subarray(from, from + dstPitch), dstOffset + line * dstPitch);
      }
    }

    this._data = dstRaw;
    this._type = TextureType.TEX_TYPE_CUBE;
    this._width = this._height = cubeSize;
    this._arraySize = 6;

    this.RotateFaceClockwise(5, 2);

    return true;
  }

  /**
   * Convert a horizontal strip of square slices into a cubic volume
   * (HostBitmap.cpp:960-1023). The strip is read bottom-aligned.
   *
   * bug: the row pitch is `GetPitch() / GetWidth() * cubeSize` (991), which is
   * wrong for a compressed format; ported as written.
   *
   * @returns {boolean} Whether it was converted.
   */
  ConvertToVolume()
  {
    if (!this.IsValid()) return false;

    // Carbon: CCP_LOGERR("HostBitmap.ConvertToVolume requires 2D bitmap")
    if (this.GetType() !== TextureType.TEX_TYPE_2D || this._arraySize > 1) return false;

    let cubeSize = this.GetHeight();

    // Carbon: CCP_LOGERR("HostBitmap.ConvertToVolume: source image does not represent a cubic volume texture!")
    if (cubeSize * cubeSize < this.GetWidth()) return false;

    // Carbon: CCP_LOGERR("HostBitmap.ConvertToVolume: %i is not a valid size for compressed texture")
    if (IsCompressedFormat(this.GetFormat()) && (cubeSize % 4) !== 0) return false;

    cubeSize = Math.floor(Math.sqrt(Math.fround(this.GetWidth())));

    const pitch = this.GetPitch();
    const rowPitch = Math.floor(pitch / this.GetWidth()) * cubeSize;
    const slicePitch = rowPitch * cubeSize;
    const volumeSize = slicePitch * cubeSize;
    const srcRaw = this._data;
    const dstRaw = new Uint8Array(volumeSize);
    const sourceOffset = (this.GetHeight() - cubeSize) * pitch;

    for (let slice = 0; slice < cubeSize; ++slice)
    {
      const srcSlice = sourceOffset + Math.floor(slice * pitch / cubeSize);
      const dstSlice = slice * slicePitch;

      for (let line = 0; line < cubeSize; ++line)
      {
        const from = line * pitch + srcSlice;
        dstRaw.set(srcRaw.subarray(from, from + rowPitch), line * rowPitch + dstSlice);
      }
    }

    this._data = dstRaw;
    this._type = TextureType.TEX_TYPE_3D;
    this._mipCount = 1;
    this._width = this._height = this._depth = cubeSize;

    return true;
  }

  /**
   * Generate the mip chain from mip 0 with a 2x2 box filter
   * (HostBitmap.cpp:1036-1130). Only 2D and cube bitmaps with one level, in
   * an 8-bit-per-channel format.
   *
   * quirk: there is no IsValid() check, and asking for more levels than the
   * full chain fails with the mip count already set to 0 (1074-1080).
   *
   * @param {number} [levels=0] Total levels to keep; 0 means the full chain.
   * @returns {boolean} Whether the mips were generated.
   */
  GenerateMipMaps(levels = 0)
  {
    if ((this._type !== TextureType.TEX_TYPE_2D && this._type !== TextureType.TEX_TYPE_CUBE) || this._mipCount > 1)
    {
      return false;
    }

    const format = this.GetFormat();
    if (!EIGHT_BIT_FORMATS.has(format)) return false;

    this._mipCount = 0;
    let mipCount = this.GetTrueMipCount();

    if (levels)
    {
      if (levels > mipCount) return false;
      mipCount = levels;
    }
    else
    {
      levels = mipCount;
    }

    const bpp = GetBytesPerPixel(format);
    let width = this._width;
    let height = this._height;
    let size = 0;

    while (mipCount-- > 0)
    {
      size += width * height * bpp;
      width = Math.max(Math.floor(width / 2), 1);
      height = Math.max(Math.floor(height / 2), 1);
    }

    const originalSize = this._data.length;
    this._Resize(size * this.GetArraySize());

    for (let j = this.GetArraySize() - 1; j >= 0; --j)
    {
      width = this._width;
      height = this._height;

      const topSize = width * height * bpp;
      const to = Math.floor(this._data.length / this.GetArraySize()) * j;
      const from = Math.floor(originalSize / this.GetArraySize()) * j;
      this._data.copyWithin(to, from, from + topSize);

      for (let i = 0; i + 1 < levels; ++i)
      {
        this._GenerateMipLevel(this.GetMipRawData(i, j), width, height, this.GetMipRawData(i + 1, j));
        width = Math.max(Math.floor(width / 2), 1);
        height = Math.max(Math.floor(height / 2), 1);
      }
    }

    this._mipCount = levels;

    return true;
  }

  /**
   * One mip from the one above it: a 2x2 box per byte, `(a+b+c+d) >> 2`, with
   * no sRGB handling (HostBitmap.cpp:1132-1167). A 1-wide or 1-tall source
   * duplicates, neighbours clamp to the right column and bottom row, and an odd
   * trailing column or row is dropped. Private in Carbon.
   *
   * @param {Uint8Array} source The source mip.
   * @param {number} width Source width.
   * @param {number} height Source height.
   * @param {Uint8Array} destination The destination mip.
   * @returns {boolean} Always true.
   */
  _GenerateMipLevel(source, width, height, destination)
  {
    const bpp = GetBytesPerPixel(this._format);
    const dstWidth = Math.max(Math.floor(width / 2), 1);
    const dstHeight = Math.max(Math.floor(height / 2), 1);
    const srcStride = width * bpp;
    const vertStep = height > 1 ? srcStride : 0;
    const horizStep = width > 1 ? bpp : 0;
    const bottom = (height - 1) * srcStride;

    let src00 = 0;
    let src01 = vertStep;
    let dst = 0;

    for (let i = 0; i < dstHeight; ++i)
    {
      const right0 = src00 + (width - 1) * bpp;
      const right1 = src01 + (width - 1) * bpp;

      for (let j = 0; j < dstWidth; ++j)
      {
        let src10 = Math.min(src00 + horizStep, right0);
        let src11 = Math.min(src01 + horizStep, right1);

        for (let k = 0; k < bpp; ++k)
        {
          destination[dst++] = (source[src00++] + source[src01++] + source[src10++] + source[src11++]) >>> 2;
        }

        src00 += horizStep;
        src01 += horizStep;
      }

      src00 = Math.min(right0 + bpp + vertStep, bottom);
      src01 = Math.min(right1 + bpp + vertStep, bottom);
    }

    return true;
  }

  /**
   * Keep mip 0 of every array element and drop the rest (HostBitmap.cpp:1176-1198).
   *
   * @returns {boolean} False only for an invalid bitmap.
   */
  DropMipMaps()
  {
    if (!this.IsValid())
    {
      // Carbon: CCP_LOGERR("HostBitmap.DropMipMaps: bitmap is not valid")
      return false;
    }

    if (this._mipCount === 1) return true;

    const size = this._data.length - this.GetMipRawData(1, 0).length;

    for (let i = 1; i < this._arraySize; i++)
    {
      const from = this._data.length - this.GetMipRawData(0, i).length;
      this._data.copyWithin(size * i, from, from + size);
    }

    this._Resize(size * this.GetArraySize());
    this._mipCount = 1;

    return true;
  }

  /**
   * The average colour of a single 2D image, sampled on a grid over its
   * smallest mip (HostBitmap.cpp:1200-1301). BGRX, BGRA, BC1 and BC3 only.
   *
   * adapted: returns `{r, g, b, a}` in 0..1, or null where Carbon returns
   * false and writes nothing.
   *
   * quirk: it samples mip `GetMipCount() - 1` - the SMALLEST level - and for a
   * full-chain bitmap (mip count 0) that index wraps, `GetMipWidth` answers 0
   * and it fails (1217-1225). It divides by the full grid count even when a
   * sample was skipped (1292). BC3 inherits ImageUtility's block-0 bug.
   *
   * @returns {{r: number, g: number, b: number, a: number}|null} The colour.
   */
  GetAverageColor()
  {
    if (!this.IsValid())
    {
      // Carbon: CCP_LOGERR("GetAverageColor: bitmap %s is not valid") - bug: %s has no argument (1203).
      return null;
    }

    if (this.GetType() !== TextureType.TEX_TYPE_2D || this.GetArraySize() >= 2) return null;

    const F = PixelFormat;
    const format = this.GetFormat();

    if (format !== F.PIXEL_FORMAT_B8G8R8X8_UNORM && format !== F.PIXEL_FORMAT_B8G8R8A8_UNORM &&
      format !== F.PIXEL_FORMAT_BC1_UNORM && format !== F.PIXEL_FORMAT_BC3_UNORM)
    {
      return null;
    }

    const mipLevel = (this.GetMipCount() - 1) >>> 0;
    const width = this.GetMipWidth(mipLevel);
    const height = this.GetMipHeight(mipLevel);

    if (width === 0 || height === 0) return null;

    const pitch = this.GetMipPitch(mipLevel);
    const data = this.GetMipRawData(mipLevel);

    const yStep = Math.min(height, Math.max(1, Math.floor(Math.sqrt(Math.fround(height)))));
    const xStep = Math.min(width, Math.max(1, Math.floor(Math.sqrt(Math.fround(width)))));

    const xSampleCount = Math.floor(Math.fround(width / xStep) + 0.5);
    const ySampleCount = Math.floor(Math.fround(height / yStep) + 0.5);

    let xOffset = Math.floor((width % xStep) / 2);
    let yOffset = Math.floor((height % yStep) / 2);
    if (xOffset === 0) xOffset = Math.floor(xStep / 2);
    if (yOffset === 0) yOffset = Math.floor(yStep / 2);

    let getPixel;
    switch (format)
    {
      case F.PIXEL_FORMAT_B8G8R8A8_UNORM: getPixel = (x, y) => ImageUtility.getPixelColor_BGRA(x, y, pitch, data); break;
      case F.PIXEL_FORMAT_B8G8R8X8_UNORM: getPixel = (x, y) => ImageUtility.getPixelColor_BGRX(x, y, pitch, data); break;
      case F.PIXEL_FORMAT_BC1_UNORM: getPixel = (x, y) => ImageUtility.getPixelColor_BC1(x, y, width, pitch, data); break;
      default: getPixel = (x, y) => ImageUtility.getPixelColor_BC3(x, y, width, pitch, data); break;
    }

    let rChannel = 0, gChannel = 0, bChannel = 0, aChannel = 0;

    for (let x = 0; x < xSampleCount; ++x)
    {
      for (let y = 0; y < ySampleCount; ++y)
      {
        if (x * xStep + xOffset >= width) continue;
        if (y * yStep + yOffset >= height) continue;

        const pixelValue = getPixel(x * xStep + xOffset, y * yStep + yOffset);
        rChannel += (pixelValue >>> 16) & 0xff;
        gChannel += (pixelValue >>> 8) & 0xff;
        bChannel += pixelValue & 0xff;
        aChannel += (pixelValue >>> 24) & 0xff;
      }
    }

    const multiplier = Math.fround(Math.fround(1 / (xSampleCount * ySampleCount)) / 255);

    return {
      r: Math.fround(rChannel * multiplier),
      g: Math.fround(gChannel * multiplier),
      b: Math.fround(bChannel * multiplier),
      a: Math.fround(aChannel * multiplier)
    };
  }

  /**
   * One pixel of mip 0 of a 2D image, as 0..1 floats (HostBitmap.cpp:1303-1357).
   * BGRX, BGRA, BC1 and BC3 only.
   *
   * adapted: returns `{r, g, b, a}`, or null where Carbon returns false.
   *
   * bug: the bounds test is `x > width || y > height` (1324), so `x == width`
   * is let through; and its R8 case (1332) can never run, because the format
   * guard above it rejects R8.
   *
   * @param {number} x Column.
   * @param {number} y Row.
   * @returns {{r: number, g: number, b: number, a: number}|null} The colour.
   */
  GetPixel(x, y)
  {
    if (!this.IsValid())
    {
      // Carbon: CCP_LOGERR("GetPixel: bitmap is not valid")
      return null;
    }

    if (this.GetType() !== TextureType.TEX_TYPE_2D) return null;

    const F = PixelFormat;
    const format = this.GetFormat();

    if (format !== F.PIXEL_FORMAT_B8G8R8X8_UNORM && format !== F.PIXEL_FORMAT_B8G8R8A8_UNORM &&
      format !== F.PIXEL_FORMAT_BC1_UNORM && format !== F.PIXEL_FORMAT_BC3_UNORM)
    {
      return null;
    }

    const width = this.GetWidth();
    const height = this.GetHeight();

    if (x > width || y > height)
    {
      // Carbon: CCP_LOGERR("GetPixel: pixel index out of range. Requested pixel (%d, %d), dimensions (%d, %d)")
      return null;
    }

    const pitch = this.GetPitch();
    const data = this._data;
    let pixelValue = 0;

    switch (format)
    {
      case F.PIXEL_FORMAT_B8G8R8A8_UNORM: pixelValue = ImageUtility.getPixelColor_BGRA(x, y, pitch, data); break;
      case F.PIXEL_FORMAT_B8G8R8X8_UNORM: pixelValue = ImageUtility.getPixelColor_BGRX(x, y, pitch, data); break;
      case F.PIXEL_FORMAT_BC1_UNORM: pixelValue = ImageUtility.getPixelColor_BC1(x, y, width, pitch, data); break;
      case F.PIXEL_FORMAT_BC3_UNORM: pixelValue = ImageUtility.getPixelColor_BC3(x, y, width, pitch, data); break;
      default: break;
    }

    return {
      r: Math.fround(((pixelValue >>> 16) & 0xff) / 255),
      g: Math.fround(((pixelValue >>> 8) & 0xff) / 255),
      b: Math.fround((pixelValue & 0xff) / 255),
      a: Math.fround(((pixelValue >>> 24) & 0xff) / 255)
    };
  }

}
