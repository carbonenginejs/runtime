// Source: trinity/trinity/Tr2DxtCompressor.cpp:981-1066.
// Browser adaptation: a dedicated module worker replaces Carbon's native task.
// Termination can interrupt its synchronous encoder; posting a cancellation
// message to that busy worker cannot. No main-thread encoding fallback.
import { CjsResManWorkerLoader } from "#blue/worker/CjsResManWorkerLoader";

/**
 * Encode with an owned worker and the existing resource-worker transport.
 * Input is cloned, never detached. Completed output remains private until the
 * caller publishes it. Cancellation and failure release every worker/listener.
 * @param {object} payload Clone-safe bitmap or surface request.
 * @param {object} [options] AbortSignal, Worker factory and module URL overrides.
 * @returns {Promise<object>} Complete output or a rejected cancellation/failure.
 */
export async function compressAsync(payload, options = {})
{
    const signal = options.signal;
    if (signal?.aborted) throw new DOMException("Compression canceled", "AbortError");
    const loader = new CjsResManWorkerLoader({
        workerFactory: options.workerFactory,
        workerUrl: options.workerUrl ?? new URL("../compressionWorker.js", import.meta.url),
        workerOptions: { type: "module", name: "Tr2DxtCompressor" }
    });
    const cancel = () => loader.Disable(new DOMException("Compression canceled", "AbortError"));
    if (signal) signal.addEventListener("abort", cancel, { once: true });
    try
    {
        // Approved bug fix, cpp:1033-1062: no task or undefined success on
        // pre-execution cancellation. Recheck after installing the handler.
        if (signal?.aborted) throw new DOMException("Compression canceled", "AbortError");
        const result = await loader.Execute("dds.compress", payload);
        if (signal?.aborted) throw new DOMException("Compression canceled", "AbortError");
        if (!(result.data instanceof Uint8Array)) throw new TypeError("Invalid DDS compression worker output");
        return result;
    }
    finally
    {
        if (signal) signal.removeEventListener("abort", cancel);
        loader.Disable();
    }
}
