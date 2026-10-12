/**
 * Shared storage record helpers. Records are plain structured-cloneable values,
 * never live engine objects.
 */

/**
 * Validate and build an address.
 *
 * @param {string} namespace Nonempty namespace.
 * @param {string} collection Nonempty collection.
 * @param {string|number} key A string or a safe integer.
 * @returns {import("./CjsStorageBackend.js").CjsStorageAddress} The address.
 * @throws {TypeError} For an empty namespace or collection, or an invalid key.
 */
export function storageAddress(namespace, collection, key)
{
    for (const value of [namespace, collection])
    {
        if (typeof value !== "string" || !value.length) throw new TypeError("Storage namespace and collection require nonempty strings");
    }
    if (!(typeof key === "string" || Number.isSafeInteger(key))) throw new TypeError("Storage keys must be strings or safe integers");

    return { namespace, collection, key };
}

/**
 * Collision-free identity text for an address. Numeric and string keys stay
 * distinct.
 *
 * @param {import("./CjsStorageBackend.js").CjsStorageAddress} address The address.
 * @returns {string} The identity.
 * @throws {TypeError} For an invalid address.
 */
export function storageKey(address)
{
    const { namespace, collection, key } = storageAddress(address.namespace, address.collection, address.key);
    return JSON.stringify([namespace, collection, key]);
}

/**
 * Whether a record belongs to a namespace and, when given, a collection. The
 * user's keys are not interpreted.
 *
 * @param {import("./CjsStorageBackend.js").CjsStorageRecord} record The record.
 * @param {import("./CjsStorageBackend.js").CjsStorageQuery} query The namespace and optional collection.
 * @returns {boolean} True when it matches.
 */
export function matchesStorage(record, query)
{
    if (record.address.namespace !== query.namespace) return false;
    return query.collection === undefined || record.address.collection === query.collection;
}

/**
 * Portable error details that can cross a worker or Electron bridge.
 *
 * @param {*} error The thrown value.
 * @returns {{name: string, message: string}} Its name and message.
 */
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
 *
 * @param {*} value The value to estimate.
 * @param {Set<object>} [seen] Objects already counted.
 * @returns {number} The estimate in bytes.
 * @throws {TypeError} For functions, symbols or class instances.
 */
export function estimateStorageSize(value, seen = new Set())
{
    // Scalars.
    if (value === null || value === undefined) return 0;
    if (typeof value === "string") return value.length * 2;
    if (typeof value === "number") return 8;
    if (typeof value === "boolean") return 1;
    if (typeof value === "bigint") return value.toString().length;
    if (typeof value !== "object") throw new TypeError("Storage values must be structured-cloneable data");

    // Repeated objects count once.
    if (seen.has(value)) return 0;
    seen.add(value);

    // Bytes and leaf objects.
    if (value instanceof ArrayBuffer) return value.byteLength;
    if (ArrayBuffer.isView(value)) return value.byteLength;
    if (typeof Blob !== "undefined" && value instanceof Blob) return value.size;
    if (value instanceof Date) return 8;

    // Containers count their contents.
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
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) throw new TypeError("Export class instances to values before storing them");

        for (const [key, item] of Object.entries(value)) size += estimateStorageSize(key, seen) + estimateStorageSize(item, seen);
    }
    return size;
}

/**
 * Reject an invalid limit at composition time. `Infinity` is an explicit host
 * policy.
 *
 * @param {number} value The limit.
 * @param {string} name What it limits, for the error message.
 * @returns {number} The limit.
 * @throws {RangeError} For a negative, fractional or unsafe limit.
 */
export function storageLimit(value, name)
{
    if (value !== Infinity && (!Number.isSafeInteger(value) || value < 0)) throw new RangeError(`Invalid ${name}`);
    return value;
}
