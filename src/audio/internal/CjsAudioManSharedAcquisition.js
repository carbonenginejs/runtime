import { throwIfAborted } from "#utils/errors";

// CarbonEngineJS original (no Carbon counterpart). Internal lease owner for
// one deduplicated CjsAudioMan media or whole-bank acquisition.

/** Owns one shared acquisition, its caller leases, and orphan cancellation. */
export class CjsAudioManSharedAcquisition
{
    _controller = new AbortController();

    _evict = null;

    _leases = 0;

    _pending = true;

    _promise = null;

    /** Starts one acquisition and installs its retention/eviction policy. */
    constructor({ start, evict, retain = true } = {})
    {
        if (typeof start !== "function")
        {
            throw new TypeError("Shared audio acquisition requires a start function");
        }
        if (typeof evict !== "function")
        {
            throw new TypeError("Shared audio acquisition requires an eviction function");
        }

        this._evict = evict;
        let operation;

        try
        {
            operation = start(this._controller.signal);
        }
        catch (error)
        {
            operation = Promise.reject(error);
        }

        this._promise = Promise.resolve(operation)
            .then(value =>
            {
                const retained = typeof retain === "function"
                    ? retain()
                    : retain;

                if (!retained)
                {
                    this.Evict();
                }
                return value;
            })
            .catch(error =>
            {
                this.Evict();
                throw error;
            })
            .finally(() =>
            {
                this._pending = false;
            });
    }

    /** Returns one independently abortable lease over the shared result. */
    Subscribe(signal)
    {
        throwIfAborted(signal, "Audio media load aborted");
        throwIfAborted(this._controller.signal, "Audio media load aborted");
        this._leases++;

        return new Promise((resolve, reject) =>
        {
            let settled = false;
            const sharedSignal = this._controller.signal;
            const finish = (callback, value) =>
            {
                if (settled)
                {
                    return;
                }
                settled = true;
                signal?.removeEventListener("abort", onCallerAbort);
                sharedSignal.removeEventListener("abort", onSharedAbort);
                this._Release(value);
                callback(value);
            };
            const onCallerAbort = () =>
                finish(reject, AbortReason(signal));
            const onSharedAbort = () =>
                finish(reject, AbortReason(sharedSignal));

            signal?.addEventListener(
                "abort",
                onCallerAbort,
                { once: true },
            );
            sharedSignal.addEventListener(
                "abort",
                onSharedAbort,
                { once: true },
            );
            if (signal?.aborted)
            {
                onCallerAbort();
                return;
            }
            if (sharedSignal.aborted)
            {
                onSharedAbort();
                return;
            }
            this._promise.then(
                value => finish(resolve, value),
                error => finish(reject, error),
            );
        });
    }

    /** Aborts pending shared work without affecting an already settled result. */
    Abort(reason = undefined)
    {
        if (this._pending && !this._controller.signal.aborted)
        {
            this._controller.abort(reason);
            return true;
        }
        return false;
    }

    /** Removes this entry from its owning cache when it is still current. */
    Evict()
    {
        this._evict?.();
    }

    /** Releases one lease and cancels shared work after the final orphan. */
    _Release(reason)
    {
        this._leases = Math.max(0, this._leases - 1);
        if (this._pending && this._leases === 0)
        {
            this.Evict();
            this.Abort(reason);
        }
    }
}

function AbortReason(signal)
{
    return signal?.reason instanceof Error
        ? signal.reason
        : new DOMException("Audio media load aborted", "AbortError");
}
