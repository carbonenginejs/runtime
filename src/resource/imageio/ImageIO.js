// Source: imageio/include/Tr2ImageHandler.h
// Source: imageio/Tr2ImageHandler.cpp
// A namespace of free functions becomes a class of statics, camelCase.
import { ImageIOResult } from "#imageio";
import { blue } from "#blue";
import { CjsSchema, meta } from "#schema";

const Code = ImageIOResult.Code;

/**
 * Carbon's ImageIO entry points, routed through the active Blue resource manager.
 * Adapted: Carbon compiles handlers into ImageIO; independently imported JS
 * formats register once with ResMan and supply their own `carbon` handler table.
 * This module owns no handler registry and imports no concrete formats.
 */
export class ImageIO
{
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
   * The first registered image format for an extension, or null (Tr2ImageHandler.cpp:51-63).
   *
   * Adapted: Carbon compiles its handlers into ImageIO. Our formats are separate
   * modules, registered once with ResMan; resolve its current store on every call
   * so service replacement and later registrations need no ImageIO refresh.
   *
   * @param {string} extension Extension, without the dot.
   * @returns {object|null} Handler table.
   */
  static getImageHandler(extension)
  {
    for (const Format of blue.resMan.GetFormats(extension))
    {
      const handler = Format.carbon;
      if (handler) return handler;
    }
    return null;
  }

  /**
   * Read an image into a bitmap, picking the handler by the filename in the
   * load parameters (Tr2ImageHandler.cpp:95-106).
   *
   * Adapted: bytes replace the native stream; ResMan supplies the registered
   * format's carbon table instead of Carbon's compiled-in handler list.
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
   * `readImage` that also serves formats whose decoder is asynchronous (PNG and VTA).
   *
   * Adapted: browser decoders can be asynchronous (CjsImageFormat.readImageAsync);
   * handler lookup uses the active ResMan format registration.
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
   * Adapted: ResMan owns the format registrations, rather than a compiled-in list.
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
   * Adapted: Carbon writes to a stream; this returns `{result, bytes}` and
   * resolves the format through ResMan instead of Carbon's compiled-in list.
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

// Apply the same @meta.adapted metadata without decorator syntax, retaining
// direct source imports for resource modules and their consumers.
CjsSchema.define(ImageIO, {
  className: "ImageIO",
  methods: {
    getExtension: [meta.implemented],
    getImageHandler: [meta.adapted],
    readImage: [meta.adapted],
    readImageAsync: [meta.adapted],
    isSaveSupported: [meta.adapted],
    saveImage: [meta.adapted]
  }
});
