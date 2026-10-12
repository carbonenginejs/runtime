// Source: trinity/trinity/Tr2DxtCompressor.cpp:981-1066.
// Carbon queues the encode on BeCallbackMan (cpp:1027-1030, :1063). Here each
// job runs on its own one-thread BlueCallbackMan whose worker module is the
// compression worker, because that module is still separate from the shared
// background pool. No main-thread encoding fallback.
import { BlueCallbackMan } from "#blue/BlueCallbackMan";

/**
 * Encode on a callback manager's worker thread.
 * Input is cloned, never detached. Completed output remains private until the
 * caller publishes it. Cancellation waits for the encode to stop, as Carbon's
 * Cancel waits for a callback in progress, then releases the worker.
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
    if (options.workerFactory) manager.SetWorkerFactory(options.workerFactory);
    manager.Run();

    const id = { value: 0 };
    const cancel = () => manager.Cancel(id.value);
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
        await manager.Stop();
    }
}
