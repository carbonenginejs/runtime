import { CjsFormat } from "./CjsFormat.js";
import { BitmapDimensions, HostBitmap, ImageIOResult, LoadParameters } from "#imageio";
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
 * `Format.carbon` IS Carbon's `ImageIO::ImageFormatFunctions`
 * (imageio/include/Tr2ImageHandler.h:74-80) - `checkExtension`, `readImage`,
 * `isSaveSupported`, `save` - built per subclass from its hooks, so the ImageIO
 * registry in resource/imageio can register any image format the way Carbon's
 * `RegisterImageIOHandlers` registers its handlers. Carbon has seven handlers;
 * we have more formats, and each one gets the table by extending this class.
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
 * from this one place (/docs/projects/hostbitmap-port.md).
 */
export class CjsImageFormat extends CjsFormat
{

  /**
   * Carbon's handler table for this format class, built once per subclass.
   *
   * @returns {{checkExtension: Function, readImage: Function, isSaveSupported: Function, save: Function}} The table.
   */
  static get carbon()
  {
    if (!Object.hasOwn(this, "_carbon"))
    {
      this._carbon = {
        checkExtension: extension => this.checkExtension(extension),
        readImage: (bytes, loadParameters, bitmap, metadata = null) => this.readImage(bytes, loadParameters, bitmap, metadata),
        isSaveSupported: dimensions => this.isSaveSupported(dimensions),
        save: (bitmap, metadata = null) => this.save(bitmap, metadata)
      };
    }

    return this._carbon;
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
    const result = this.readImageNative(bytes, loadParameters, bitmap, metadata);
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
   * browser may refuse a block format (/docs/projects/hostbitmap-port.md,
   * "Declared divergence"). Encoding to a block format is the next step.
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

}
