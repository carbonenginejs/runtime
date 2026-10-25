// Source: Tr2DxtCompressor.cpp:981-1066, browser worker adaptation.
// The callback module BeCallbackMan runs DXT encoding from: it exports one
// callback, "dds.compress". A worker imports it the first time the callback
// runs there, and Update mode imports it on the main thread
// (BlueCallbackMan.RegisterCallbackModule; registered through
// BCN_CALLBACK_MODULES).
import { compressBitmap, compressSurface, compressionPixelFormat } from "./carbon/dxtCompression.js";
import { PixelFormat as P } from "#consts/render-context";

/**
 * Execute one clone-safe compression request without touching a live resource.
 *
 * @param {object} payload Request posted by `compressAsync`.
 * @param {"bitmap"|"surface"} payload.kind Operation kind.
 * @param {import("../../formats/dds/core/helpers.js").DdsBitmapPacket} [payload.packet] Bitmap packet, for "bitmap".
 * @param {number} payload.format Carbon compression mode.
 * @param {object} payload.options Encoder options.
 * @param {Uint8Array} [payload.input] Source storage, for "surface".
 * @param {number} [payload.width] Surface width, for "surface".
 * @param {number} [payload.height] Surface height, for "surface".
 * @returns {object} The compressed packet (or `{ data }` for a surface) plus `encodeTimeMs`.
 * @throws {TypeError} For an unknown operation kind.
 * @throws {RangeError} For invalid surface output dimensions.
 */
export function executeCompression(payload)
{
    const started = performance.now();
    let result;
    if (payload.kind === "bitmap") result = compressBitmap(payload.packet, payload.format, payload.options);
    else if (payload.kind === "surface")
    {
        const format = compressionPixelFormat(payload.format);
        const blockBytes = format === P.PIXEL_FORMAT_BC1_UNORM || format === P.PIXEL_FORMAT_BC4_UNORM ? 8 : 16;
        const pitch = payload.options.outputPitch ?? Math.ceil(payload.width / 4) * blockBytes;
        if (!Number.isSafeInteger(pitch) || pitch < 1 || !Number.isSafeInteger(payload.height) || payload.height < 1)
            throw new RangeError("Invalid compression output dimensions");
        const data = new Uint8Array(pitch * Math.ceil(payload.height / 4)); // alloc: variable-sized owned worker result
        compressSurface(payload.input, payload.width, payload.height, payload.format, data, payload.options);
        result = { data };
    }
    else throw new TypeError("Unknown DDS compression operation");
    return { ...result, encodeTimeMs: performance.now() - started };
}

/** This module's callbacks, by name, for `BlueCallbackManWorker` and `Update` mode. */
export const callbacks = { "dds.compress": executeCompression };
