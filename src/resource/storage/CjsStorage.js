import { CjsMemoryStorage } from "./CjsMemoryStorage.js";
import { storageAddress, storageError, storageKey, storageLimit, estimateStorageSize } from "./storageRecord.js";

/**
 * @typedef {object} CjsStorageCodec
 * @property {string} id Codec identity; stored with each record it encodes.
 * @property {number} version Codec revision; old records keep the revision that wrote them.
 * @property {(value: *) => (*|Promise<*>)} Encode Turns a value into storable data or bytes.
 * @property {(value: *) => (*|Promise<*>)} Decode Reverses `Encode`.
 */

/**
 * @typedef {object} CjsStorageWriteResult
 * @property {boolean} stored True when the value is held somewhere: backend or memory.
 * @property {boolean} persisted True only when a persistent backend committed it.
 * @property {boolean} cached True when the memory layer holds a copy.
 * @property {{name: string, message: string}|null} error The first failure, as portable details.
 */

/**
 * @typedef {object} CjsStorageReadResult
 * @property {boolean} found Whether a current value was found.
 * @property {*} [value] The decoded value, when found.
 * @property {string|number} [version] The record's version, when found.
 * @property {boolean} [persisted] Whether the value came from, or is held by, a persistent backend.
 * @property {number} [updatedAt] Write time in milliseconds, when found.
 * @property {"missing"|"version"|"expired"|"unavailable"} [reason] Why nothing was found.
 * @property {{name: string, message: string}|null} [error] Backend failure details, for `unavailable`.
 */

/**
 * @typedef {object} CjsStorageWriteEntry
 * @property {string|number} key The record key within the collection.
 * @property {*} value Structured-cloneable data; live engine objects must be exported first.
 * @property {string|number} [version] Defaults to 1.
 * @property {"saved"|"cache"} [kind] Defaults to `"saved"`.
 * @property {string} [codec] Defaults to `"native"` (structured clone, no codec).
 * @property {number} [codecVersion] Defaults to 1.
 * @property {number|null} [ttlMs] Cache records only: expiry after this many milliseconds.
 */

/**
 * Our shared storage service. A bounded memory layer is always present;
 * persistence comes from an injected `CjsStorageBackend` subclass. The service
 * owns versions, TTL expiry, the persistent cache budget, codecs and the queue
 * that serialises every operation; the backend only keeps records. Codecs see
 * plain values or bytes, and hydrating engine objects remains the consumer's job.
 *
 * Nothing here touches browser globals, so a Node or worker host uses exactly
 * this constructor with its own backend.
 */
export class CjsStorage
{
    static className = "CjsStorage";

    /** @type {string} The one namespace this service reads and writes. */
    namespace = "";

    /** @type {import("./CjsStorageBackend.js").CjsStorageBackend|null} */
    backend = null;

    /** @type {CjsMemoryStorage|null} The memory layer. */
    memory = null;

    /** @type {Map<string, CjsStorageCodec>} Installed codecs by `id:version`. */
    codecs = new Map();

    /** @type {(() => number)|null} The clock, in milliseconds. */
    now = null;

    /** @type {Promise<void>} The tail of the operation queue. */
    pending = Promise.resolve();

    /** @type {boolean} */
    _closed = false;

    /** @type {Promise<void>|null} */
    _closing = null;

    /** @type {number} Budget for persistent cache `estimatedSize` totals, not database quota usage. */
    maxPersistentCacheBytes = 0;

    /**
     * Compose the service. Nothing is opened until the first operation.
     *
     * @param {object} options Service options.
     * @param {string} options.namespace Nonempty namespace this service owns.
     * @param {import("./CjsStorageBackend.js").CjsStorageBackend|null} [options.backend] Persistence, or null for memory only.
     * @param {boolean} [options.persistence] False ignores `backend`, for a memory-only session.
     * @param {object} [options.memory] Options for the memory layer (`maxBytes`, `maxEntries`).
     * @param {CjsStorageCodec[]} [options.codecs] Codecs to install; ids must be unique per version.
     * @param {() => number} [options.now] Clock in milliseconds.
     * @param {number} [options.maxPersistentCacheBytes] Persistent cache budget; `Infinity` is unbounded.
     * @throws {TypeError} For an invalid namespace or codec declaration.
     */
    constructor({ namespace, backend = null, persistence = true, memory = {}, codecs = [], now = Date.now,
        maxPersistentCacheBytes = 256 * 1024 * 1024 } = {})
    {
        storageAddress(namespace, "validation", "validation");

        this.namespace = namespace;
        this.backend = persistence ? backend : null;
        this.memory = new CjsMemoryStorage(memory);
        this.now = now;
        this.maxPersistentCacheBytes = storageLimit(maxPersistentCacheBytes, "persistent cache budget");

        for (const codec of codecs)
        {
            if (!codec.id || !Number.isSafeInteger(codec.version))
                throw new TypeError("Storage codec requires an id and an integer version");

            const key = `${codec.id}:${codec.version}`;
            if (codec.id === "native" || this.codecs.has(key)) throw new TypeError(`Duplicate storage codec ${key}`);
            this.codecs.set(key, codec);
        }
    }

    /**
     * Read a versioned record. An unavailable backend is reported apart from an
     * ordinary miss.
     *
     * @param {string} collection Collection name.
     * @param {string|number} key Record key.
     * @param {object} [options] Read options.
     * @param {string|number} [options.version] The version the caller understands; defaults to 1.
     * @returns {Promise<CjsStorageReadResult>} The value, or why there is none.
     */
    async Read(collection, key, { version = 1 } = {})
    {
        return this._Enqueue(() => this._Read(collection, key, version));
    }

    /**
     * Resolve a versioned record from memory or the backend, and refresh the
     * memory layer.
     *
     * @param {string} collection Collection name.
     * @param {string|number} key Record key.
     * @param {string|number} version Required version.
     * @returns {Promise<CjsStorageReadResult>} The value, or why there is none.
     */
    async _Read(collection, key, version)
    {
        const address = storageAddress(this.namespace, collection, key);

        // Memory first, then the backend.
        let entry = await this.memory.Read(address);
        let persisted = entry?.persisted === true;
        if (!entry && this.backend)
        {
            try
            {
                entry = await this.backend.Read(address);
                persisted = this.backend.persistent;
            }
            catch (error)
            {
                return { found: false, reason: "unavailable", error: storageError(error) };
            }
        }
        if (!entry) return { found: false, reason: "missing", error: null };

        // A wrong version or an expired record is a miss, and leaves memory.
        const expired = entry.expiresAt !== null && entry.expiresAt <= this.now();
        if (entry.version !== version || expired)
        {
            await this.memory.Delete(address);
            return { found: false, reason: entry.version !== version ? "version" : "expired", error: null };
        }

        const value = entry.codec === "native"
            ? entry.value
            : await this._Codec(entry.codec, entry.codecVersion).Decode(entry.value);

        // A memory copy of a durable record is evictable cache.
        try
        {
            await this.memory.WriteBatch([{ ...entry, kind: persisted ? "cache" : entry.kind, persisted }]);
        }
        catch
        {
            // A read larger than the memory budget can still succeed.
        }

        return { found: true, value, version: entry.version, persisted, updatedAt: entry.updatedAt };
    }

    /**
     * Write one entry.
     *
     * @param {string} collection Collection name.
     * @param {string|number} key Record key.
     * @param {*} value Structured-cloneable data.
     * @param {Omit<CjsStorageWriteEntry, "key"|"value">} [options] Version, kind, codec and TTL.
     * @returns {Promise<CjsStorageWriteResult>} Where the value now lives.
     */
    async Write(collection, key, value, options = {})
    {
        return this.WriteBatch(collection, [{ ...options, key, value }]);
    }

    /**
     * Write several entries in one backend batch. Inputs are cloned at the call,
     * so later caller mutation cannot change what is written.
     *
     * @param {string} collection Collection name.
     * @param {CjsStorageWriteEntry[]} entries The entries.
     * @returns {Promise<CjsStorageWriteResult>} Where the values now live.
     */
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

    /**
     * Encode every record before touching the backend, then write the backend,
     * then memory. A memory-only copy is never reported as persisted.
     *
     * @param {string} collection Collection name.
     * @param {CjsStorageWriteEntry[]} entries Owned entries.
     * @returns {Promise<CjsStorageWriteResult>} Where the values now live.
     */
    async _WriteBatch(collection, entries)
    {
        // Validate and encode the whole batch first.
        const records = [];
        for (const { key, value, version = 1, kind = "saved", codec = "native", codecVersion = 1, ttlMs = null } of entries)
        {
            if (kind !== "saved" && kind !== "cache") throw new TypeError("Storage kind must be saved or cache");

            const validVersion = (Number.isSafeInteger(version) && version >= 0) || (typeof version === "string" && version.length);
            if (!validVersion) throw new TypeError("Storage version requires a nonempty string or nonnegative integer");

            if (ttlMs !== null && (kind !== "cache" || !Number.isFinite(ttlMs) || ttlMs < 0))
                throw new TypeError("Only cache records may expire, with a nonnegative TTL");

            estimateStorageSize(value);
            const encoded = codec === "native" ? structuredClone(value) : await this._Codec(codec, codecVersion).Encode(value);
            const updatedAt = this.now();

            records.push({
                address: storageAddress(this.namespace, collection, key),
                version,
                kind,
                codec,
                codecVersion,
                value: encoded,
                estimatedSize: estimateStorageSize(encoded),
                updatedAt,
                expiresAt: ttlMs === null ? null : updatedAt + ttlMs
            });
        }

        // Backend: prune the cache budget, then commit the batch.
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
                persisted = this.backend.persistent;
            }
            catch (cause)
            {
                error = storageError(cause);
            }
        }

        // Memory: a copy of a durable record is evictable cache.
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
            // If neither layer accepted the batch, the previous saved values remain.
            if (backendStored) for (const record of records) await this.memory.Delete(record.address);
        }

        return { stored: backendStored || cached, persisted, cached, error };
    }

    /**
     * Keep this namespace's persistent cache records within budget before a
     * write, removing expired records and then the oldest written. Saved records
     * and other namespaces are never touched.
     *
     * @param {import("./CjsStorageBackend.js").CjsStorageRecord[]} records The batch about to be written.
     * @returns {Promise<void>} Resolves once there is room.
     * @throws {Error} `QuotaExceededError` when the batch alone exceeds the budget.
     */
    async _PruneCache(records)
    {
        if (!records.some(record => record.kind === "cache")) return;

        // The incoming cache records count against the budget first.
        const replacements = new Set(records.map(record => storageKey(record.address)));
        let estimatedSize = 0;
        for (const record of records) if (record.kind === "cache") estimatedSize += record.estimatedSize;
        if (estimatedSize > this.maxPersistentCacheBytes)
        {
            const error = new Error("Batch exceeds persistent cache budget");
            error.name = "QuotaExceededError";
            throw error;
        }

        // Gather the stored cache records, deleting expired ones on the way.
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

        // Remove the oldest written until the batch fits.
        candidates.sort((a, b) => a.updatedAt - b.updatedAt);
        for (const record of candidates)
        {
            if (estimatedSize <= this.maxPersistentCacheBytes) break;
            await this.backend.Delete(record.address);
            estimatedSize -= record.estimatedSize;
        }
    }

    /**
     * Delete one record from the backend, then from memory. A failed delete is
     * reported, never disguised.
     *
     * @param {string} collection Collection name.
     * @param {string|number} key Record key.
     * @returns {Promise<{deleted: boolean, error: {name: string, message: string}|null}>} The outcome.
     */
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
            catch (error)
            {
                return { deleted: false, error: storageError(error) };
            }
        });
    }

    /**
     * List the live identities in one collection, or in the whole namespace. The
     * array is captured before later queued operations run.
     *
     * @param {string} [collection] Collection name; omitted lists the namespace.
     * @returns {Promise<Array<{namespace: string, collection: string, key: string|number, version: string|number, updatedAt: number}>>} Identities.
     */
    async List(collection)
    {
        return this._Enqueue(() => this._List(collection));
    }

    /**
     * Collect matching live identities from memory and the backend without
     * duplicates.
     *
     * @param {string} [collection] Collection name.
     * @returns {Promise<Array<object>>} Identities.
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

    /**
     * Purge this namespace. Saved records are protected unless included.
     * Deletions are not a transaction: a failure can leave a partial purge.
     *
     * @param {object} [options] Purge options.
     * @param {boolean} [options.includeSaved] Also delete saved records.
     * @returns {Promise<{deleted: number}>} How many identities were deleted.
     */
    async Purge({ includeSaved = false } = {})
    {
        if (typeof includeSaved !== "boolean") throw new TypeError("includeSaved must be boolean");

        return this._Enqueue(async () =>
        {
            // Either copy of an identity may mark it saved.
            const records = new Map();
            for (const source of [this.backend, this.memory])
            {
                if (!source) continue;

                for await (const record of source.List({ namespace: this.namespace }))
                {
                    const key = storageKey(record.address);
                    const previous = records.get(key);
                    records.set(key, { address: record.address, saved: record.kind === "saved" || previous?.saved === true });
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

    /**
     * Resolve the exact stored codec revision. Changing a default never rewrites
     * old records.
     *
     * @param {string} id Codec id.
     * @param {number} version Codec revision.
     * @returns {CjsStorageCodec} The installed codec.
     * @throws {Error} When that revision is not installed.
     */
    _Codec(id, version)
    {
        const codec = this.codecs.get(`${id}:${version}`);
        if (!codec) throw new Error(`Storage codec ${id}:${version} is not installed`);
        return codec;
    }

    /**
     * Queue a whole operation, including reads and cache fills. A rejection never
     * poisons the tail.
     *
     * @template T
     * @param {() => Promise<T>} run The operation.
     * @returns {Promise<T>} Its result.
     */
    _Enqueue(run)
    {
        if (this._closed) return Promise.reject(new Error("Storage is closed"));

        const operation = this.pending.then(run);
        this.pending = operation.catch(() => {});
        return operation;
    }

    /**
     * Stop accepting work at once, drain accepted operations, and close memory and
     * the backend once each. Repeated calls return the same promise.
     *
     * @returns {Promise<void>} Resolves once both are closed.
     * @throws {AggregateError} When either close fails.
     */
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
                    try
                    {
                        await adapter.Close();
                    }
                    catch (error)
                    {
                        errors.push(error);
                    }
                }
                if (errors.length) throw new AggregateError(errors, "Storage shutdown failed");
            });
        }
        return this._closing;
    }
}
