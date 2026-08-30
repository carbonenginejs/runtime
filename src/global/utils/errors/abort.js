import { CjsCancellationError } from "./CjsError.js";

/**
 * Throws when an abort signal has already been aborted.
 *
 * The caller's abort reason is always preserved. A native
 * `AbortSignal.throwIfAborted` is delegated to when present, and an explicitly
 * supplied `Error` reason is rethrown by identity, so a caller that aborted
 * with its own error sees that error and not a substitute. A missing or
 * non-`Error` reason becomes one `CjsCancellationError`, which carries the raw
 * reason as its cause. Every error this throws answers to
 * `name === "AbortError"`.
 *
 * @param {AbortSignal|{aborted?: boolean, reason?: *}|null} [signal] Signal to test.
 * @param {string} [message] Fallback message used when no reason is carried.
 * @returns {void}
 */
export function throwIfAborted(signal, message)
{
    if (!signal?.aborted)
    {
        return;
    }

    // The reason is inspected before the native method is consulted. A real
    // AbortSignal always carries one, and its platform default is a DOMException
    // that is itself an Error, so this branch reproduces the native throw
    // exactly. Delegating first would rethrow a non-Error reason raw and lose
    // the wrapping below.
    if (signal.reason instanceof Error)
    {
        throw signal.reason;
    }

    if (signal.reason === undefined && typeof signal.throwIfAborted === "function")
    {
        signal.throwIfAborted();
    }

    throw new CjsCancellationError(
        message ?? "The operation was cancelled.",
        signal.reason === undefined ? undefined : { cause: signal.reason }
    );
}
