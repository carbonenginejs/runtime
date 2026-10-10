/** Shared storage records are plain structured-cloneable values, never live engine objects. */
export function storageAddress(namespace, collection, key)
{
    for (const value of [namespace, collection])
    {
        if (typeof value !== "string" || !value.length) throw new TypeError("Storage namespace and collection require nonempty strings");
    }
    if (!(typeof key === "string" || Number.isSafeInteger(key))) throw new TypeError("Storage keys must be strings or safe integers");
    return { namespace, collection, key };
}

/** Collision-free identity, retaining the difference between numeric and string keys. */
export function storageKey(address)
{
    const { namespace, collection, key } = storageAddress(address.namespace, address.collection, address.key);
    return JSON.stringify([namespace, collection, key]);
}

/** Select a namespace and optionally a collection without interpreting the user's keys. */
export function matchesStorage(record, query)
{
    return record.address.namespace === query.namespace
        && (query.collection === undefined || record.address.collection === query.collection);
}

/** Portable error details can be returned across a worker or Electron bridge. */
export function storageError(error)
{
    return { name: error.name || "Error", message: String(error.message || error) };
}

/**
 * Data-only estimate in bytes, excluding object, reference and storage overhead.
 * Binary payloads use their exposed byte lengths; views count only their span.
 * Structured values count UTF-16 string code units, float64 numbers/timestamps,
 * one byte per boolean and decimal characters for BigInts. Containers add only
 * their contents (including object keys); repeated objects and null add zero.
 * These conventions are an estimate, not a backend encoding or quota measure.
 */
export function estimateStorageSize(value, seen = new Set())
{
    if (value === null || value === undefined) return 0;
    if (typeof value === "string") return value.length * 2;
    if (typeof value === "number") return 8;
    if (typeof value === "boolean") return 1;
    if (typeof value === "bigint") return value.toString().length;
    if (typeof value !== "object") throw new TypeError("Storage values must be structured-cloneable data");
    if (seen.has(value)) return 0;
    seen.add(value);
    if (value instanceof ArrayBuffer) return value.byteLength;
    if (ArrayBuffer.isView(value)) return value.byteLength;
    if (typeof Blob !== "undefined" && value instanceof Blob) return value.size;
    if (value instanceof Date) return 8;
    let size = 0;
    if (value instanceof Map)
    {
        for (const [key, item] of value) size += estimateStorageSize(key, seen) + estimateStorageSize(item, seen);
    }
    else if (value instanceof Set || Array.isArray(value))
    {
        for (const item of value) size += estimateStorageSize(item, seen);
    }
    else
    {
        if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
            throw new TypeError("Export class instances to values before storing them");
        for (const [key, item] of Object.entries(value)) size += estimateStorageSize(key, seen) + estimateStorageSize(item, seen);
    }
    return size;
}

/** Reject invalid limits at composition time. Infinity is an explicit host policy. */
export function storageLimit(value, name)
{
    if (value !== Infinity && (!Number.isSafeInteger(value) || value < 0)) throw new RangeError(`Invalid ${name}`);
    return value;
}
