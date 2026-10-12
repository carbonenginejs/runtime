import { CjsStorageBackend } from "./CjsStorageBackend.js";
import { matchesStorage, storageKey, storageLimit, estimateStorageSize } from "./storageRecord.js";

/**
 * Our host-neutral bounded store. This is session storage, never durable
 * persistence. `CjsStorage` always keeps one as its memory layer; it can also
 * serve as a backend where nothing should outlive the session.
 *
 * Records are kept in least-recently-used order. Only cache records are evicted
 * to make room; saved records are protected, and a batch that cannot fit without
 * evicting them is refused.
 */
export class CjsMemoryStorage extends CjsStorageBackend
{
    static className = "CjsMemoryStorage";

    /** @type {boolean} Session memory never survives the process. */
    persistent = false;

    /** @type {Map<string, {record: import("./CjsStorageBackend.js").CjsStorageRecord, estimatedSize: number}>} */
    records = new Map();

    /** @type {number} Budget for `estimatedSize`, in bytes. */
    maxBytes = 0;

    /** @type {number} Maximum number of records held. */
    maxEntries = 0;

    /** @type {number} Data-only estimate in bytes, excluding allocation and storage overhead. */
    estimatedSize = 0;

    /**
     * Configure host-owned limits. `maxBytes` limits the data-only estimate, not
     * measured heap use.
     *
     * @param {object} [options] Limits.
     * @param {number} [options.maxBytes] Byte budget; `Infinity` is an explicit unbounded policy.
     * @param {number} [options.maxEntries] Record budget; `Infinity` is an explicit unbounded policy.
     */
    constructor({ maxBytes = 64 * 1024 * 1024, maxEntries = 2048 } = {})
    {
        super();
        this.maxBytes = storageLimit(maxBytes, "memory byte budget");
        this.maxEntries = storageLimit(maxEntries, "memory entry budget");
    }

    /**
     * Return an owned copy and promote the record in least-recently-used order.
     *
     * @param {import("./CjsStorageBackend.js").CjsStorageAddress} address The record's address.
     * @returns {Promise<import("./CjsStorageBackend.js").CjsStorageRecord|null>} A copy, or null when absent.
     */
    async Read(address)
    {
        const key = storageKey(address);
        const entry = this.records.get(key);
        if (!entry) return null;

        // Re-inserting moves the record to the most recently used end.
        this.records.delete(key);
        this.records.set(key, entry);

        return structuredClone(entry.record);
    }

    /**
     * Accept the whole batch or keep the previous store. Cache records may be
     * evicted, oldest first, to make room; incoming and saved records never are.
     *
     * @param {import("./CjsStorageBackend.js").CjsStorageRecord[]} records Fully encoded records.
     * @returns {Promise<void>} Resolves once the batch is stored.
     * @throws {Error} `QuotaExceededError` when the batch cannot fit within the budgets.
     */
    async WriteBatch(records)
    {
        // Build the next store aside, so a refused batch leaves the current one untouched.
        const next = new Map(this.records);
        const incoming = new Set();
        let estimatedSize = this.estimatedSize;

        for (const source of records)
        {
            const key = storageKey(source.address);
            const record = structuredClone(source);
            const recordEstimatedSize = estimateStorageSize(record);

            estimatedSize -= next.get(key)?.estimatedSize ?? 0;
            next.delete(key);
            next.set(key, { record, estimatedSize: recordEstimatedSize });
            incoming.add(key);
            estimatedSize += recordEstimatedSize;
        }

        // Evict the least recently used cache records until the batch fits.
        for (const [key, entry] of next)
        {
            if (estimatedSize <= this.maxBytes && next.size <= this.maxEntries) break;
            if (incoming.has(key) || entry.record.kind !== "cache") continue;

            next.delete(key);
            estimatedSize -= entry.estimatedSize;
        }

        if (estimatedSize > this.maxBytes || next.size > this.maxEntries)
        {
            const error = new Error("Storage memory budget exceeded");
            error.name = "QuotaExceededError";
            throw error;
        }

        this.records = next;
        this.estimatedSize = estimatedSize;
    }

    /**
     * Delete exactly one identity.
     *
     * @param {import("./CjsStorageBackend.js").CjsStorageAddress} address The record's address.
     * @returns {Promise<void>} Resolves once the record is gone.
     */
    async Delete(address)
    {
        const key = storageKey(address);
        const entry = this.records.get(key);
        if (entry) this.estimatedSize -= entry.estimatedSize;
        this.records.delete(key);
    }

    /**
     * Yield owned copies from one namespace, optionally one collection.
     *
     * @param {import("./CjsStorageBackend.js").CjsStorageQuery} query The namespace and optional collection.
     * @returns {AsyncIterable<import("./CjsStorageBackend.js").CjsStorageRecord>} Matching records.
     */
    async *List(query)
    {
        for (const { record } of this.records.values())
        {
            if (matchesStorage(record, query)) yield structuredClone(record);
        }
    }

    /**
     * Release session data.
     *
     * @returns {Promise<void>} Resolves once the store is empty.
     */
    async Close()
    {
        this.records.clear();
        this.estimatedSize = 0;
    }
}
