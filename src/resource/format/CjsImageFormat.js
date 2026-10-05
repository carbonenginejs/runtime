import { CjsFormat } from "./CjsFormat.js";
import { asUint8Array } from "#utils/bytes";
import { BitmapDimensions, Cutout, HostBitmap, ImageIOResult, LoadParameters } from "#imageio";
import { IsCompressedFormat, PixelFormat, PixelFormatFromCanonical } from "#consts/render-context";
import { canDecodeDdsBlockFormat, decodeDdsSlice } from "../formats/dds/core/helpers.js";

/** PixelFormat -> the block decoders' format string (the inverse of PixelFormatFromCanonical). */
const CANONICAL_BY_PIXEL_FORMAT = new Map(Object.entries(PixelFormatFromCanonical).map(([ name, value ]) => [ value, name ]));

/** sRGB block formats decode to the sRGB variant of RGBA8; everything else to linear. */
const SRGB_BLOCK_FORMATS = new Set([
  PixelFormat.PIXEL_FORMAT_BC1_UNORM_SRGB,
  PixelFormat.PIXEL_FORMAT_BC2_UNORM_SRGB,
  PixelFormat.PIXEL_FORMAT_BC3_UNORM_SRGB,
  PixelFormat.PIXEL_FORMAT_BC7_UNORM_SRGB
]);

/**
 * The base of every image format: it gives each subclass Carbon's image-handler
 * table and the step that turns a native read into the format a caller asked
 * for.
 *
 * The format class's statics ARE Carbon's `ImageIO::ImageFormatFunctions`
 * (imageio/include/Tr2ImageHandler.h:74-80) - `checkExtension`, `readImage`,
 * `isSaveSupported`, `save`. The orchestrator registers the class with
 * `ImageIO.registerImageHandler`, and ImageIO calls those statics directly.
 *
 * A subclass supplies:
 * - `static extensions` (already declared by every format) for checkExtension;
 * - `static readImageNative(bytes, loadParameters, bitmap, metadata)`, which
 *   fills the bitmap it is handed in its natural format and returns an
 *   ImageIOResult. It calls methods on the bitmap; it never imports HostBitmap.
 *
 * NOT CARBON: `LoadParameters.requestedFormat`. When a caller asks for a format
 * other than the native one, `readImage` converts after the native read
 * (`convertImage`): HostBitmap's own ConvertFormat, then block decode. Encoding
 * to a block format is the next step here, so every image format inherits it
 * from this one place.
 */
/** Media type per identified image container. */
const IMAGE_MIME_TYPES = Object.freeze({
    png: "image/png",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    tga: "image/x-tga",
    dds: "image/vnd-ms.dds"
});

export class CjsImageFormat extends CjsFormat
{

  /**
   * Media type for an identified container.
   *
   * @param {string} sourceFormat Identified container name.
   * @returns {string} Media type, or the generic binary type when unknown.
   */
  static imageMimeType(sourceFormat)
  {
    return IMAGE_MIME_TYPES[sourceFormat] || "application/octet-stream";
  }

  /**
   * The `raw` support variant every image reader offers: handing back the
   * undecoded bytes always works.
   *
   * @param {object} metadata Inspection record carrying `sourceFormat`.
   * @returns {object} The raw variant descriptor.
   */
  static rawVariant(metadata)
  {
    return {
      kind: "raw",
      codec: metadata.sourceFormat,
      mimeType: CjsImageFormat.imageMimeType(metadata.sourceFormat),
      supported: true
    };
  }

  /** Registered name; `constructor.name` does not survive minification. */
  static className = "CjsImageFormat";

  /**
   * The bytes of a sniff candidate, or null when the input is not binary. Never
   * throws: `is` must answer false on garbage rather than fail.
   *
   * @param {*} bytes Candidate input.
   * @returns {Uint8Array|null} A view, or null.
   */
  static sniffBytes(bytes)
  {
    try
    {
      return asUint8Array(bytes, "Image input");
    }
    catch
    {
      return null;
    }
  }

  /**
   * Whether a filename ends in one of this format's extensions: Carbon's
   * CheckExtension on the text after the last '.' (Tr2ImageHandler.cpp:45-49).
   *
   * @param {string|null} filename Resource path, or null.
   * @returns {boolean} False for a missing filename.
   */
  static filenameMatches(filename)
  {
    if (typeof filename !== "string") return false;

    const dot = filename.lastIndexOf(".");

    return dot >= 0 && this.checkExtension(filename.slice(dot + 1));
  }

  /**
   * Whether an extension (without the dot) is one of this format's, case-insensitively.
   *
   * @param {string} extension Extension.
   * @returns {boolean} Whether this format reads it.
   */
  static checkExtension(extension)
  {
    const wanted = `.${extension.toLowerCase()}`;

    return this.extensions.includes(wanted);
  }

  /**
   * Fill `bitmap` in the format's natural pixel format. Every image format
   * implements this.
   *
   * @param {Uint8Array} _bytes File bytes.
   * @param {LoadParameters} _loadParameters Load parameters.
   * @param {object} _bitmap Destination HostBitmap.
   * @param {object|null} _metadata Optional Metadata out.
   * @returns {ImageIOResult} The result.
   */
  static readImageNative(_bytes, _loadParameters, _bitmap, _metadata)
  {
    throw new Error(`${this.name}.readImageNative is not implemented`);
  }

  /**
   * Fill a bitmap from one of our readers' RGBA8 outputs (`read(bytes, { emit: "rgba" })`),
   * for the formats whose decoders already produce one: PNG, JPEG, TGA, GIF.
   *
   * The bitmap is a single-mip 2D B8G8R8A8_UNORM image, as Carbon's JPEG handler
   * and its PNG/TGA handlers for images with alpha produce, and as the texture
   * pipeline's pack step requires of its inputs (BGRA, BGRX or R8).
   *
   * adapted: Carbon's PNG/TGA handlers keep an opaque RGB image as BGRX and a
   * grey one as R8 (Tr2PngHandler.cpp:125-160, Tr2TgaHandler.cpp:98-110); our
   * decoders report RGBA only, so those arrive as BGRA with their alpha. The
   * metadata cutout is the default: the PNG cutout chunk is not read yet.
   *
   * @param {object} payload An RGBA8 payload: width, height, data, strideBytes.
   * @param {object} bitmap Destination HostBitmap.
   * @param {object|null} [metadata] Optional Metadata out.
   * @returns {ImageIOResult} The result.
   */
  static readImageFromRgbaPayload(payload, bitmap, metadata = null)
  {
    if (!(payload.data instanceof Uint8Array))
    {
      return new ImageIOResult(ImageIOResult.Code.HEADER_NOT_SUPPORTED, `${payload.pixelFormat} is not an 8-bit image`);
    }

    if (!bitmap.Create(payload.width, payload.height, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM))
    {
      return new ImageIOResult(ImageIOResult.Code.ERROR_CREATING_BITMAP);
    }

    const dst = bitmap.GetRawData();
    const row = payload.width * 4;
    const stride = payload.strideBytes || row;

    for (let y = 0; y < payload.height; y++)
    {
      dst.set(payload.data.subarray(y * stride, y * stride + row), y * row);
    }

    bitmap.ConvertFormat(PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);

    if (metadata) metadata.cutout = new Cutout();

    return new ImageIOResult(ImageIOResult.Code.OK);
  }

  /**
   * The asynchronous native read. Defaults to the synchronous one; a format
   * whose decoder is asynchronous (PNG, which inflates through the browser's
   * DecompressionStream) overrides this instead.
   *
   * @param {Uint8Array} bytes File bytes.
   * @param {LoadParameters} loadParameters Load parameters.
   * @param {object} bitmap Destination HostBitmap.
   * @param {object|null} metadata Optional Metadata out.
   * @returns {Promise<ImageIOResult>} The result.
   */
  static async readImageNativeAsync(bytes, loadParameters, bitmap, metadata)
  {
    return this.readImageNative(bytes, loadParameters, bitmap, metadata);
  }

  /**
   * `readImage` for any image format, including those whose decoder is
   * asynchronous.
   *
   * Not Carbon: Carbon's ReadImage is synchronous because its zlib is. In a
   * browser, inflation is DecompressionStream, which has only an asynchronous
   * API, so PNG cannot answer the synchronous call. Resource loading is
   * asynchronous anyway; every format answers this one.
   *
   * @param {Uint8Array} bytes File bytes.
   * @param {LoadParameters} loadParameters Load parameters.
   * @param {object} bitmap Destination HostBitmap.
   * @param {object|null} [metadata] Optional Metadata out.
   * @returns {Promise<ImageIOResult>} The result.
   */
  static async readImageAsync(bytes, loadParameters, bitmap, metadata = null)
  {
    const result = await this.readImageNativeAsync(bytes, loadParameters, bitmap, metadata);

    return this._finishRead(result, loadParameters, bitmap);
  }

  /**
   * Read an image into `bitmap`, then convert it to `loadParameters.requestedFormat`
   * when one is asked for.
   *
   * @param {Uint8Array} bytes File bytes.
   * @param {LoadParameters} loadParameters Load parameters.
   * @param {object} bitmap Destination HostBitmap.
   * @param {object|null} [metadata] Optional Metadata out.
   * @returns {ImageIOResult} The result.
   */
  static readImage(bytes, loadParameters, bitmap, metadata = null)
  {
    return this._finishRead(this.readImageNative(bytes, loadParameters, bitmap, metadata), loadParameters, bitmap);
  }

  /** The conversion to the requested format, shared by both reads. */
  static _finishRead(result, loadParameters, bitmap)
  {
    if (!result.IsOk()) return result;

    const requested = loadParameters.requestedFormat;

    if (requested === null || requested === bitmap.GetFormat()) return result;

    if (!this.convertImage(bitmap, requested))
    {
      return new ImageIOResult(ImageIOResult.Code.ERROR_CONVERTING_FORMAT,
        `cannot convert pixel format ${bitmap.GetFormat()} to ${requested} yet`);
    }

    return result;
  }

  /**
   * Convert a bitmap in place to a pixel format, for every image format.
   *
   * First HostBitmap's own conversions (Carbon's ConvertFormat); then, for
   * block-compressed data, a decode of every mip of every array element (and
   * every slice of a volume) to RGBA8 - or RGBA32F for BC6H - followed by
   * Carbon's conversion from there when the request was, say, BGRA. sRGB is
   * kept: an sRGB block format decodes to R8G8B8A8_UNORM_SRGB.
   *
   * Not Carbon: D3D takes block formats directly, so Carbon never decodes. A
   * browser may refuse a block format, so this decodes instead. Encoding to a block format is the next step.
   *
   * @param {HostBitmap} bitmap Bitmap to convert in place.
   * @param {number} requested A `PixelFormat` value.
   * @returns {boolean} Whether the bitmap is now in the requested format.
   */
  static convertImage(bitmap, requested)
  {
    if (bitmap.ConvertFormat(requested)) return true;

    const source = bitmap.GetFormat();
    const name = CANONICAL_BY_PIXEL_FORMAT.get(source);

    if (!IsCompressedFormat(source) || !canDecodeDdsBlockFormat(name)) return false;

    const decoded = this.decodeBlocks(bitmap, name);
    if (!decoded) return false;

    if (decoded.GetFormat() !== requested && !decoded.ConvertFormat(requested)) return false;

    bitmap.Swap(decoded);

    return true;
  }

  /**
   * Decode a block-compressed bitmap into a new uncompressed one.
   *
   * @param {HostBitmap} bitmap Block-compressed source.
   * @param {string} name The source's block format string, e.g. "bc7-rgba-unorm".
   * @returns {HostBitmap|null} The decoded bitmap.
   */
  static decodeBlocks(bitmap, name)
  {
    const isFloat = name.startsWith("bc6h-");
    const format = isFloat
      ? PixelFormat.PIXEL_FORMAT_R32G32B32A32_FLOAT
      : (SRGB_BLOCK_FORMATS.has(bitmap.GetFormat()) ? PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM_SRGB : PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);

    const target = new HostBitmap();
    const created = target.CreateFromBitmapDimensions(new BitmapDimensions({
      type: bitmap.GetType(),
      format,
      width: bitmap.GetWidth(),
      height: bitmap.GetHeight(),
      depth: bitmap.GetDepth(),
      mipCount: bitmap.GetMipCount(),
      arraySize: bitmap.GetArraySize()
    }));

    if (!created) return null;

    const mips = bitmap.GetTrueMipCount();

    for (let element = 0; element < bitmap.GetArraySize(); element++)
    {
      for (let mip = 0; mip < mips; mip++)
      {
        const width = Math.max(bitmap.GetWidth() >>> mip, 1);
        const height = Math.max(bitmap.GetHeight() >>> mip, 1);
        const depth = bitmap.GetMipDepth(mip);
        const sliceBytes = bitmap.GetMipSize(mip) / depth;
        const rowPitch = bitmap.GetMipPitch(mip);
        const src = bitmap.GetMipRawData(mip, element);
        const dst = target.GetMipRawData(mip, element);
        const dstSlice = target.GetMipSize(mip) / depth;

        for (let slice = 0; slice < depth; slice++)
        {
          const pixels = decodeDdsSlice(src.subarray(slice * sliceBytes, (slice + 1) * sliceBytes), { width, height, pixelFormat: name }, { rowPitch });
          dst.set(new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength), slice * dstSlice);
        }
      }
    }

    return target;
  }

  /**
   * Whether this format can save a bitmap of these dimensions. Formats that
   * write override this.
   *
   * @param {object} _dimensions BitmapDimensions.
   * @returns {ImageIOResult} METHOD_NOT_SUPPORTED unless overridden.
   */
  static isSaveSupported(_dimensions)
  {
    return new ImageIOResult(ImageIOResult.Code.METHOD_NOT_SUPPORTED);
  }

  /**
   * Save a bitmap. Formats that write override this.
   *
   * adapted: Carbon writes to a stream; this returns `{result, bytes}`.
   *
   * @param {object} _bitmap HostBitmap.
   * @param {object|null} _metadata Optional Metadata.
   * @returns {{result: ImageIOResult, bytes: Uint8Array|null}} The outcome.
   */
  static save(_bitmap, _metadata = null)
  {
    return { result: new ImageIOResult(ImageIOResult.Code.METHOD_NOT_SUPPORTED), bytes: null };
  }

  /**
   * The save-side twin of `_finishRead`: Carbon's dimension check, then one
   * conversion to the 8-bit RGBA every encoder here takes.
   *
   * Carbon's PNG, JPEG and TGA handlers refuse pixel formats they cannot store
   * (Tr2TgaHandler.cpp:723-738 and :770-784; Tr2PngHandler.cpp:511-533;
   * Tr2JpgHandler.cpp:383-400). Ours converts instead, through `convertImage`,
   * so block-compressed, float and 16-bit bitmaps save too. A format answers
   * OK for any convertible bitmap of a texture type Carbon's handler accepts,
   * with one array element, as Carbon checks first.
   *
   * @param {object} dimensions BitmapDimensions or HostBitmap.
   * @param {number[]} textureTypes The `TextureType` values Carbon's handler accepts.
   * @returns {ImageIOResult} OK, or SAVE_NOT_SUPPORTED.
   */
  static _isConvertibleSave(dimensions, textureTypes)
  {
    const supported = textureTypes.includes(dimensions.GetType())
      && dimensions.GetArraySize() === 1
      && CjsImageFormat._canConvertForSave(dimensions.GetFormat());

    return new ImageIOResult(supported ? ImageIOResult.Code.OK : ImageIOResult.Code.SAVE_NOT_SUPPORTED);
  }

  /**
   * Whether a pixel format converts to RGBA8, answered by converting a 4x4
   * bitmap of it with the same `convertImage` a save uses, so the answer cannot
   * drift from what a save does. Remembered per format.
   *
   * @param {number} format A `PixelFormat` value.
   * @returns {boolean} Whether a save of this format can be encoded.
   */
  static _canConvertForSave(format)
  {
    if (CjsImageFormat._SAVE_FORMATS.has(format)) return true;

    const known = CjsImageFormat._saveConvertible.get(format);
    if (known !== undefined) return known;

    const probe = new HostBitmap();
    const convertible = probe.Create(4, 4, 1, format)
      && CjsImageFormat.convertImage(probe, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);

    CjsImageFormat._saveConvertible.set(format, Boolean(convertible));
    return Boolean(convertible);
  }

  /** Pixel formats already in the encoders' 8-bit RGBA layout; sRGB differs only in meaning. */
  static _SAVE_FORMATS = new Set([ PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM_SRGB ]);

  /** `_canConvertForSave` answers, by pixel format. */
  static _saveConvertible = new Map();

  /**
   * Checks and converts a bitmap for saving, leaving the caller's bitmap as it
   * was: a format that needs converting is copied (mip 0, the image a PNG, JPEG
   * or TGA holds) and the copy converted.
   *
   * @param {HostBitmap} bitmap The bitmap to save.
   * @returns {{result: ImageIOResult, payload: {width: number, height: number, data: Uint8Array, strideBytes: number}|null}}
   *   The RGBA payload the encoders take, or the failure.
   */
  static _convertForSave(bitmap)
  {
    if (!bitmap.IsValid())
    {
      return { result: new ImageIOResult(ImageIOResult.Code.INVALID_BITMAP), payload: null };
    }

    const supported = this.isSaveSupported(bitmap);
    if (!supported.IsOk()) return { result: supported, payload: null };

    let source = bitmap;

    if (!CjsImageFormat._SAVE_FORMATS.has(bitmap.GetFormat()))
    {
      source = new HostBitmap();
      source.CreateFromBitmapDimensions(new BitmapDimensions({
        type: bitmap.GetType(),
        format: bitmap.GetFormat(),
        width: bitmap.GetWidth(),
        height: bitmap.GetHeight(),
        depth: 1,
        mipCount: 1,
        arraySize: 1
      }));
      source.GetMipRawData(0).set(bitmap.GetMipRawData(0).subarray(0, source.GetMipRawData(0).length));

      if (!CjsImageFormat.convertImage(source, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM))
      {
        return { result: new ImageIOResult(ImageIOResult.Code.ERROR_CONVERTING_FORMAT), payload: null };
      }
    }

    return {
      result: new ImageIOResult(ImageIOResult.Code.OK),
      payload: { width: source.GetWidth(), height: source.GetHeight(), data: source.GetMipRawData(0), strideBytes: source.GetMipPitch(0) }
    };
  }

}
