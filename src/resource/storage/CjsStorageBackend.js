/**
 * @typedef {object} CjsStorageAddress
 * @property {string} namespace Nonempty owner namespace; one service writes one namespace.
 * @property {string} collection Nonempty collection name inside the namespace.
 * @property {string|number} key A string or a safe integer. `1` and `"1"` are different keys.
 */

/**
 * @typedef {object} CjsStorageRecord
 * @property {CjsStorageAddress} address Where the record lives.
 * @property {string|number} version The caller's schema version; a read must ask for the same one.
 * @property {"saved"|"cache"} kind Saved records are never evicted; cache records may be.
 * @property {string} codec `"native"`, or the id of the codec that encoded `value`.
 * @property {number} codecVersion The codec revision that encoded `value`.
 * @property {*} value The encoded value: structured-cloneable data or bytes.
 * @property {number} estimatedSize Data-only size estimate in bytes (`estimateStorageSize`).
 * @property {number} updatedAt Write time in milliseconds, from the service clock.
 * @property {number|null} expiresAt Expiry time in milliseconds, or null for no expiry.
 */

/**
 * @typedef {object} CjsStorageQuery
 * @property {string} namespace The namespace to list.
 * @property {string} [collection] Restrict to one collection; omitted means every collection.
 */

/**
 * Our base class for storage backends. `CjsStorage` owns the service; a backend
 * only keeps records. Runtime ships memory, IndexedDB and localStorage backends;
 * a host (Node, Electron, a worker bridge) extends this class for anything else.
 * Runtime itself contains no Node or database code.
 *
 * Rules of engagement. A backend MUST:
 * - Treat a record as an opaque envelope (`CjsStorageRecord`) and return what was
 *   written: same address, version, kind, codec, codecVersion, value,
 *   estimatedSize, updatedAt and expiresAt. Never interpret `value`.
 * - Round-trip every value it accepts, or throw from `WriteBatch` when it cannot.
 *   Structured-clone backends accept all structured-cloneable data and bytes;
 *   a narrower backend (localStorage takes JSON and top-level bytes) throws for
 *   the rest and never coerces silently.
 * - Identify a record by its whole address. Numeric and string keys stay distinct,
 *   and key text is never parsed as a path or query.
 * - Apply a `WriteBatch` atomically: all records, or none and a rejection.
 * - When `persistent` is true, resolve `WriteBatch` only after the batch is
 *   durable: a later process must be able to read it.
 * - Return owned copies. A caller mutating a read or listed record must not change
 *   stored data.
 * - Report failure by rejecting. `CjsStorage` turns rejections into
 *   `{ stored, persisted, cached, error }` results; a backend never returns
 *   error objects as values.
 *
 * `CjsStorage` does the rest, and a backend must not repeat it: the memory layer,
 * version checks, TTL expiry, the persistent cache budget and its pruning, codec
 * encoding, and the queue that serialises every operation. A backend therefore
 * sees one operation at a time from each service, but several services (tabs,
 * workers) may share its underlying store.
 */
export class CjsStorageBackend
{
    static className = "CjsStorageBackend";

    /**
     * Whether a successful `WriteBatch` is durable. A subclass declares it; the
     * service reports it as `persisted` and never probes for it.
     *
     * @type {boolean}
     */
    persistent = false;

    /**
     * Read the record at one address.
     *
     * @param {CjsStorageAddress} address The record's address.
     * @returns {Promise<CjsStorageRecord|null>} An owned copy, or null when absent.
     */
    async Read(address)
    {
        throw new Error("CjsStorageBackend.Read must be implemented by a backend subclass");
    }

    /**
     * Write a batch of records atomically, replacing any record at the same address.
     *
     * @param {CjsStorageRecord[]} records Fully encoded records.
     * @returns {Promise<void>} Resolves once the whole batch is stored (and durable, when `persistent`).
     */
    async WriteBatch(records)
    {
        throw new Error("CjsStorageBackend.WriteBatch must be implemented by a backend subclass");
    }

    /**
     * Delete the record at one address. Deleting an absent address succeeds.
     *
     * @param {CjsStorageAddress} address The record's address.
     * @returns {Promise<void>} Resolves once the record is gone.
     */
    async Delete(address)
    {
        throw new Error("CjsStorageBackend.Delete must be implemented by a backend subclass");
    }

    /**
     * Yield the records of one namespace, optionally of one collection. Backends
     * may page; records written by other owners during a listing may or may not
     * appear. There is no snapshot guarantee.
     *
     * @param {CjsStorageQuery} query The namespace and optional collection.
     * @returns {AsyncIterable<CjsStorageRecord>} Owned copies, in any order.
     */
    async *List(query)
    {
        throw new Error("CjsStorageBackend.List must be implemented by a backend subclass");
    }

    /**
     * Release connections. Stored data survives a close. The default has nothing
     * to release.
     *
     * @returns {Promise<void>} Resolves once the backend is closed.
     */
    async Close()
    {
    }
}
