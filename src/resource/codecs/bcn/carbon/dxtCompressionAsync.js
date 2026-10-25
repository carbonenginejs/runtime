// Source: trinity/trinity/Tr2DxtCompressor.cpp:981-1066.
// Carbon queues the encode on BeCallbackMan (cpp:1027-1030, :1063). Here each
// job runs on its own one-thread BlueCallbackMan whose worker module is the
// compression worker, because that module is still separate from the shared
// background pool. No main-thread encoding fallback.
//
// Cancel: the encoder is one synchronous block loop, so a cancel message
// cannot reach it until it ends. A cancelled job therefore terminates its
// worker - the recovery the callback manager's cancel leaves to its owner -
// and settles at once instead of waiting for the encode.
import { BlueCallbackMan } from "#blue/BlueCallbackMan";

/**
 * Encode on a callback manager's worker thread.
 * Input is cloned, never detached. Completed output remains private until the
 * caller publishes it. Cancellation terminates the worker and settles at once.
 * @param {object} payload Clone-safe bitmap or surface request.
 * @param {object} [options] AbortSignal, Worker factory and module URL overrides.
 * @param {AbortSignal} [options.signal] Cancels the job.
 * @param {Function} [options.workerFactory] Worker factory for the callback manager.
 * @param {string|URL} [options.workerUrl] Worker module URL; defaults to `../compressionWorker.js`.
 * @returns {Promise<object>} Complete output or a rejected cancellation/failure.
 * @throws {DOMException} An AbortError when the signal is aborted.
 * @throws {TypeError} When the worker result has no `Uint8Array` data.
 */
export async function compressAsync(payload, options = {})
{
    const signal = options.signal;
    if (signal?.aborted) throw new DOMException("Compression canceled", "AbortError");

    const manager = new BlueCallbackMan();
    manager.SetName("Tr2DxtCompressor");
    manager.SetWorkerModule(options.workerUrl ?? new URL("../compressionWorker.js", import.meta.url));
    const workerFactory = options.workerFactory ?? ((module, workerOptions) => new Worker(module, workerOptions));
    let worker = null;
    manager.SetWorkerFactory((module, workerOptions) => (worker = workerFactory(module, workerOptions)));
    manager.Run();

    const id = { value: 0 };
    let cancelled = false;
    const cancel = () =>
    {
        cancelled = true;
        manager.Cancel(id.value);
    };
    if (signal) signal.addEventListener("abort", cancel, { once: true });
    try
    {
        // Approved bug fix, cpp:1033-1062: no task or undefined success on
        // pre-execution cancellation. Recheck after installing the handler.
        if (signal?.aborted) throw new DOMException("Compression canceled", "AbortError");
        let result;
        try
        {
            result = await manager.Add__Name("dds.compress", payload, BlueCallbackMan.BCBF_NONE, id);
        }
        catch (error)
        {
            if (error.name === "AbortError") throw new DOMException("Compression canceled", "AbortError");
            throw error;
        }
        if (signal?.aborted) throw new DOMException("Compression canceled", "AbortError");
        if (!(result.data instanceof Uint8Array)) throw new TypeError("Invalid DDS compression worker output");
        return result;
    }
    finally
    {
        if (signal) signal.removeEventListener("abort", cancel);
        if (cancelled) worker.terminate();
        else await manager.Stop();
    }
}

/**
 * Browser adaptation of Carbon's task: an owned worker returns complete bitmap storage.
 *
 * @param {import("../../../formats/dds/core/helpers.js").DdsBitmapPacket} packet Uncompressed bitmap packet.
 * @param {number} format Carbon compression mode.
 * @param {object} [options={}] Encoder and worker options.
 * @param {number} [options.quality] Squish quality 0-2.
 * @param {boolean} [options.srgb] Output sRGB storage.
 * @param {AbortSignal} [options.signal] Cancels the job.
 * @returns {Promise<object>} The compressed packet from the worker.
 */
export function compressBitmapAsync(packet, format, options = {})
{
    return compressAsync({ kind: "bitmap", packet, format,
        options: { quality: options.quality, srgb: options.srgb } }, options);
}

/**
 * Browser worker surface entry; caller input and output are never transferred.
 *
 * @param {Uint8Array} input Native source storage.
 * @param {number} width Surface width.
 * @param {number} height Surface height.
 * @param {number} format Carbon compression mode.
 * @param {object} [options={}] Encoder and worker options.
 * @param {number} [options.quality] Squish quality 0-2.
 * @param {number} [options.sourceFormat] Source PixelFormat.
 * @param {number} [options.inputPitch] Source row pitch in bytes.
 * @param {number} [options.outputPitch] Destination block-row pitch in bytes.
 * @param {AbortSignal} [options.signal] Cancels the job.
 * @returns {Promise<object>} `{ data, encodeTimeMs }` from the worker.
 */
export function compressSurfaceAsync(input, width, height, format, options = {})
{
    return compressAsync({ kind: "surface", input, width, height, format,
        options: { quality: options.quality, sourceFormat: options.sourceFormat,
            inputPitch: options.inputPitch, outputPitch: options.outputPitch } }, options);
}
