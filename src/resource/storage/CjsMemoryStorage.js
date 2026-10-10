import { matchesStorage, storageKey, storageLimit, estimateStorageSize } from "./storageRecord.js";

/** Our host-neutral bounded store. This is session storage, never durable persistence. */
export class CjsMemoryStorage
{
    static className = "CjsMemoryStorage";
    capabilities = { persistent: false, atomicBatch: true, binary: true };
    records = new Map();
    maxBytes = 0;
    maxEntries = 0;
    /** Data-only estimate in bytes, excluding allocation and storage overhead. */
    estimatedSize = 0;

    /** Configure host-owned limits; maxBytes limits estimatedSize, not measured heap use; saved records are protected from cache eviction. */
    constructor({ maxBytes = 64 * 1024 * 1024, maxEntries = 2048 } = {})
    {
        this.maxBytes = storageLimit(maxBytes, "memory byte budget");
        this.maxEntries = storageLimit(maxEntries, "memory entry budget");
    }

    /** Return an owned snapshot and promote it in the least-recently-used order. */
    async Read(address)
    {
        const key = storageKey(address);
        const entry = this.records.get(key);
        if (!entry) return null;
        this.records.delete(key);
        this.records.set(key, entry);
        return structuredClone(entry.record);
    }

    /** Atomically accept the batch or retain the previous store. Only cache records are evictable. */
    async WriteBatch(records)
    {
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

    /** Delete exactly one identity. */
    async Delete(address)
    {
        const key = storageKey(address);
        const entry = this.records.get(key);
        if (entry) this.estimatedSize -= entry.estimatedSize;
        this.records.delete(key);
    }

    /** Iterate owned records from one namespace, optionally restricted to a collection. */
    async *List(query)
    {
        for (const { record } of this.records.values())
        {
            if (matchesStorage(record, query)) yield structuredClone(record);
        }
    }

    /** Release session data. */
    async Close()
    {
        this.records.clear();
        this.estimatedSize = 0;
    }
}
