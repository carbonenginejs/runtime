// Source: blue/src/BlueResMan.cpp:109 - m_threadQueues[BRMQ_BACKGROUND] = BeCallbackMan
//
// The callback module BeCallbackMan decodes images from: one job,
// "image.decodeBitmap", that runs an image format's `readBitmapAsync` and
// returns the bitmap packet. Carbon runs a texture's DoLoad, and with it
// ImageIO's decode, on resMan's background queue, which is BeCallbackMan; so
// the texture loader queues the decode there (resman-in-the-browser: the CPU
// stage on BeCallbackMan's worker slots), several images at once. A worker
// imports this module the first time the job runs there; Update mode imports
// it on the main thread. Registered through IMAGE_DECODE_CALLBACK_MODULES.
import { CjsPngFormat } from "../formats/png/CjsPngFormat.js";
import { CjsJpegFormat } from "../formats/jpeg/CjsJpegFormat.js";
import { CjsTgaFormat } from "../formats/tga/CjsTgaFormat.js";
import { CjsVtaFormat } from "../formats/vta/CjsVtaFormat.js";
import { CjsGifFormat } from "../formats/gif/CjsGifFormat.js";

/** The job's name on BeCallbackMan. */
export const DECODE_BITMAP_CALLBACK = "image.decodeBitmap";

/** The image formats the job decodes, by format id. */
export const IMAGE_DECODE_FORMATS = new Map([ CjsPngFormat, CjsJpegFormat, CjsTgaFormat, CjsVtaFormat, CjsGifFormat ]
  .map(Format => [ Format.id, Format ]));

/**
 * The module for BeCallbackMan's composition to register
 * (`RegisterCallbackModule`), by callback name; resolved here, once, so a
 * worker and Update mode import the same URL.
 */
export const IMAGE_DECODE_CALLBACK_MODULES = { [DECODE_BITMAP_CALLBACK]: new URL(import.meta.url).href };

/**
 * Decodes one image to its bitmap packet.
 *
 * @param {object} payload The job's clone-safe request.
 * @param {string} payload.format The image format's id, a key of `IMAGE_DECODE_FORMATS`.
 * @param {Uint8Array} payload.input The image file's bytes.
 * @param {string} payload.source The path, for load parameters and error messages.
 * @returns {Promise<object>} The bitmap packet (`CjsImageFormat.readBitmapAsync`).
 * @throws {TypeError} For a format the job does not decode.
 * @throws {Error} With code `CJS_RESOURCE_IMAGE_READ_FAILED` when the image cannot be read.
 */
export function DecodeBitmap(payload)
{
  const Format = IMAGE_DECODE_FORMATS.get(payload.format);
  if (Format === undefined) throw new TypeError(`image.decodeBitmap: no image format "${payload.format}"`);
  return Format.readBitmapAsync(payload.input, { source: payload.source });
}

/** This module's callbacks, by name, for BlueCallbackManWorker and Update mode. */
export const callbacks = { [DECODE_BITMAP_CALLBACK]: DecodeBitmap };
