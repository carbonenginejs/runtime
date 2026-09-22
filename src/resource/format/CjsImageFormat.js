import { CjsFormat } from "./CjsFormat.js";
import { ImageIOResult, LoadParameters } from "#imageio";

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
 * other than the native one, `readImage` converts after the native read. Today
 * that is HostBitmap's own ConvertFormat; block decode and encode are the next
 * step here, so every image format inherits them from this one place
 * (/docs/projects/hostbitmap-port.md).
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

    if (requested !== null && requested !== bitmap.GetFormat() && !bitmap.ConvertFormat(requested))
    {
      return new ImageIOResult(ImageIOResult.Code.ERROR_CONVERTING_FORMAT,
        `cannot convert pixel format ${bitmap.GetFormat()} to ${requested} yet`);
    }

    return result;
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
