import { CjsRealtimeError } from "./CjsRealtimeError.js";
import { CjsRealtimeProtocol } from "./CjsRealtimeProtocol.js";

/** One desired service subscription retained safely across client reconnects. */
export class CjsRealtimeSubscription
{

    #buffer;
    #cursor;
    #onEvent;
    #onSnapshot;
    #ready;
    #resolvedTarget;
    #subscriptionId;
    #topicSequences;

    constructor({
        serviceId,
        topics,
        target = null,
        recovery = "live",
        maxBufferedEvents = 512,
        onEvent = null,
        onSnapshot = null
    })
    {
        const request = CjsRealtimeProtocol.createSubscribe(
            "subscription-validation",
            serviceId,
            topics,
            target
        );

        if (![ "live", "snapshot" ].includes(recovery))
        {
            throw new TypeError(`Unsupported realtime recovery mode: ${recovery}`);
        }

        if (!Number.isSafeInteger(maxBufferedEvents) || maxBufferedEvents < 1)
        {
            throw new RangeError("maxBufferedEvents must be a positive integer");
        }

        if (onEvent !== null && typeof onEvent !== "function")
        {
            throw new TypeError("onEvent must be a function or null");
        }

        if (onSnapshot !== null && typeof onSnapshot !== "function")
        {
            throw new TypeError("onSnapshot must be a function or null");
        }

        this.serviceId = request.serviceId;
        this.topics = request.topics;
        this.target = request.target ?? null;
        this.recovery = recovery;
        this.maxBufferedEvents = maxBufferedEvents;
        this.status = "idle";
        this.#onEvent = onEvent;
        this.#onSnapshot = onSnapshot;
        this.#subscriptionId = null;
        this.#resolvedTarget = this.target;
        this.#cursor = null;
        this.#topicSequences = new Map();
        this.#buffer = [];
        this.#ready = CjsRealtimeSubscription.createDeferred();
    }

    /** Resolves when this subscription is active for the current connection. */
    WhenActive()
    {
        return this.#ready.promise;
    }

    /** Returns whether live delivery is active rather than buffering. */
    IsActive()
    {
        return this.status === "active";
    }

    /** Returns the current immutable cursor or null before activation. */
    GetCursor()
    {
        return this.#cursor;
    }

    /** Returns the current server-issued subscription ID. */
    GetSubscriptionId()
    {
        return this.#subscriptionId;
    }

    /** Returns the server-resolved target, including presentation metadata. */
    GetTarget()
    {
        return this.#resolvedTarget;
    }

    /** Begins one connection generation at its atomic subscription cursor. */
    Begin(subscriptionId, cursorValue, targetValue = this.target)
    {
        CjsRealtimeProtocol.assertString(subscriptionId, "subscriptionId", 1, 128);
        const cursor = CjsRealtimeProtocol.normalizeCursor(cursorValue);
        const target = targetValue === null
            ? null
            : CjsRealtimeProtocol.freezeJson(targetValue);

        this.#subscriptionId = subscriptionId;
        this.#resolvedTarget = target;
        this.#buffer.length = 0;
        this.#SetCursor(cursor);
        this.status = this.recovery === "snapshot" ? "reconciling" : "active";

        if (this.status === "active")
        {
            this.#ResolveReady();
        }

        return this;
    }

    /** Buffers or applies one normalized future event. */
    async Receive(value)
    {
        const event = CjsRealtimeProtocol.normalizeEvent(value);

        this.#AssertMatchingEvent(event);

        if (this.status === "reconciling")
        {
            if (event.streamId !== this.#cursor.streamId)
            {
                throw CjsRealtimeSubscription.resyncError("Realtime event stream changed during reconciliation");
            }

            if (this.#buffer.length >= this.maxBufferedEvents)
            {
                throw CjsRealtimeSubscription.resyncError("Realtime snapshot event buffer overflowed");
            }

            this.#buffer.push(event);
            return false;
        }

        if (this.status !== "active")
        {
            throw new CjsRealtimeError("subscription_inactive", "Realtime subscription is not active");
        }

        return this.#ApplyEvent(event);
    }

    /** Installs a cursor-stamped snapshot and then drains newer buffered events. */
    async InstallSnapshot(value)
    {
        if (this.status !== "reconciling")
        {
            throw new CjsRealtimeError("snapshot_unexpected", "Realtime subscription is not reconciling");
        }

        const snapshot = CjsRealtimeProtocol.normalizeSnapshot(value, this.serviceId);

        if (snapshot.cursor.streamId !== this.#cursor.streamId)
        {
            throw CjsRealtimeSubscription.resyncError("Realtime snapshot stream changed");
        }

        if (this.#onSnapshot)
        {
            await this.#Invoke(this.#onSnapshot, snapshot);
        }

        this.#SetCursor(snapshot.cursor);
        const buffered = this.#buffer.sort((left, right) => left.sequence - right.sequence);
        this.#buffer = [];

        for (const event of buffered)
        {
            if (event.streamId !== snapshot.cursor.streamId)
            {
                throw CjsRealtimeSubscription.resyncError("Buffered realtime event stream changed");
            }

            if (event.sequence > snapshot.cursor.sequence)
            {
                await this.#ApplyEvent(event);
            }
        }

        this.status = "active";
        this.#ResolveReady();
        return snapshot;
    }

    /** Clears connection-scoped state while retaining the desired subscription. */
    Reset()
    {
        this.status = "idle";
        this.#subscriptionId = null;
        this.#resolvedTarget = this.target;
        this.#cursor = null;
        this.#topicSequences.clear();
        this.#buffer.length = 0;

        if (this.#ready.settled)
        {
            this.#ready = CjsRealtimeSubscription.createDeferred();
        }
    }

    /** Permanently rejects an outstanding activation wait. */
    Dispose(failure = null)
    {
        this.Reset();
        this.status = "disposed";

        if (!this.#ready.settled)
        {
            this.#ready.settled = true;
            this.#ready.reject(failure ?? new CjsRealtimeError(
                "subscription_disposed",
                "Realtime subscription was disposed"
            ));
        }
    }

    static createDeferred()
    {
        const value = { settled: false };

        value.promise = new Promise((resolve, reject) =>
        {
            value.resolve = resolve;
            value.reject = reject;
        });
        value.promise.catch(() => {});
        return value;
    }

    static resyncError(message)
    {
        return new CjsRealtimeError("resync_required", message, {
            retryable: true,
            connectionUsable: false,
            closeCode: 4409
        });
    }

    async #ApplyEvent(event)
    {
        if (event.streamId !== this.#cursor.streamId)
        {
            throw CjsRealtimeSubscription.resyncError("Realtime event stream changed");
        }

        if (event.sequence <= this.#cursor.sequence)
        {
            return false;
        }

        const previousTopicSequence = this.#topicSequences.get(event.topic) ?? 0;

        if (event.topicSequence !== previousTopicSequence + 1)
        {
            throw CjsRealtimeSubscription.resyncError(
                `Realtime topic sequence gap for ${event.topic}`
            );
        }

        this.#topicSequences.set(event.topic, event.topicSequence);
        this.#cursor = CjsRealtimeSubscription.createCursor(
            event.streamId,
            event.sequence,
            this.#topicSequences
        );

        if (this.#onEvent)
        {
            await this.#Invoke(this.#onEvent, event);
        }

        return true;
    }

    #AssertMatchingEvent(event)
    {
        if (event.subscriptionId !== this.#subscriptionId
            || event.service.id !== this.serviceId
            || !this.topics.includes(event.topic))
        {
            throw CjsRealtimeSubscription.resyncError("Realtime event does not match its subscription");
        }
    }

    async #Invoke(callback, value)
    {
        try
        {
            await callback(value, this);
        }
        catch (error)
        {
            throw new CjsRealtimeError(
                "consumer_callback_failed",
                "Realtime consumer callback failed",
                { cause: error }
            );
        }
    }

    #ResolveReady()
    {
        if (!this.#ready.settled)
        {
            this.#ready.settled = true;
            this.#ready.resolve(this);
        }
    }

    #SetCursor(cursor)
    {
        this.#cursor = cursor;
        this.#topicSequences = new Map(Object.entries(cursor.topicSequences));
    }

    static createCursor(streamId, sequence, topicSequences)
    {
        return CjsRealtimeProtocol.normalizeCursor({
            streamId,
            sequence,
            topicSequences: Object.fromEntries(topicSequences)
        });
    }

}
