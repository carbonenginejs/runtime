import { exposure as be } from "#be";
// Source: trinity/trinity/Tr2HostBitmap.h
// Source: trinity/trinity/Tr2HostBitmap.cpp
// Source: trinity/trinity/Tr2HostBitmap_Blue.cpp
// Maintained promotion: native ImageIO storage replaces the generated model snapshots.
// Async saving and the explicit unimplemented Trinity methods remain unsupported.
import { CjsSchema, meta } from "#schema";
import { blue } from "#blue";
import { PixelFormat, TextureType, GetBytesPerPixel } from "#consts/render-context";
import { HostBitmap, LoadParameters } from "#imageio";
import * as CcpLog from "../../global/logging/ccpLog.js";
import { ALResult } from "../../trinityal/ALResult.js";
import { ImageIO } from "../../resource/imageio/ImageIO.js";
import { compressBitmapAsync } from "#resource/codecs/bcn";
import { Tr2TextureSubresource, Failed } from "#trinityal";
import { Tr2RenderContext_GetMainThreadRenderContext } from "./context/Tr2RenderContext.js";
import { createDdsBitmap } from "../../resource/formats/dds/ddsBitmap.js";

/**
 * Whether a pixel accessor may touch this bitmap: the guard Tr2HostBitmap::SetPixel, GetPixel,
 * CountPixelsOfValue and IsMonochrome open with (Tr2HostBitmap.cpp:576, 626, 654, 671).
 *
 * @param {Tr2HostBitmap} bitmap The bitmap.
 * @returns {boolean} Whether it is valid, uncompressed and four bytes per pixel.
 */
function isFourByteUncompressed(bitmap)
{
  return bitmap.IsValid() && GetBytesPerPixel(bitmap._format) === 4 && !bitmap.IsCompressed();
}

/**
 * `PyArg_ParseTuple( tuple, "iii" )` and `"ii"`: an array of exactly `count` 32-bit integers.
 *
 * Forced divergence: a failed parse leaves a Python exception pending in C++; JavaScript has no
 * pending-exception state, so the parse throws.
 *
 * @param {*} tuple The candidate tuple.
 * @param {number} count Required number of integers.
 * @returns {number[]} The integers.
 * @throws {TypeError} When it is not an array of `count` int32 values.
 */
function parseIntTuple(tuple, count)
{
  if (!Array.isArray(tuple) || tuple.length !== count || !tuple.every(value => Number.isInteger(value) && value >= -0x80000000 && value <= 0x7fffffff))
  {
    throw new TypeError(`Expected a tuple of ${count} integers`);
  }

  return tuple;
}

/** Describes a CPU-resident bitmap's dimensions, format, mip count, image type, and diagnostic name. */
export class Tr2HostBitmap extends HostBitmap
{

  /** Native bitmap format storage. */
  get format()
  {
    return this._format;
  }

  /** Native mip-zero width. */
  get width()
  {
    return this._width;
  }

  /** Native mip-zero height. */
  get height()
  {
    return this._height;
  }

  /** Native declared mip count. */
  get mipCount()
  {
    return this._mipCount;
  }

  /** Native texture dimensionality. */
  get imageType()
  {
    return this._type;
  }

  /** Native diagnostic name storage. */
  get name()
  {
    return this._name;
  }
  /** Sets the native diagnostic name. */
  set name(value)
  {
    this._name = value;
  }

  /**
   * Uses the inherited ImageIO bitmap allocation exposed by Tr2HostBitmap_Blue.cpp:453-459.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  Create(width, height, mipCount, format)
  {
    return super.Create(width, height, mipCount, format);
  }

  /**
   * Uses the inherited ImageIO cube allocation exposed by Tr2HostBitmap_Blue.cpp:461-466.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  CreateCube(width, mipCount, format)
  {
    return super.CreateCube(width, mipCount, format);
  }

  /**
   * Uses the inherited ImageIO volume allocation exposed by Tr2HostBitmap_Blue.cpp:468-475.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  CreateVolume(width, height, depth, mipCount, format)
  {
    return super.CreateVolume(width, height, depth, mipCount, format);
  }

  /**
   * Carbon method PopulateMargin (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  @meta.notImplemented
  PopulateMargin(...args)
  {
    throw new Error("Tr2HostBitmap.PopulateMargin is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method SaveAsync -> PySaveAsync (MAP_METHOD).
   *
   * @notImplemented
   */
  @be.mapMethod()
  @meta.notImplemented
  SaveAsync(...args)
  {
    throw new Error("Tr2HostBitmap.SaveAsync is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method WaitForSave (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  @meta.notImplemented
  WaitForSave(...args)
  {
    throw new Error("Tr2HostBitmap.WaitForSave is not implemented in CarbonEngineJS.");
  }

  /**
   * Relabels the pixel format without converting the bytes, for script.
   *
   * Carbon: Tr2HostBitmap::ChangeFormatFromScript (trinity/trinity/Tr2HostBitmap.cpp:31-34;
   * Tr2HostBitmap.h:57). Exposed as "ChangeFormat" (Tr2HostBitmap_Blue.cpp:652-659,
   * MAP_METHOD_AND_WRAP). It reports `ImageIO::HostBitmap::ChangeFormat` as an `ALResult`.
   *
   * @implemented
   * @param {number} format A `PixelFormat` value of the same byte size.
   * @returns {number} `ALResult.S_OK` when the label changed, otherwise `ALResult.E_FAIL`.
   */
  @be.mapMethodAndWrap("ChangeFormat")
  @meta.implemented
  ChangeFormatFromScript(format)
  {
    return this.ChangeFormat(format) ? ALResult.S_OK : ALResult.E_FAIL;
  }

  /**
   * Compress into the supplied texture through the shared DDS worker encoder.
   * Source: Tr2HostBitmap.cpp:512-557. Browser workers require an async result;
   * no source or output is changed before the complete encoding succeeds.
   * Approved extensions preserve all source mips and replace Carbon's LGPL
   * realtime encoders with MIT libsquish. DDS owns corrected BC2/BC5 mappings.
   *
   * @adapted
   * @param {number} compressionFormat Carbon compression mode.
   * @param {number} qualityLevel Carbon squish quality (or -1 for range fit).
   * @param {object} output TriTextureRes receiving the completed bitmap.
   * @param {object} [options] DDS worker options and cancellation signal.
   * @returns {Promise<boolean>} Whether the complete bitmap was published.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  async Compress(compressionFormat, qualityLevel, output, options = {})
  {
    if (!output || !this.IsValid() || this.GetType() !== TextureType.TEX_TYPE_2D) return false;
    try
    {
      const packet = await compressBitmapAsync({
        description: { type: this.GetType(), format: this.GetFormat(), width: this.GetWidth(),
          height: this.GetHeight(), depth: this.GetDepth(), mipCount: this.GetMipCount(), arraySize: this.GetArraySize() },
        data: this.GetRawData(), metadata: this.metadata ?? { cutout: {}, metadata: [] }
      }, compressionFormat, { ...options, quality: qualityLevel });
      if (options.signal?.aborted) return false;
      return output.CreateFromHostBitmap(createDdsBitmap(packet));
    }
    catch
    {
      return false;
    }
  }

  /**
   * Script form of `CreateFromFile`: answers a description of the image, or None.
   *
   * Carbon: Tr2HostBitmap::PyCreateFromFile (trinity/trinity/Tr2HostBitmap_Blue.cpp:157-197;
   * Tr2HostBitmap.h:78). Exposed as "CreateFromFile" (Tr2HostBitmap_Blue.cpp:603-607,
   * MAP_METHOD_AS_METHOD). Carbon ignores `CreateFromFile`'s result and tests `IsValid()`, so a
   * failed read answers None.
   *
   * Forced divergence: a Promise, as `CreateFromFile`. A Python `TypeError` is a thrown
   * `TypeError`; only a JavaScript string is a file path (no byte-string form exists).
   *
   * @adapted
   * @param {string} file Res path or file path of an image.
   * @returns {Promise<{Width: number, Height: number, Depth: number, MipLevels: number, Format: number, ResourceType: number, ImageFileFormat: number}|null>}
   *   The image description, or null when the bitmap is not valid.
   * @throws {TypeError} "Expected a filepath string" when `file` is not a string.
   */
  @be.mapMethodAsMethod("CreateFromFile")
  @meta.adapted
  async _PyCreateFromFile(file)
  {
    if (typeof file !== "string") throw new TypeError("Expected a filepath string");

    await this.CreateFromFile(file);

    if (!this.IsValid()) return null;

    return {
      Width: this.GetWidth(),
      Height: this.GetHeight(),
      Depth: this.GetDepth(),
      MipLevels: this.GetMipCount(),
      Format: this.GetFormat(),
      ResourceType: 0,
      ImageFileFormat: 0
    };
  }

  /**
   * Fills this bitmap from an image file.
   *
   * Carbon: Tr2HostBitmap::CreateFromFile (trinity/trinity/Tr2HostBitmap.cpp:486-510;
   * Tr2HostBitmap.h:41). Carbon destroys the bitmap, opens the file with
   * `BePaths->GetFileContentsWithYield` and decodes it with `ImageIO::ReadImage`; each failure
   * is logged and answered with false.
   *
   * Forced divergences: the result is a Promise, because a JavaScript file read and the PNG and
   * VTA decoders are asynchronous where Carbon's yield and its decoders block. The file is read
   * with `blue.paths.GetStreamFromPath` (bytes form), because `CjsBluePaths` does not provide
   * `GetFileContentsWithYield`; a file no file system has, a path with no protocol and a
   * protocol no file system serves are all Carbon's "Error opening file". The image is decoded by
   * `ImageIO.readImageAsync` with the handlers the host registered. Carbon's
   * `CleanupAsyncSave( false )` (cpp:488) is omitted: asynchronous saving (`SaveAsync`) is not
   * implemented, so no save can be pending.
   *
   * @adapted
   * @param {string} file Res path or file path of an image the registered handlers read.
   * @returns {Promise<boolean>} Whether the image was read into this bitmap.
   */
  @meta.adapted
  async CreateFromFile(file)
  {
    this.Destroy();

    if (!file) return false;

    let stream = null;
    try
    {
      stream = await blue.paths.GetStreamFromPath(file, { accept: [ "bytes" ] });
    }
    catch
    {
      stream = null;
    }

    if (stream === null)
    {
      CcpLog.CCP_LOGERR("Error opening file (%S)", file);
      return false;
    }

    const result = await ImageIO.readImageAsync(stream.data, new LoadParameters(file), this);

    if (!result.IsOk())
    {
      CcpLog.CCP_LOGERR("Error reading file (%S)", file);
      return false;
    }

    return true;
  }

  /**
   * Script `SetPixel`: `(x, y, value)` or one sequence of such tuples.
   *
   * Carbon: Tr2HostBitmap::PySetPixel (trinity/trinity/Tr2HostBitmap.cpp:710-736; Tr2HostBitmap.h:61).
   * Exposed as "SetPixel" (Tr2HostBitmap_Blue.cpp:636-639, MAP_METHOD_AS_METHOD), "[DEPRECATED]". Carbon
   * tells the forms apart by the argument-tuple size: one argument is a sequence, anything else is
   * the three of a single pixel.
   *
   * quirk: with three arguments the result of `SetPixelPy` is ignored, so an out-of-range pixel is
   * silently skipped. With a sequence, a failing tuple makes Carbon return NULL without a Python
   * exception set (cpp:731), which Python reports as a SystemError; here it throws an `Error`.
   *
   * @adapted
   * @param {...*} args `x, y, value`, or one sequence of `[x, y, value]` tuples.
   * @returns {null} None.
   * @throws {TypeError} "Expected sequence of tuples" when the single argument is not a sequence.
   * @throws {Error} When a tuple in the sequence is not written (NULL without an exception in C++).
   */
  @be.mapMethodAsMethod("SetPixel")
  @meta.adapted
  _PySetPixel(...args)
  {
    if (args.length !== 1)
    {
      this._SetPixelPy(args);
      return null;
    }

    const list = args[0];

    if (!Array.isArray(list)) throw new TypeError("Expected sequence of tuples");

    for (const tuple of list)
    {
      if (!this._SetPixelPy(tuple)) throw new Error("Tr2HostBitmap.PySetPixel: pixel not written (Carbon returns NULL without setting an exception).");
    }

    return null;
  }

  /**
   * Writes four bytes at a pixel of mip 0.
   *
   * Carbon: Tr2HostBitmap::SetPixel (trinity/trinity/Tr2HostBitmap.cpp:652-667; Tr2HostBitmap.h:49).
   * Only a valid, uncompressed, four-byte-per-pixel bitmap takes it. "Ugly methods to support old
   * code" (Tr2HostBitmap.h:48).
   *
   * bug: the bounds test is `x > m_width` and `y > m_height` (cpp:658-659), not `>=`, so
   * `x == width` writes the first pixel of the next row and `y == height` writes past the end of
   * the buffer. Reproduced. Forced divergence: C++ memcpy's the overrun into the heap; a
   * typed array drops the bytes that fall outside it, so that write has no effect.
   *
   * Forced divergence: Carbon takes `const void* data` and copies 4 bytes from it; here `data` is
   * the 32-bit value whose bytes are copied in little-endian order, which is what memcpy of an `int`
   * stores on x86, the layout the Python wrapper passes (cpp:690-696).
   *
   * @adapted
   * @param {number} x Column.
   * @param {number} y Row.
   * @param {number} data The 4-byte pixel value.
   * @returns {boolean} Whether the pixel was written.
   */
  @meta.adapted
  SetPixel(x, y, data)
  {
    if (!isFourByteUncompressed(this)) return false;

    if (x < 0 || x > this._width || y < 0 || y > this._height) return false;

    const offset = y * this._width * 4 + x * 4;
    const bytes = this._data;
    bytes[offset] = data & 0xff;
    bytes[offset + 1] = (data >>> 8) & 0xff;
    bytes[offset + 2] = (data >>> 16) & 0xff;
    bytes[offset + 3] = (data >>> 24) & 0xff;

    return true;
  }

  /**
   * Reads four bytes at a pixel of mip 0.
   *
   * Carbon: Tr2HostBitmap::GetPixel (trinity/trinity/Tr2HostBitmap.cpp:669-685; Tr2HostBitmap.h:50).
   * It hides `ImageIO::HostBitmap::GetPixel` (float4 out), which stays `GetPixel` here, so the
   * overload is named by its appended parameter, `data`.
   *
   * bug: the same `>` bounds test as `SetPixel` (cpp:675-676); `x == width` reads the next row's first
   * pixel and `y == height` reads past the buffer (here, 0).
   *
   * @adapted Carbon writes the 4 bytes through `void* data` and returns bool; this returns the bytes
   *   as a little-endian unsigned 32-bit value, or null where Carbon returns false.
   * @param {number} x Column.
   * @param {number} y Row.
   * @returns {number|null} The pixel value, or null.
   */
  @meta.adapted
  GetPixel__Data(x, y)
  {
    if (!isFourByteUncompressed(this)) return null;

    if (x < 0 || x > this._width || y < 0 || y > this._height) return null;

    const offset = y * this._width * 4 + x * 4;
    const bytes = this._data;

    return ((bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16) | ((bytes[offset + 3] ?? 0) << 24)) >>> 0;
  }

  /**
   * Writes one pixel from a script tuple `(x, y, value)`.
   *
   * Carbon: Tr2HostBitmap::SetPixelPy (trinity/trinity/Tr2HostBitmap.cpp:687-697; Tr2HostBitmap.h:59).
   * The tuple is parsed with "iii": three signed 32-bit integers.
   *
   * @adapted
   * @param {number[]} tuple `[x, y, value]`.
   * @returns {boolean} Whether the pixel was written.
   * @throws {TypeError} When the tuple is not three int32 values (a pending Python exception in C++).
   */
  @meta.adapted
  _SetPixelPy(tuple)
  {
    const [ x, y, value ] = parseIntTuple(tuple, 3);

    return this.SetPixel(x, y, value);
  }

  /**
   * Reads one pixel from a script tuple `(x, y)`; None when it cannot be read.
   *
   * Carbon: Tr2HostBitmap::GetPixelPy (trinity/trinity/Tr2HostBitmap.cpp:699-708; Tr2HostBitmap.h:60).
   * The value is a signed Python int (`int val`), so a pixel with the top bit set is negative.
   *
   * @adapted
   * @param {number[]} tuple `[x, y]`.
   * @returns {number|null} The pixel as a signed 32-bit integer, or null (None).
   * @throws {TypeError} When the tuple is not two int32 values (a pending Python exception in C++).
   */
  @meta.adapted
  _GetPixelPy(tuple)
  {
    const [ x, y ] = parseIntTuple(tuple, 2);
    const value = this.GetPixel__Data(x, y);

    return value === null ? null : value | 0;
  }

  /**
   * Script `GetPixel`: `(x, y)` or one sequence of such tuples.
   *
   * Carbon: Tr2HostBitmap::PyGetPixel (trinity/trinity/Tr2HostBitmap.cpp:738-771; Tr2HostBitmap.h:62).
   * Exposed as "GetPixel" (Tr2HostBitmap_Blue.cpp:641-644, MAP_METHOD_AS_METHOD), "[DEPRECATED]".
   * One argument is a sequence of tuples and answers a list of values; any other count is the two of
   * a single pixel.
   *
   * @adapted
   * @param {...*} args `x, y`, or one sequence of `[x, y]` tuples.
   * @returns {number|null|Array<number|null>} The value (null for None), or the list of values.
   * @throws {TypeError} "Expected sequence of tuples" when the single argument is not a sequence.
   */
  @be.mapMethodAsMethod("GetPixel")
  @meta.adapted
  _PyGetPixel(...args)
  {
    if (args.length !== 1) return this._GetPixelPy(args);

    const list = args[0];

    if (!Array.isArray(list)) throw new TypeError("Expected sequence of tuples");

    return list.map(tuple => this._GetPixelPy(tuple));
  }

  /**
   * Legacy script helper that fills a four-byte 2D bitmap with a background value and then sets
   * listed pixels.
   *
   * Carbon: Tr2HostBitmap::PySetPixels (trinity/trinity/Tr2HostBitmap.cpp:773-821; Tr2HostBitmap.h:63).
   * It is not in the exposure table (Tr2HostBitmap_Blue.cpp). A bitmap that is invalid, not four bytes
   * per pixel, not 2D or not single-mip answers None untouched.
   *
   * bug: the parse is "i|OO", so the pixel sequence is optional, yet `PySequence_Fast_GET_SIZE` is
   * read from the null result when it is omitted (cpp:803). Reproduced as a thrown `TypeError`, the
   * nearest to a crash that JavaScript has.
   *
   * @adapted
   * @param {number} background The 32-bit value written to every pixel first.
   * @param {Array<number[]>} pixels `[x, y, value]` tuples; pixels outside the bitmap are skipped.
   * @param {*} [_discard] Parsed by Carbon and never read.
   * @returns {null} None.
   * @throws {TypeError} When `pixels` is omitted or an entry is not three integers.
   */
  @meta.adapted
  _PySetPixels(background, pixels, _discard)
  {
    if (!this.IsValid() || GetBytesPerPixel(this._format) !== 4 || this._type !== TextureType.TEX_TYPE_2D || this.GetTrueMipCount() !== 1) return null;

    parseIntTuple([ background ], 1);

    for (let y = 0; y !== this._height; ++y)
    {
      for (let x = 0; x !== this._width; ++x)
      {
        this.SetPixel(x, y, background);
      }
    }

    if (!Array.isArray(pixels)) throw new TypeError("Expected sequence of tuples");

    for (const tuple of pixels)
    {
      if (!Array.isArray(tuple) || tuple.length !== 3 || !tuple.every(value => Number.isInteger(value)) || tuple[2] < 0 || tuple[2] > 0xffffffff)
      {
        throw new TypeError("Expected a tuple of integers (x, y, unsigned value)");
      }

      const [ x, y, value ] = tuple;

      if (x >= 0 && x < this._width && y >= 0 && y < this._height) this.SetPixel(x, y, value);
    }

    return null;
  }

  /**
   * Counts the pixels whose selected channels all equal a value.
   *
   * Carbon: Tr2HostBitmap::CountPixelsOfValue (trinity/trinity/Tr2HostBitmap.cpp:574-622;
   * Tr2HostBitmap.h:45). Exposed as "CountPixelsOfValue" (Tr2HostBitmap_Blue.cpp:591-596).
   * Channels are the characters of `channels` among 'r', 'g', 'b' and 'a', read from the raw 32-bit
   * value as 0xAARRGGBB; an empty selection counts every pixel.
   *
   * @implemented
   * @param {string} channels Any of the characters r, g, b, a.
   * @param {number} value The value each selected channel must equal.
   * @returns {number} The number of matching pixels; 0 for a bitmap that is not valid, uncompressed and four bytes per pixel.
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  CountPixelsOfValue(channels, value)
  {
    if (!isFourByteUncompressed(this)) return 0;

    const masks = [ [ "a", 0xff000000, 24 ], [ "r", 0x00ff0000, 16 ], [ "g", 0x0000ff00, 8 ], [ "b", 0x000000ff, 0 ] ]
      .filter(([ channel ]) => channels.includes(channel));
    let count = 0;

    for (let x = 0; x < this._width; x++)
    {
      for (let y = 0; y < this._height; y++)
      {
        const pixel = this.GetPixel__Data(x, y);

        if (pixel === null) continue;

        if (masks.every(([ , mask, shift ]) => ((pixel & mask) >>> shift) === value)) count++;
      }
    }

    return count;
  }

  /**
   * Whether red, green and blue are equal in every pixel.
   *
   * Carbon: Tr2HostBitmap::IsMonochrome (trinity/trinity/Tr2HostBitmap.cpp:624-650; Tr2HostBitmap.h:46).
   * Exposed as "IsMonochrome" (Tr2HostBitmap_Blue.cpp:598-601). Alpha is ignored.
   *
   * @implemented
   * @returns {boolean} False for a bitmap that is not valid, uncompressed and four bytes per pixel.
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  IsMonochrome()
  {
    if (!isFourByteUncompressed(this)) return false;

    for (let x = 0; x < this._width; x++)
    {
      for (let y = 0; y < this._height; y++)
      {
        const pixel = this.GetPixel__Data(x, y);

        if (pixel === null) continue;

        const red = (pixel & 0x00ff0000) >>> 16;

        if (((pixel & 0x0000ff00) >>> 8) !== red || (pixel & 0x000000ff) !== red) return false;
      }
    }

    return true;
  }

  /**
   * Carbon method CreateFromHeightData (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  @meta.notImplemented
  CreateFromHeightData(...args)
  {
    throw new Error("Tr2HostBitmap.CreateFromHeightData is not implemented in CarbonEngineJS.");
  }

  /**
   * Uses the inherited ImageIO crop exposed by Tr2HostBitmap_Blue.cpp:622-629.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  Crop(left, top, right, bottom)
  {
    return super.Crop(left, top, right, bottom);
  }

  /**
   * Uses the inherited ImageIO downsample exposed by Tr2HostBitmap_Blue.cpp:617-620.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  Downsample2x2()
  {
    return super.Downsample2x2();
  }

  /**
   * Carbon method IsSaveSucceeded (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  @meta.notImplemented
  IsSaveSucceeded(...args)
  {
    throw new Error("Tr2HostBitmap.IsSaveSucceeded is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method __init__ -> PyInit (MAP_METHOD).
   *
   * @notImplemented
   */
  @be.mapMethod()
  @meta.notImplemented
  __init__(...args)
  {
    throw new Error("Tr2HostBitmap.__init__ is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method IsSaveCompleted (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  @meta.notImplemented
  IsSaveCompleted(...args)
  {
    throw new Error("Tr2HostBitmap.IsSaveCompleted is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method IsSaving (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  @meta.notImplemented
  IsSaving(...args)
  {
    throw new Error("Tr2HostBitmap.IsSaving is not implemented in CarbonEngineJS.");
  }

  /**
   * Uses the inherited ImageIO storage-validity predicate exposed by the native Blue table.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  IsValid()
  {
    return super.IsValid();
  }

  /**
   * Uses the inherited ImageIO compression predicate exposed by the native Blue table.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  IsCompressed()
  {
    return super.IsCompressed();
  }

  /**
   * Script `GetRawData`: the bytes with their width, height and pitch, or false.
   *
   * Carbon: Tr2HostBitmap::PyGetRawData (trinity/trinity/Tr2HostBitmap_Blue.cpp:70-92;
   * Tr2HostBitmap.h:73). Exposed as "GetRawData" (Tr2HostBitmap_Blue.cpp:517-521, MAP_METHOD).
   *
   * Forced divergence: the Python memoryview becomes a writable `Uint8Array` view of the bytes, and
   * the C++ static (self, args) is an instance method.
   *
   * bug: the view is `GetHeight() * GetPitch()` bytes (Tr2HostBitmap_Blue.cpp:76), but a compressed format's pitch is
   * the bytes of one row of 4x4 blocks, so Carbon's view is four times the data. Reproduced as the
   * request; a `Uint8Array` view clamps to the buffer.
   *
   * @adapted
   * @returns {boolean|Array} `false` when the bitmap is not valid, otherwise `[view, width, height, pitch]`.
   */
  @be.mapMethod("GetRawData")
  @meta.adapted
  _PyGetRawData()
  {
    if (!this.IsValid()) return false;

    return [ this._data.subarray(0, this.GetHeight() * this.GetPitch()), this.GetWidth(), this.GetHeight(), this.GetPitch() ];
  }

  /**
   * Script `GetMipRawData`: one mip's bytes with its width, height and pitch, or false.
   *
   * Carbon: Tr2HostBitmap::PyGetMipRawData (trinity/trinity/Tr2HostBitmap_Blue.cpp:95-123;
   * Tr2HostBitmap.h:74). Exposed as "GetMipRawData" (Tr2HostBitmap_Blue.cpp:523-529, MAP_METHOD).
   * A missing or non-integer level answers false.
   *
   * bug: a level past the chain gives `GetMipRawData` a null pointer, which Carbon wraps in a
   * memoryview unchecked (Tr2HostBitmap_Blue.cpp:104). Forced divergence: here it throws a `RangeError`.
   *
   * @adapted
   * @param {number} mipLevel The mip level.
   * @returns {boolean|Array} `false`, or `[view, width, height, pitch]` of that level.
   * @throws {RangeError} When the level is outside the mip chain.
   */
  @be.mapMethod("GetMipRawData")
  @meta.adapted
  _PyGetMipRawData(mipLevel)
  {
    if (!this.IsValid()) return false;

    if (!Number.isInteger(mipLevel) || mipLevel < 0) return false;

    const bytes = this.GetMipRawData(mipLevel);

    if (bytes === null) throw new RangeError(`Tr2HostBitmap.PyGetMipRawData: mip level ${mipLevel} is outside the chain.`);

    return [ bytes.subarray(0, this.GetMipHeight(mipLevel) * this.GetMipPitch(mipLevel)), this.GetMipWidth(mipLevel), this.GetMipHeight(mipLevel), this.GetMipPitch(mipLevel) ];
  }

  /**
   * Script `SetMipRawData`: copies bytes into one mip.
   *
   * Carbon: Tr2HostBitmap::PySetMipRawData (trinity/trinity/Tr2HostBitmap_Blue.cpp:125-155;
   * Tr2HostBitmap.h:75). Exposed as "SetMipRawData" (Tr2HostBitmap_Blue.cpp:531-539, MAP_METHOD).
   * Python's `ValueError`s are thrown as `Error`s with the same messages.
   *
   * @adapted
   * @param {number} mipLevel The mip level.
   * @param {Uint8Array} buffer A writable buffer of at least the mip's size.
   * @returns {null} None.
   * @throws {Error} "invalid bitmap", "mip level out of range" or "buffer too small".
   */
  @be.mapMethod("SetMipRawData")
  @meta.adapted
  _PySetMipRawData(mipLevel, buffer)
  {
    if (!this.IsValid()) throw new Error("invalid bitmap");

    if (mipLevel >= this.GetTrueMipCount()) throw new Error("mip level out of range");

    const size = this.GetMipSize(mipLevel);

    if (buffer.length < size) throw new Error("buffer too small");

    this.GetMipRawData(mipLevel).set(buffer.subarray(0, size));

    return null;
  }

  /**
   * Declared and never defined.
   *
   * Carbon: Tr2HostBitmap::PyApplyConvFilter (trinity/trinity/Tr2HostBitmap.h:71). The header
   * declares it; no translation unit in the Carbon checkout defines it and no exposure row names it.
   *
   * @notUsed
   * @throws {Error} Always.
   */
  @meta.notUsed
  _PyApplyConvFilter()
  {
    throw new Error("Tr2HostBitmap.PyApplyConvFilter is declared in Carbon (Tr2HostBitmap.h:71) and never defined.");
  }

  /**
   * Carbon method Save -> PySave (MAP_METHOD).
   *
   * @notImplemented
   */
  @be.mapMethod()
  @meta.notImplemented
  Save(...args)
  {
    throw new Error("Tr2HostBitmap.Save is not implemented in CarbonEngineJS.");
  }

  /**
   * Tr2AsyncSave hook: nothing to prepare.
   *
   * Carbon: Tr2HostBitmap::DoPrepareAsyncSave (trinity/trinity/Tr2HostBitmap.cpp:472-475;
   * Tr2HostBitmap.h:81).
   *
   * @implemented
   * @returns {boolean} Always true.
   */
  @meta.implemented
  _DoPrepareAsyncSave()
  {
    return true;
  }

  /**
   * Tr2AsyncSave hook: saves the file on the worker.
   *
   * Carbon: Tr2HostBitmap::DoExecuteAsyncSave (trinity/trinity/Tr2HostBitmap.cpp:477-480;
   * Tr2HostBitmap.h:82). It is `Save( m_saveFilename )`; neither `Save` nor the `Tr2AsyncSave`
   * base that holds `m_saveFilename` (see resource/dropped/README.md) is ported.
   *
   * @notImplemented
   * @throws {Error} Always.
   */
  @meta.notImplemented
  _DoExecuteAsyncSave()
  {
    throw new Error("Tr2HostBitmap.DoExecuteAsyncSave is not implemented in CarbonEngineJS.");
  }

  /**
   * Tr2AsyncSave hook: nothing to clean up.
   *
   * Carbon: Tr2HostBitmap::DoCleanupAsyncSave (trinity/trinity/Tr2HostBitmap.cpp:482-484;
   * Tr2HostBitmap.h:83). The body is empty in Carbon.
   *
   * @implemented
   * @returns {void}
   */
  @meta.implemented
  _DoCleanupAsyncSave()
  {
  }

  /**
   * Script `CopyFromRenderTarget`.
   *
   * Carbon: Tr2HostBitmap::CopyFromRenderTargetPython (trinity/trinity/Tr2HostBitmap.cpp:46-54;
   * Tr2HostBitmap.h:53). Exposed as "CopyFromRenderTarget" (Tr2HostBitmap_Blue.cpp:477-481,
   * MAP_METHOD_AND_WRAP): false without a render target, else `CopyFromRenderTarget` on the
   * main-thread render context.
   *
   * @adapted awaited, as `CopyFromRenderTarget` is.
   * @param {Tr2RenderTarget|null} rt The render target to copy.
   * @returns {Promise<boolean>} Whether the copy succeeded.
   */
  @be.mapMethodAndWrap("CopyFromRenderTarget")
  @meta.adapted
  async _CopyFromRenderTargetPython(rt)
  {
    if (!rt) return false;
    return this.CopyFromRenderTarget(rt.GetRenderTarget(), Tr2RenderContext_GetMainThreadRenderContext());
  }

  /**
   * Copies a texture or render target into this 2D bitmap: every mip both
   * have, at the same size and format (B8G8R8X8 into B8G8R8A8 with alpha
   * set opaque).
   *
   * Carbon: Tr2HostBitmap::CopyFromRenderTarget (trinity/trinity/Tr2HostBitmap.cpp:36-39;
   * Tr2HostBitmap.h:30), through `SharedCopyFaceFromRenderTarget`. False for a bitmap that is not 2D.
   *
   * @adapted awaited. Carbon locks the texture and reads it synchronously; the
   *   browser can only read a GPU texture back asynchronously.
   * @param {Tr2TextureAL} rtAL The texture to copy, readable by the CPU.
   * @param {Tr2RenderContext} renderContext The render context the readback is issued on.
   * @returns {Promise<boolean>} Whether the copy succeeded.
   */
  @meta.adapted
  async CopyFromRenderTarget(rtAL, renderContext)
  {
    return this._type === TextureType.TEX_TYPE_2D ? this._SharedCopyFaceFromRenderTarget(0, rtAL, null, 0, 0, renderContext) : false;
  }

  /**
   * Copies a rectangle of a texture or render target into this 2D bitmap,
   * clipped to both. The offset places the source's origin, so the
   * rectangle's top-left pixel lands at (offsetX + left, offsetY + top)
   * (Tr2HostBitmap.cpp:97-98).
   *
   * Carbon: the source-rectangle Tr2HostBitmap::CopyFromRenderTarget overload
   * (trinity/trinity/Tr2HostBitmap.cpp:41-44; Tr2HostBitmap.h:31).
   *
   * @adapted awaited, as `CopyFromRenderTarget` is.
   * @param {Tr2TextureAL} rtAL The texture to copy, readable by the CPU.
   * @param {ArrayLike<number>} srcRect Source left, top, right and bottom, in pixels.
   * @param {number} offsetX Destination column of the source's column 0.
   * @param {number} offsetY Destination row of the source's row 0.
   * @param {Tr2RenderContext} renderContext The render context the readback is issued on.
   * @returns {Promise<boolean>} Whether the copy succeeded.
   */
  @meta.adapted
  async CopyFromRenderTarget__SrcRect(rtAL, srcRect, offsetX, offsetY, renderContext)
  {
    return this._type === TextureType.TEX_TYPE_2D ? this._SharedCopyFaceFromRenderTarget(0, rtAL, srcRect, offsetX, offsetY, renderContext) : false;
  }

  /**
   * Script `CopyFromRenderTargetRegion`.
   *
   * Carbon: Tr2HostBitmap::CopyFromRenderTargetRegionPython (trinity/trinity/Tr2HostBitmap.cpp:178-187;
   * Tr2HostBitmap.h:54). Exposed as "CopyFromRenderTargetRegion" (Tr2HostBitmap_Blue.cpp:483-493,
   * MAP_METHOD_AND_WRAP). Not implemented: it calls the source-rectangle `CopyFromRenderTarget`.
   *
   * @notImplemented
   * @throws {Error} Always.
   */
  @be.mapMethodAndWrap("CopyFromRenderTargetRegion")
  @meta.notImplemented
  _CopyFromRenderTargetRegionPython(...args)
  {
    throw new Error("Tr2HostBitmap.CopyFromRenderTargetRegionPython is not implemented in CarbonEngineJS.");
  }

  /**
   * Script `CopyFaceFromRenderTarget`.
   *
   * Carbon: Tr2HostBitmap::CopyFaceFromRenderTargetPython (trinity/trinity/Tr2HostBitmap.cpp:168-176;
   * Tr2HostBitmap.h:68). Exposed as "CopyFaceFromRenderTarget" (Tr2HostBitmap_Blue.cpp:495-500,
   * MAP_METHOD_AND_WRAP). Not implemented: it calls `CopyFaceFromRenderTarget`.
   *
   * @notImplemented
   * @throws {Error} Always.
   */
  @be.mapMethodAndWrap("CopyFaceFromRenderTarget")
  @meta.notImplemented
  _CopyFaceFromRenderTargetPython(...args)
  {
    throw new Error("Tr2HostBitmap.CopyFaceFromRenderTargetPython is not implemented in CarbonEngineJS.");
  }

  /**
   * Copies one face of a cube render target into the same face of this cube bitmap.
   *
   * Carbon: Tr2HostBitmap::CopyFaceFromRenderTarget (trinity/trinity/Tr2HostBitmap.cpp:56-59;
   * Tr2HostBitmap.h:32), through `SharedCopyFaceFromRenderTarget`. False for a bitmap that is not a cube.
   *
   * @adapted awaited, as `CopyFromRenderTarget` is.
   * @param {number} face The cube face (`CubemapFace`).
   * @param {Tr2TextureAL} rtAL The cube texture to copy, readable by the CPU.
   * @param {Tr2RenderContext} renderContext The render context the readback is issued on.
   * @returns {Promise<boolean>} Whether the copy succeeded.
   */
  @meta.adapted
  async CopyFaceFromRenderTarget(face, rtAL, renderContext)
  {
    return this._type === TextureType.TEX_TYPE_CUBE ? this._SharedCopyFaceFromRenderTarget(face, rtAL, null, 0, 0, renderContext) : false;
  }

  /**
   * Shared body of the render-target copies (Tr2HostBitmap.cpp:61-166): checks
   * the texture matches (size only without a source rectangle), clips the
   * rectangle and offset to both, then copies each mip both have, halving the
   * rectangle per level. B8G8R8X8 sources write alpha 255. A rectangle that
   * clips away entirely succeeds without copying.
   *
   * @adapted each mip is read through a `Tr2ReadbackAL` (`CreateReadback`,
   *   then an awaited `Map`), where Carbon locks the texture with
   *   `MapForReading` and reads it synchronously; the browser offers GPU
   *   readback only asynchronously. The readback's row pitch is padded to
   *   WebGPU's 256-byte alignment, which the copy honours as Carbon honours the
   *   locked pitch.
   * @param {number} face The cube face, or 0 for a 2D bitmap.
   * @param {Tr2TextureAL} rtAL The texture to copy, readable by the CPU.
   * @param {ArrayLike<number>|null} srcRect Source left, top, right and bottom, or null for the whole texture.
   * @param {number} offsetX Destination column of the source's left edge.
   * @param {number} offsetY Destination row of the source's top edge.
   * @param {Tr2RenderContext} renderContext The render context the readbacks are issued on.
   * @returns {Promise<boolean>} Whether the copy succeeded.
   */
  @meta.adapted
  async _SharedCopyFaceFromRenderTarget(face, rtAL, srcRect, offsetX, offsetY, renderContext)
  {
    const { match, alphaConvert } = this._CheckForMatch(rtAL.GetDesc(), srcRect === null, "CopyFromRenderTarget");
    if (!match) return false;
    if (!rtAL.IsValid() || this.IsCompressed())
    {
      CcpLog.CCP_LOGWARN_CH(CcpLog.GetModuleChannel("trinity"), "CopyFromRenderTarget: invalid source");
      return false;
    }

    let left = 0, top = 0, right = rtAL.GetWidth(), bottom = rtAL.GetHeight();
    if (srcRect)
    {
      left = Math.max(left, srcRect[0]);
      top = Math.max(top, srcRect[1]);
      right = Math.min(right, srcRect[2]);
      bottom = Math.min(bottom, srcRect[3]);
    }
    if (offsetX < 0)
    {
      left = Math.max(left, -offsetX);
      right = Math.min(right, rtAL.GetWidth() + offsetX);
    }
    if (offsetY < 0)
    {
      top = Math.max(top, -offsetY);
      bottom = Math.min(bottom, rtAL.GetHeight() + offsetY);
    }
    offsetX += left;
    offsetY += top;
    if (left >= right || top >= bottom || this._width < offsetX || this._height < offsetY) return true;

    let width = Math.min(right - left, this._width - offsetX);
    let height = Math.min(bottom - top, this._height - offsetY);
    const bytesPerPixel = GetBytesPerPixel(this._format);
    const mipCount = Math.min(this.GetTrueMipCount(), rtAL.GetTrueMipCount());
    for (let mipLevel = 0; mipLevel !== mipCount; ++mipLevel)
    {
      const region = this._type === TextureType.TEX_TYPE_CUBE
        ? Tr2TextureSubresource.create__FaceMipLevel(face, mipLevel)
        : Tr2TextureSubresource.create__MipLevel(mipLevel);
      const readback = rtAL.CreateReadback(region, renderContext);
      const mapped = await readback.Map(renderContext);
      if (Failed(mapped.result) || !mapped.data)
      {
        readback.Destruct();
        CcpLog.CCP_LOGWARN_CH(CcpLog.GetModuleChannel("trinity"), "SharedCopyFaceFromRenderTarget: failed to lock renderTarget level %d", mipLevel);
        return false;
      }

      const dstPitch = this.GetMipPitch(mipLevel);
      const srcPitch = mapped.pitch;
      const dst = this.GetMipRawData(mipLevel, face);
      let d = bytesPerPixel * offsetX + dstPitch * offsetY;
      let s = bytesPerPixel * left + srcPitch * top;
      for (let row = 0; row !== height; ++row, s += srcPitch, d += dstPitch)
      {
        if (alphaConvert)
        {
          for (let i = 0; i !== width; ++i)
          {
            dst[d + i * 4] = mapped.data[s + i * 4];
            dst[d + i * 4 + 1] = mapped.data[s + i * 4 + 1];
            dst[d + i * 4 + 2] = mapped.data[s + i * 4 + 2];
            dst[d + i * 4 + 3] = 0xff;
          }
        }
        else dst.set(mapped.data.subarray(s, s + width * bytesPerPixel), d);
      }
      readback.Destruct();

      width = Math.max(width >>> 1, 1);
      height = Math.max(height >>> 1, 1);
      offsetX >>>= 1;
      offsetY >>>= 1;
      left >>>= 1;
      top >>>= 1;
    }
    return true;
  }

  /**
   * Copies a texture into this bitmap.
   *
   * Carbon: Tr2HostBitmap::CopyFromTexture (trinity/trinity/Tr2HostBitmap.cpp:189-266;
   * Tr2HostBitmap.h:33). Not implemented: it locks the texture and reads its pixels back to the CPU,
   * which the browser only offers asynchronously.
   *
   * @notImplemented
   * @throws {Error} Always.
   */
  @meta.notImplemented
  CopyFromTexture(...args)
  {
    throw new Error("Tr2HostBitmap.CopyFromTexture is not implemented in CarbonEngineJS.");
  }

  /**
   * Script `CopyFromTextureRes`.
   *
   * Carbon: Tr2HostBitmap::CopyFromTextureResPython (trinity/trinity/Tr2HostBitmap.cpp:372-380;
   * Tr2HostBitmap.h:69). Exposed as "CopyFromTextureRes" (Tr2HostBitmap_Blue.cpp:502-506,
   * MAP_METHOD_AND_WRAP). Not implemented: it calls `CopyFromTextureRes`.
   *
   * @notImplemented
   * @throws {Error} Always.
   */
  @be.mapMethodAndWrap("CopyFromTextureRes")
  @meta.notImplemented
  _CopyFromTextureResPython(...args)
  {
    throw new Error("Tr2HostBitmap.CopyFromTextureResPython is not implemented in CarbonEngineJS.");
  }

  /**
   * Copies a `TriTextureRes` into this bitmap.
   *
   * Carbon: Tr2HostBitmap::CopyFromTextureRes (trinity/trinity/Tr2HostBitmap.cpp:268-370;
   * Tr2HostBitmap.h:34). Not implemented: it reads the texture back to the CPU.
   *
   * @notImplemented
   * @throws {Error} Always.
   */
  @meta.notImplemented
  CopyFromTextureRes(...args)
  {
    throw new Error("Tr2HostBitmap.CopyFromTextureRes is not implemented in CarbonEngineJS.");
  }

  /**
   * Uses the inherited ImageIO 3:4-strip volume conversion exposed by Tr2HostBitmap_Blue.cpp:631-634.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  ConvertToVolume()
  {
    return super.ConvertToVolume();
  }

  static PixelFormat = PixelFormat;

  static TextureType = TextureType;

}

CjsSchema.blue.define(Tr2HostBitmap, {
  className: "Tr2HostBitmap",
  members: [
    { name: "format", key: "_format", type: { kind: "int32" }, enum: { enumType: "trinity.ImageIO.PixelFormat" }, edit: { read: true } },
    { name: "width", key: "_width", type: { kind: "uint32" }, edit: { read: true } },
    { name: "height", key: "_height", type: { kind: "uint32" }, edit: { read: true } },
    { name: "mipCount", key: "_mipCount", type: { kind: "uint32" }, edit: { read: true } },
    { name: "imageType", key: "_type", type: { kind: "int32" }, enum: { enumType: "trinity.ImageIO.TextureType" }, edit: { read: true } },
    { name: "name", key: "_name", type: { kind: "string" }, edit: { read: true, write: true, persist: true } }
  ]
});
