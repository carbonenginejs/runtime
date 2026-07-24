/** Owns one disposable browser chat-room listener and its server-resolved metadata. */
export class CjsChatRoomSubscription
{

    #client;

    #closePromise;

    #closed;

    #subscription;

    constructor({ client, room, subscription })
    {
        this.room = room;
        this.#client = client;
        this.#closePromise = null;
        this.#closed = false;
        this.#subscription = subscription;
    }

    /** Resolves when the selected room is active for the current connection. */
    WhenActive()
    {
        return this.#subscription.WhenActive().then(() => this);
    }

    /** Returns whether this room is currently receiving live events. */
    IsActive()
    {
        return !this.#closed && this.#subscription.IsActive();
    }

    /** Returns the server-resolved room, including URL-backed assets. */
    GetRoom()
    {
        return this.#subscription.GetTarget()?.room ?? this.room;
    }

    /** Returns the underlying generic realtime subscription. */
    GetRealtimeSubscription()
    {
        return this.#subscription;
    }

    /** Releases this listener and its server-side room lease idempotently. */
    async Close()
    {
        if (this.#closed)
        {
            return false;
        }

        if (this.#closePromise)
        {
            return this.#closePromise;
        }

        const operation = this.#client.Unsubscribe(this.#subscription);

        this.#closePromise = operation;

        try
        {
            return await operation;
        }
        finally
        {
            this.#closed = true;
            this.#closePromise = null;
        }
    }

}
