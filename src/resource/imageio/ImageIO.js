// Source: imageio/include/Tr2ImageHandler.h
// Source: imageio/Tr2ImageHandler.cpp
//
// Carbon's ImageIO entry points: a registry of per-format handler tables, and
// ReadImage / IsSaveSupported / SaveImage, which pick the handler by the
// filename's extension. It routes and never decodes: each image format's
// `Format.carbon` table does the work (resource/format/CjsImageFormat.js).
//
// A namespace of free functions becomes a class of statics, camelCase.
import { ImageIOResult } from "#imageio";
import { CjsDdsFormat } from "../formats/dds/CjsDdsFormat.js";
import { CjsGifFormat } from "../formats/gif/CjsGifFormat.js";
import { CjsJpegFormat } from "../formats/jpeg/CjsJpegFormat.js";
import { CjsPngFormat } from "../formats/png/CjsPngFormat.js";
import { CjsTgaFormat } from "../formats/tga/CjsTgaFormat.js";

const Code = ImageIOResult.Code;

/** Registered handler tables, first match wins (GetImageHandlers). */
const handlers = [];

let registered = false;


/** Carbon's `ImageIO` registry and entry points (imageio/Tr2ImageHandler.cpp). */
export class ImageIO
{

  /**
   * Register the built-in image formats once (Tr2ImageHandler.cpp:26-42).
   * Carbon registers Bmp, Dds, Jpeg, Png, Psd, Tga and Vta; ours register as
   * each format gains its `carbon` table.
   */
  static registerImageIOHandlers()
  {
    if (registered) return;

    registered = true;
    // Carbon's order (Bmp, Dds, Jpeg, Png, Psd, Tga, Vta) for the ones we have, then ours.
    ImageIO.registerImageHandler(CjsDdsFormat.carbon);
    ImageIO.registerImageHandler(CjsJpegFormat.carbon);
    ImageIO.registerImageHandler(CjsPngFormat.carbon);
    ImageIO.registerImageHandler(CjsTgaFormat.carbon);
    ImageIO.registerImageHandler(CjsGifFormat.carbon);
  }

  /**
   * Register a handler table (Tr2ImageHandler.cpp:79-82).
   *
   * @param {{checkExtension: Function, readImage: Function, isSaveSupported: Function, save: Function}} imageHandler Handler table.
   */
  static registerImageHandler(imageHandler)
  {
    handlers.push(imageHandler);
  }

  /**
   * The text after the last '.', or "" (Tr2ImageHandler.cpp:45-49).
   *
   * @param {string} filename File name.
   * @returns {string} Extension.
   */
  static getExtension(filename)
  {
    const dot = filename.lastIndexOf(".");

    return dot >= 0 ? filename.slice(dot + 1) : "";
  }

  /**
   * The first handler that claims an extension, or null (Tr2ImageHandler.cpp:51-63).
   *
   * @param {string} extension Extension, without the dot.
   * @returns {object|null} Handler table.
   */
  static getImageHandler(extension)
  {
    ImageIO.registerImageIOHandlers();

    return handlers.find(handler => handler.checkExtension(extension)) ?? null;
  }

  /**
   * Read an image into a bitmap, picking the handler by the filename in the
   * load parameters (Tr2ImageHandler.cpp:95-106).
   *
   * adapted: a stream becomes the file's bytes.
   *
   * @param {Uint8Array|ArrayBuffer} bytes File bytes.
   * @param {import("#imageio").LoadParameters} loadParameters Load parameters.
   * @param {import("#imageio").HostBitmap} bitmap Destination bitmap.
   * @param {import("#imageio").Metadata|null} [metadata] Optional metadata out.
   * @returns {ImageIOResult} The result.
   */
  static readImage(bytes, loadParameters, bitmap, metadata = null)
  {
    const handler = ImageIO.getImageHandler(ImageIO.getExtension(loadParameters.filename));

    if (!handler) return new ImageIOResult(Code.UNRECOGNIZED_IMAGE_TYPE);

    return handler.readImage(bytes, loadParameters, bitmap, metadata);
  }

  /**
   * `readImage` that also serves formats whose decoder is asynchronous (PNG).
   *
   * Not Carbon: see CjsImageFormat.readImageAsync.
   *
   * @param {Uint8Array|ArrayBuffer} bytes File bytes.
   * @param {import("#imageio").LoadParameters} loadParameters Load parameters.
   * @param {import("#imageio").HostBitmap} bitmap Destination bitmap.
   * @param {import("#imageio").Metadata|null} [metadata] Optional metadata out.
   * @returns {Promise<ImageIOResult>} The result.
   */
  static async readImageAsync(bytes, loadParameters, bitmap, metadata = null)
  {
    const handler = ImageIO.getImageHandler(ImageIO.getExtension(loadParameters.filename));

    if (!handler) return new ImageIOResult(Code.UNRECOGNIZED_IMAGE_TYPE);

    return handler.readImageAsync(bytes, loadParameters, bitmap, metadata);
  }

  /**
   * Whether an image of these dimensions can be saved under a filename
   * (Tr2ImageHandler.cpp:117-128).
   *
   * @param {string} filename Destination file name.
   * @param {import("#imageio").BitmapDimensions} dimensions Image description.
   * @returns {ImageIOResult} OK if supported.
   */
  static isSaveSupported(filename, dimensions)
  {
    const handler = ImageIO.getImageHandler(ImageIO.getExtension(filename));

    if (!handler) return new ImageIOResult(Code.UNRECOGNIZED_IMAGE_TYPE);

    return handler.isSaveSupported(dimensions);
  }

  /**
   * Save a bitmap in the format a filename names (Tr2ImageHandler.cpp:140-151).
   *
   * adapted: Carbon writes to a stream; this returns `{result, bytes}`.
   *
   * @param {string} filename Destination file name.
   * @param {import("#imageio").HostBitmap} bitmap Bitmap to save.
   * @param {import("#imageio").Metadata|null} [metadata] Optional metadata.
   * @returns {{result: ImageIOResult, bytes: Uint8Array|null}} The outcome.
   */
  static saveImage(filename, bitmap, metadata = null)
  {
    const handler = ImageIO.getImageHandler(ImageIO.getExtension(filename));

    if (!handler) return { result: new ImageIOResult(Code.UNRECOGNIZED_IMAGE_TYPE), bytes: null };

    return handler.save(bitmap, metadata);
  }

}
