import { CjsSchema } from "#schema/CjsSchema";

import { TnyService } from "./TnyService.js";

// Source: operator-approved host data-provider orchestration, not a native Carbon cache.
/** Shared query caching; only successful, build-verified provider results enter storage. */
export class TnyServiceDatabase extends TnyService
{
    static storagePolicy = {};
    _store = null;
    _scope = "";
    _pending = new Map();
    _closed = false;

    /** Bind query caching to an injected store and provider scope. */
    constructor(store, scope) { super(); this._store = store; this._scope = scope; }

    /**
     * Coalesce matching reads, use valid cached results and tolerate cache
     * failures.
     */
    async _Cached(identity, operation, args, read)
    {
        if (this._closed) throw new Error("Database provider is closed");
        const key = JSON.stringify([this._scope, identity, operation, args]);
        if (!this._pending.has(key))
        {
            const pending = (async () =>
            {
                // A corrupt or unavailable reconstructible cache is a miss, never a saved document.
                try
                {
                    const cached = await this._store.Read(key, { version: identity.revision });
                    if (cached.found) return cached.value;
                }
                catch { /* Reacquire derived data. */ }
                const value = await read();
                if (value === undefined) throw new TypeError("Database provider returned undefined");
                try { await this._store.Write(key, value, { kind: "cache", version: identity.revision }); }
                catch { /* Successful source reads remain usable without persistence. */ }
                return value;
            })();
            this._pending.set(key, pending);
            pending.finally(() => this._pending.delete(key)).catch(() => {});
        }
        return structuredClone(await this._pending.get(key));
    }

    /** Reject new queries and wait for outstanding source reads to settle. */
    async Close()
    {
        this._closed = true;
        await Promise.allSettled([...this._pending.values()]);
    }
}

CjsSchema.meta.define("TnyServiceDatabase")(TnyServiceDatabase);
