// Source: Tr2DxtCompressor.cpp:981-1066, browser worker adaptation.
// The worker module of the callback manager that runs DXT encoding: it
// exports one callback, "dds.compress", through BlueCallbackManWorker.
import { BlueCallbackManWorker } from "#blue/worker/BlueCallbackManWorker";
import { compressBitmap, compressSurface, compressionPixelFormat } from "./core/dxtCompression.js";
import { PixelFormat as P } from "#consts/render-context";

/**
 * Execute one clone-safe compression request without touching a live resource.
 *
 * @param {object} payload Request posted by `compressAsync`.
 * @param {"bitmap"|"surface"} payload.kind Operation kind.
 * @param {import("./core/helpers.js").DdsBitmapPacket} [payload.packet] Bitmap packet, for "bitmap".
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

/**
 * Install the "dds.compress" callback on a worker scope.
 *
 * @param {object} scope Worker global scope; uses `addEventListener`, `removeEventListener` and `postMessage`.
 * @returns {Function} Removes the message listener.
 */
export function installCompressionWorker(scope)
{
    return BlueCallbackManWorker.install(scope, { "dds.compress": executeCompression });
}

if (typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope)
    installCompressionWorker(globalThis);
