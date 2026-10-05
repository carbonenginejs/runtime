// Source: imageio/include/Tr2ImageHandler.h
// Source: imageio/Tr2ImageHandler.cpp
// A namespace of free functions becomes a class of statics, camelCase.
import { ImageIOResult } from "#imageio";
import { CjsSchema, meta } from "#schema";

const Code = ImageIOResult.Code;

/**
 * Carbon's ImageIO entry points, over a handler table the caller fills.
 *
 * Adapted: Carbon registers every handler it compiled (RegisterImageIOHandlers,
 * Tr2ImageHandler.cpp:26-42). Ours registers only what the orchestrator hands
 * it through `registerImageHandler`, so a page imports only the codecs it uses.
 * ImageIO imports no format, and neither Blue nor ResMan: a tool or converter
 * that only decodes registers formats here alone. See /docs
 * architecture/format-ownership.md § "Start-up: probe, decide, register, then load".
 */
export class ImageIO
{
  /**
   * Registered image formats, in registration order: Carbon's handler vector
   * (GetImageHandlers, Tr2ImageHandler.cpp:20-24).
   *
   * @type {Function[]}
   */
  static _imageHandlers = [];

  /**
   * Registers an image format (Tr2ImageHandler.cpp:75-78).
   *
   * Adapted: Carbon appends the handler's function table; ours appends the format
   * class, whose statics are that table. Registering a format twice keeps one
   * entry, as each Carbon handler's own `s_registered` guard does
   * (e.g. Tr2PngHandler.cpp:435-444).
   *
   * @param {Function} Format A CjsImageFormat subclass.
   * @returns {void}
   */
  static registerImageHandler(Format)
  {
    if (typeof Format !== "function" || typeof Format.checkExtension !== "function")
    {
      throw new TypeError("ImageIO.registerImageHandler requires an image format class.");
    }
    if (!ImageIO._imageHandlers.includes(Format)) ImageIO._imageHandlers.push(Format);
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
   * The first registered format whose checkExtension accepts the extension, or
   * null (Tr2ImageHandler.cpp:51-63).
   *
   * @param {string} extension Extension, without the dot.
   * @returns {object|null} Handler table.
   */
  static getImageHandler(extension)
  {
    for (const Format of ImageIO._imageHandlers)
    {
      if (Format.checkExtension(extension)) return Format.carbon;
    }
    return null;
  }

  /**
   * Carbon's UNRECOGNIZED_IMAGE_TYPE for a lookup that found nothing, saying why:
   * no handler is registered for the extension. Carbon compiles every handler
   * in, so for it the only cause is an unknown type; ours registers explicitly,
   * and an unregistered codec must not read as a damaged file.
   *
   * @param {string} filename The file name looked up.
   * @returns {ImageIOResult} The failure.
   */
  static _noHandler(filename)
  {
    return new ImageIOResult(Code.UNRECOGNIZED_IMAGE_TYPE,
      `no image handler is registered for ".${ImageIO.getExtension(filename)}" (${filename})`);
  }

  /**
   * Read an image into a bitmap, picking the handler by the filename in the
   * load parameters (Tr2ImageHandler.cpp:95-106).
   *
   * Adapted: bytes replace the native stream.
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

    if (!handler) return ImageIO._noHandler(loadParameters.filename);

    return handler.readImage(bytes, loadParameters, bitmap, metadata);
  }

  /**
   * `readImage` that also serves formats whose decoder is asynchronous (PNG and VTA).
   *
   * Adapted: browser decoders can be asynchronous (CjsImageFormat.readImageAsync).
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

    if (!handler) return ImageIO._noHandler(loadParameters.filename);

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

    if (!handler) return ImageIO._noHandler(filename);

    return handler.isSaveSupported(dimensions);
  }

  /**
   * Save a bitmap in the format a filename names (Tr2ImageHandler.cpp:140-151).
   *
   * Adapted: Carbon writes to a stream; this returns `{result, bytes}`.
   *
   * @param {string} filename Destination file name.
   * @param {import("#imageio").HostBitmap} bitmap Bitmap to save.
   * @param {import("#imageio").Metadata|null} [metadata] Optional metadata.
   * @returns {{result: ImageIOResult, bytes: Uint8Array|null}} The outcome.
   */
  static saveImage(filename, bitmap, metadata = null)
  {
    const handler = ImageIO.getImageHandler(ImageIO.getExtension(filename));

    if (!handler) return { result: ImageIO._noHandler(filename), bytes: null };

    return handler.save(bitmap, metadata);
  }

}

// Apply the same @meta.adapted metadata without decorator syntax, retaining
// direct source imports for resource modules and their consumers.
CjsSchema.define(ImageIO, {
  className: "ImageIO",
  methods: {
    registerImageHandler: [meta.adapted],
    getExtension: [meta.implemented],
    getImageHandler: [meta.implemented],
    readImage: [meta.adapted],
    readImageAsync: [meta.adapted],
    isSaveSupported: [meta.adapted],
    saveImage: [meta.adapted]
  }
});
