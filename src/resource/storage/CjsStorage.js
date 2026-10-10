import { CjsMemoryStorage } from "./CjsMemoryStorage.js";
import { storageAddress, storageError, storageKey, storageLimit, estimateStorageSize } from "./storageRecord.js";

/**
 * Our shared storage service: memory is always present, persistence is injected.
 * Codecs see plain values or bytes. Engine hydration remains the consumer's job.
 */
export class CjsStorage
{
    static className = "CjsStorage";
    namespace = "";
    backend = null;
    memory = null;
    codecs = new Map();
    now = null;
    pending = Promise.resolve();
    _closed = false;
    _closing = null;
    /** Budget for estimatedSize totals, not database quota usage. */
    maxPersistentCacheBytes = 0;

    /** No browser globals are touched here; a Node host uses precisely this constructor. */
    constructor({ namespace, backend = null, persistence = true, memory = {}, codecs = [], now = Date.now,
        maxPersistentCacheBytes = 256 * 1024 * 1024 } = {})
    {
        storageAddress(namespace, "validation", "validation");
        if (backend)
        {
            for (const method of ["Read", "WriteBatch", "Delete", "List", "Close"])
                if (typeof backend[method] !== "function") throw new TypeError(`Storage backend requires ${method}`);
            if (typeof backend.capabilities?.persistent !== "boolean") throw new TypeError("Storage backend must declare persistence capability");
        }
        this.namespace = namespace;
        this.backend = persistence ? backend : null;
        this.memory = new CjsMemoryStorage(memory);
        this.now = now;
        this.maxPersistentCacheBytes = storageLimit(maxPersistentCacheBytes, "persistent cache budget");
        for (const codec of codecs)
        {
            if (!codec.id || !Number.isSafeInteger(codec.version) || typeof codec.Encode !== "function" || typeof codec.Decode !== "function")
                throw new TypeError("Storage codec requires id, version, Encode and Decode");
            const key = `${codec.id}:${codec.version}`;
            if (codec.id === "native" || this.codecs.has(key)) throw new TypeError(`Duplicate storage codec ${key}`);
            this.codecs.set(key, codec);
        }
    }

    /** Read a versioned record; unavailable persistence is distinct from an ordinary miss. */
    async Read(collection, key, { version = 1 } = {})
    {
        return this._Enqueue(() => this._Read(collection, key, version));
    }

    /**
     * Resolve a versioned record from memory or persistence and refresh the
     * memory cache.
     */
    async _Read(collection, key, version)
    {
        const address = storageAddress(this.namespace, collection, key);
        let entry = await this.memory.Read(address);
        let persisted = entry?.persisted === true;
        if (!entry && this.backend)
        {
            try
            {
                entry = await this.backend.Read(address);
                persisted = this.backend.capabilities.persistent;
            }
            catch (error) { return { found: false, reason: "unavailable", error: storageError(error) }; }
        }
        if (!entry) return { found: false, reason: "missing", error: null };
        if (entry.version !== version || (entry.expiresAt !== null && entry.expiresAt <= this.now()))
        {
            await this.memory.Delete(address);
            return { found: false, reason: entry.version !== version ? "version" : "expired", error: null };
        }
        const value = entry.codec === "native" ? entry.value
            : await this._Codec(entry.codec, entry.codecVersion).Decode(entry.value);
        try { await this.memory.WriteBatch([{ ...entry, kind: persisted ? "cache" : entry.kind, persisted }]); }
        catch { /* A read larger than the memory budget can still succeed. */ }
        return { found: true, value, version: entry.version, persisted, updatedAt: entry.updatedAt };
    }

    /** Write one entry. The result says whether it exists in memory, persistence, or neither. */
    async Write(collection, key, value, options = {})
    {
        return this.WriteBatch(collection, [{ ...options, key, value }]);
    }

    /** Snapshot inputs at invocation; serialize encoding, persistence and memory publication. */
    async WriteBatch(collection, entries)
    {
        const owned = [];
        for (const entry of entries)
        {
            estimateStorageSize(entry.value);
            owned.push(structuredClone(entry));
        }
        return this._Enqueue(() => this._WriteBatch(collection, owned));
    }

    /** Prepare all records before touching persistence. Cache failure never becomes a saved success. */
    async _WriteBatch(collection, entries)
    {
        const records = [];
        for (const { key, value, version = 1, kind = "saved", codec = "native", codecVersion = 1, ttlMs = null } of entries)
        {
            if (kind !== "saved" && kind !== "cache") throw new TypeError("Storage kind must be saved or cache");
            if (!(Number.isSafeInteger(version) && version >= 0) && !(typeof version === "string" && version.length))
                throw new TypeError("Storage version requires a nonempty string or nonnegative integer");
            if (ttlMs !== null && (kind !== "cache" || !Number.isFinite(ttlMs) || ttlMs < 0))
                throw new TypeError("Only cache records may expire, with a nonnegative TTL");
            estimateStorageSize(value);
            const encoded = codec === "native" ? structuredClone(value) : await this._Codec(codec, codecVersion).Encode(value);
            const updatedAt = this.now();
            records.push({ address: storageAddress(this.namespace, collection, key), version, kind, codec, codecVersion,
                value: encoded, estimatedSize: estimateStorageSize(encoded), updatedAt, expiresAt: ttlMs === null ? null : updatedAt + ttlMs });
        }
        let error = null;
        let persisted = false;
        let backendStored = false;
        if (this.backend)
        {
            try
            {
                await this._PruneCache(records);
                await this.backend.WriteBatch(records);
                backendStored = true;
                persisted = this.backend.capabilities.persistent;
            }
            catch (cause) { error = storageError(cause); }
        }
        let cached = false;
        try
        {
            await this.memory.WriteBatch(records.map(record => ({ ...record, kind: persisted ? "cache" : record.kind, persisted })));
            cached = true;
        }
        catch (cause)
        {
            if (!backendStored && !error) error = storageError(cause);
            // A committed replacement must not leave the old memory copy visible.
            // If neither backend accepted the batch, retain the previous saved values.
            if (backendStored) for (const record of records) await this.memory.Delete(record.address);
        }
        return { stored: backendStored || cached, persisted, cached, error };
    }

    /** Limit only disposable cache data in this namespace; never evict user saves. */
    async _PruneCache(records)
    {
        if (!records.some(record => record.kind === "cache")) return;
        const replacements = new Set(records.map(record => storageKey(record.address)));
        let estimatedSize = 0;
        for (const record of records) if (record.kind === "cache") estimatedSize += record.estimatedSize;
        if (estimatedSize > this.maxPersistentCacheBytes)
        {
            const error = new Error("Batch exceeds persistent cache budget");
            error.name = "QuotaExceededError";
            throw error;
        }
        const candidates = [];
        for await (const record of this.backend.List({ namespace: this.namespace }))
        {
            if (record.kind !== "cache" || replacements.has(storageKey(record.address))) continue;
            if (record.expiresAt !== null && record.expiresAt <= this.now())
            {
                await this.backend.Delete(record.address);
                continue;
            }
            // Re-estimate stored data: older envelopes included guessed overheads
            // and originally named this estimate byteLength.
            record.estimatedSize = estimateStorageSize(record.value);
            estimatedSize += record.estimatedSize;
            candidates.push(record);
        }
        candidates.sort((a, b) => a.updatedAt - b.updatedAt);
        for (const record of candidates)
        {
            if (estimatedSize <= this.maxPersistentCacheBytes) break;
            await this.backend.Delete(record.address);
            estimatedSize -= record.estimatedSize;
        }
    }

    /** Delete persistence before removing memory; a failed delete is reported, never disguised. */
    async Delete(collection, key)
    {
        return this._Enqueue(async () =>
        {
            const address = storageAddress(this.namespace, collection, key);
            try
            {
                if (this.backend) await this.backend.Delete(address);
                await this.memory.Delete(address);
                return { deleted: true, error: null };
            }
            catch (error) { return { deleted: false, error: storageError(error) }; }
        });
    }

    /** Resolve an owned identity snapshot before later operations can modify this owner. */
    async List(collection)
    {
        return this._Enqueue(() => this._List(collection));
    }

    /**
     * Collect matching live identities from memory and persistence without
     * duplicates.
     */
    async _List(collection)
    {
        const result = [];
        const now = this.now();
        const seen = new Set();
        const query = { namespace: this.namespace, collection };
        for (const source of [this.memory, this.backend])
        {
            if (!source) continue;
            for await (const entry of source.List(query))
            {
                const key = storageKey(entry.address);
                if (seen.has(key)) continue;
                seen.add(key);
                if (entry.expiresAt !== null && entry.expiresAt <= now) continue;
                result.push({ ...entry.address, version: entry.version, updatedAt: entry.updatedAt });
            }
        }
        return result;
    }

    /** Purge this namespace, protecting saved records by default. Deletions are not a transaction. */
    async Purge({ includeSaved = false } = {})
    {
        if (typeof includeSaved !== "boolean") throw new TypeError("includeSaved must be boolean");
        return this._Enqueue(async () =>
        {
            const records = new Map();
            for (const source of [this.backend, this.memory])
            {
                if (!source) continue;
                for await (const record of source.List({ namespace: this.namespace }))
                {
                    const key = storageKey(record.address);
                    const previous = records.get(key);
                    // Either copy may protect the identity, even if its other copy is cacheable.
                    records.set(key, { address: record.address,
                        saved: record.kind === "saved" || previous?.saved === true });
                }
            }
            let deleted = 0;
            for (const { address, saved } of records.values())
            {
                if (saved && !includeSaved) continue;
                if (this.backend) await this.backend.Delete(address);
                await this.memory.Delete(address);
                deleted++;
            }
            return { deleted };
        });
    }

    /** Resolve the exact stored codec revision; changing the default never rewrites old records. */
    _Codec(id, version)
    {
        const codec = this.codecs.get(`${id}:${version}`);
        if (!codec) throw new Error(`Storage codec ${id}:${version} is not installed`);
        return codec;
    }

    /** Queue the whole operation, including reads and cache fills. A rejection never poisons the tail. */
    _Enqueue(run)
    {
        if (this._closed) return Promise.reject(new Error("Storage is closed"));
        const operation = this.pending.then(run);
        this.pending = operation.catch(() => {});
        return operation;
    }

    /** Stop admission immediately, drain accepted operations, and close every adapter once. */
    Close()
    {
        if (!this._closing)
        {
            this._closed = true;
            this._closing = this.pending.then(async () =>
            {
                const errors = [];
                for (const adapter of [this.memory, this.backend])
                {
                    if (!adapter) continue;
                    try { await adapter.Close(); }
                    catch (error) { errors.push(error); }
                }
                if (errors.length) throw new AggregateError(errors, "Storage shutdown failed");
            });
        }
        return this._closing;
    }
}
