// Source: trinity/trinity/Tr2DxtCompressor.cpp:981-1066.
// Carbon queues the encode on BeCallbackMan (cpp:1027-1030, :1063), and so
// does this: by name, "dds.compress", from the callback module the
// composition registers (BCN_CALLBACK_MODULES) before it starts the manager.
// BeCallbackMan runs it on a worker, or through Update on the main thread when
// the host has no workers.
//
// Cancel: a queued job is removed; a running one finishes and its result is
// dropped (CallbackMan.cpp:405). Carbon's encoder also polls its cancel flag
// at every block row (cpp:653-660); a worker cannot see a main-thread flag
// without shared memory, so a running encode here always completes.
import { BeCallbackMan, BlueCallbackMan } from "#blue/BlueCallbackMan";

/** The callback name the encode is queued under. */
const COMPRESS_CALLBACK = "dds.compress";

/**
 * The codec's callback modules, by callback name, for the composition to
 * register on BeCallbackMan (`RegisterCallbackModule`). Resolved here, once,
 * so a worker and `Update` mode import the same URL.
 */
export const BCN_CALLBACK_MODULES = { [COMPRESS_CALLBACK]: new URL("../compressionWorker.js", import.meta.url).href };

/**
 * Encode on BeCallbackMan.
 * Input is cloned on a worker and never detached. Completed output remains
 * private until the caller publishes it. A cancelled job settles at once; one
 * already running finishes and its result is dropped.
 * @param {object} payload Clone-safe bitmap or surface request.
 * @param {object} [options] Cancellation.
 * @param {AbortSignal} [options.signal] Cancels the job.
 * @returns {Promise<object>} Complete output or a rejected cancellation/failure.
 * @throws {DOMException} An AbortError when the signal is aborted.
 * @throws {Error} When BeCallbackMan cannot run the job: not started with `BCN_CALLBACK_MODULES` registered.
 * @throws {TypeError} When the job's result has no `Uint8Array` data.
 */
export async function compressAsync(payload, options = {})
{
    const signal = options.signal;
    if (signal?.aborted) throw new DOMException("Compression canceled", "AbortError");

    const id = { value: 0 };
    const cancel = () => BeCallbackMan.Cancel(id.value);
    if (signal) signal.addEventListener("abort", cancel, { once: true });
    try
    {
        let result;
        try
        {
            result = await BeCallbackMan.Add__Name(COMPRESS_CALLBACK, payload, BlueCallbackMan.BCBF_NONE, id);
        }
        catch (error)
        {
            if (error.name === "AbortError") throw new DOMException("Compression canceled", "AbortError");
            if (error.code === "CJS_CALLBACKMAN_NO_RUNNER")
            {
                throw new Error("compressAsync: BeCallbackMan is not started with BCN_CALLBACK_MODULES registered; "
                    + "register them and Start it, or compress synchronously with compressBitmap or compressSurface.", { cause: error });
            }
            throw error;
        }
        if (signal?.aborted) throw new DOMException("Compression canceled", "AbortError");
        if (!(result.data instanceof Uint8Array)) throw new TypeError("Invalid DDS compression worker output");
        return result;
    }
    finally
    {
        if (signal) signal.removeEventListener("abort", cancel);
    }
}

/**
 * Browser adaptation of Carbon's task: BeCallbackMan returns complete bitmap storage.
 *
 * @param {import("../../../formats/dds/core/helpers.js").DdsBitmapPacket} packet Uncompressed bitmap packet.
 * @param {number} format Carbon compression mode.
 * @param {object} [options={}] Encoder options and cancellation.
 * @param {number} [options.quality] Squish quality 0-2.
 * @param {boolean} [options.srgb] Output sRGB storage.
 * @param {AbortSignal} [options.signal] Cancels the job.
 * @returns {Promise<object>} The compressed packet.
 */
export function compressBitmapAsync(packet, format, options = {})
{
    return compressAsync({ kind: "bitmap", packet, format,
        options: { quality: options.quality, srgb: options.srgb } }, options);
}

/**
 * Surface entry on BeCallbackMan; caller input and output are never transferred.
 *
 * @param {Uint8Array} input Native source storage.
 * @param {number} width Surface width.
 * @param {number} height Surface height.
 * @param {number} format Carbon compression mode.
 * @param {object} [options={}] Encoder options and cancellation.
 * @param {number} [options.quality] Squish quality 0-2.
 * @param {number} [options.sourceFormat] Source PixelFormat.
 * @param {number} [options.inputPitch] Source row pitch in bytes.
 * @param {number} [options.outputPitch] Destination block-row pitch in bytes.
 * @param {AbortSignal} [options.signal] Cancels the job.
 * @returns {Promise<object>} `{ data, encodeTimeMs }`.
 */
export function compressSurfaceAsync(input, width, height, format, options = {})
{
    return compressAsync({ kind: "surface", input, width, height, format,
        options: { quality: options.quality, sourceFormat: options.sourceFormat,
            inputPitch: options.inputPitch, outputPitch: options.outputPitch } }, options);
}
