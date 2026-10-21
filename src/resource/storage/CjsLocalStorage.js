import { CjsSchema } from "#schema/CjsSchema";

import { encodeJson, decodeJson } from "../../global/utils/json.js";
import { decodeUtf8 } from "../../global/utils/text.js";
import { CjsStorageBackend } from "./CjsStorageBackend.js";
import { storageKey, matchesStorage } from "./storageRecord.js";

/**
 * @typedef {object} CjsLocalStorageItem
 * @property {object} envelope The record without its value; plain JSON.
 * @property {"json"|"arraybuffer"|"uint8"} encoding How `value` is framed.
 * @property {*} value Plain JSON, or base64 text for bytes.
 */

/**
 * Our small-data Web Storage backend. Carbon's RemoteFileCache is a resource-file
 * cache, not browser application persistence. All records live in one owned item,
 * so a batch write is a single `setItem` replacement: a quota or security failure
 * leaves the previous item intact. No rollback journal or alternate graph format
 * is added.
 *
 * Values must be plain JSON or top-level `Uint8Array`/`ArrayBuffer` bytes. Anything
 * else (nested bytes, BigInt, Map, Date, cycles, nonfinite numbers, undefined) is
 * refused and needs a storage format codec; nothing is coerced silently.
 *
 * Workers supply a host bridge instead: Web Storage is not available there.
 */
export class CjsLocalStorage extends CjsStorageBackend
{
    static className = "CjsLocalStorage";

    /** @type {boolean} Web Storage survives the session. */
    persistent = true;

    /** @type {Storage|null} The borrowed Web Storage object. */
    _storage = null;

    /** @type {string} The one item this backend owns. */
    _key = "";

    /**
     * Bind a Web Storage object. Injection serves tests and hosts; merely accessing
     * the browser default can itself throw.
     *
     * @param {object} [options] Backend options.
     * @param {Storage} [options.storage] A Storage-like object; defaults to `localStorage`.
     * @param {string} [options.name] The item key this backend owns.
     * @throws {TypeError} When the storage lacks getItem/setItem, or the name is empty.
     */
    constructor({ storage = globalThis.localStorage, name = "carbonenginejs-storage" } = {})
    {
        super();

        // Storage is a platform object; checking its shape is not a probe of our own contract.
        if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function")
            throw new TypeError("localStorage backend requires getItem and setItem");
        if (typeof name !== "string" || !name.length) throw new TypeError("localStorage name must be nonempty");

        this._storage = storage;
        this._key = name;
    }

    /**
     * Decode the record at one address.
     *
     * @param {import("./CjsStorageBackend.js").CjsStorageAddress} address The record's address.
     * @returns {Promise<import("./CjsStorageBackend.js").CjsStorageRecord|null>} A decoded copy, or null when absent.
     */
    async Read(address)
    {
        const item = this._Load().get(storageKey(address));
        return item ? decodeRecord(item) : null;
    }

    /**
     * Encode every record before calling `setItem`, so a refused value or a quota
     * failure leaves the old item intact.
     *
     * @param {import("./CjsStorageBackend.js").CjsStorageRecord[]} records Fully encoded records.
     * @returns {Promise<void>} Resolves once the item is replaced.
     * @throws {TypeError} When a value cannot be framed without loss.
     */
    async WriteBatch(records)
    {
        const next = this._Load();
        for (const record of records) next.set(storageKey(record.address), encodeRecord(record));
        this._Save(next);
    }

    /**
     * Remove one address by replacing the owned item.
     *
     * @param {import("./CjsStorageBackend.js").CjsStorageAddress} address The record's address.
     * @returns {Promise<void>} Resolves once the item is replaced, or at once when absent.
     */
    async Delete(address)
    {
        const next = this._Load();
        if (next.delete(storageKey(address))) this._Save(next);
    }

    /**
     * Yield decoded records matching the namespace and optional collection.
     *
     * @param {import("./CjsStorageBackend.js").CjsStorageQuery} query The namespace and optional collection.
     * @returns {AsyncIterable<import("./CjsStorageBackend.js").CjsStorageRecord>} Matching records.
     */
    async *List(query)
    {
        for (const item of this._Load().values())
        {
            const record = decodeRecord(item);
            if (matchesStorage(record, query)) yield record;
        }
    }

    /**
     * Validate and index the owned item. A missing item is an empty store; a
     * corrupt one throws and is never replaced as if empty.
     *
     * @returns {Map<string, CjsLocalStorageItem>} Items by storage key.
     * @throws {TypeError} When the item is corrupt, unsupported or holds duplicates.
     */
    _Load()
    {
        const text = this._storage.getItem(this._key);
        if (text === null) return new Map();

        const document = decodeJson(text);
        if (document?.format !== "cjs.localstorage" || document.version !== 1 || !Array.isArray(document.records))
            throw new TypeError("Unsupported or corrupt localStorage document");

        const records = new Map();
        for (const item of document.records)
        {
            const record = decodeRecord(item);
            const key = storageKey(record.address);
            if (records.has(key)) throw new TypeError("Duplicate localStorage record");
            records.set(key, item);
        }
        return records;
    }

    /**
     * Serialise the complete record map and replace the owned item.
     *
     * @param {Map<string, CjsLocalStorageItem>} records Items by storage key.
     * @returns {void}
     */
    _Save(records)
    {
        const document = { format: "cjs.localstorage", version: 1, records: Array.from(records.values()) };
        const text = decodeUtf8(encodeJson(document, { space: 0, trailingNewline: false }));
        this._storage.setItem(this._key, text);
    }
}

/**
 * Frame one record for the owned item. Top-level bytes become base64 text; any
 * other value must already be plain JSON. Graph markers are not interpreted.
 *
 * @param {import("./CjsStorageBackend.js").CjsStorageRecord} record The record to frame.
 * @returns {CjsLocalStorageItem} The framed item.
 * @throws {TypeError} When the envelope or value is not loss-free JSON.
 */
function encodeRecord(record)
{
    const { value, ...envelope } = record;
    assertJson(envelope);

    if (value instanceof ArrayBuffer || value instanceof Uint8Array)
    {
        const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : value;

        // Bounded chunks keep String.fromCharCode under the engine's argument limit.
        let text = "";
        for (let offset = 0; offset < bytes.length; offset += 8192)
            text += String.fromCharCode(...bytes.subarray(offset, offset + 8192));

        return { envelope, encoding: value instanceof ArrayBuffer ? "arraybuffer" : "uint8", value: btoa(text) };
    }

    assertJson(value);
    return { envelope, encoding: "json", value };
}

/**
 * Unframe one item back into a record.
 *
 * @param {CjsLocalStorageItem} item The framed item.
 * @returns {import("./CjsStorageBackend.js").CjsStorageRecord} The record.
 * @throws {TypeError} When the item is malformed or uses an unknown encoding.
 */
function decodeRecord(item)
{
    if (!item || !item.envelope || !Object.hasOwn(item, "value")) throw new TypeError("Invalid localStorage record");
    assertJson(item.envelope);

    let value;
    if (item.encoding === "json")
    {
        assertJson(item.value);
        value = item.value;
    }
    else if (item.encoding === "arraybuffer" || item.encoding === "uint8")
    {
        if (typeof item.value !== "string") throw new TypeError("Invalid localStorage bytes");

        const text = atob(item.value);
        const bytes = Uint8Array.from(text, character => character.charCodeAt(0));
        value = item.encoding === "arraybuffer" ? bytes.buffer : bytes;
    }
    else
    {
        throw new TypeError("Unsupported localStorage encoding");
    }

    return { ...item.envelope, value };
}

/**
 * Refuse JSON's silent loss of undefined, nonfinite numbers, -0, prototypes and
 * shared identity.
 *
 * @param {*} value The value to check.
 * @param {Set<object>} [seen] Objects already visited.
 * @returns {void}
 * @throws {TypeError} When the value would not survive a JSON round trip.
 */
function assertJson(value, seen = new Set())
{
    if (value === null || typeof value === "string" || typeof value === "boolean") return;
    if (typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0)) return;
    if (typeof value !== "object") throw new TypeError("Value requires a storage format codec for localStorage");

    if (seen.has(value)) throw new TypeError("Shared/cyclic values require a storage format codec for localStorage");
    seen.add(value);

    if (Array.isArray(value))
    {
        // A dense array has exactly its indices plus `length`.
        if (Reflect.ownKeys(value).length !== value.length + 1) throw new TypeError("Non-JSON array requires a storage format codec");
        for (let i = 0; i < value.length; i++) assertJson(value[i], seen);
        return;
    }

    if (Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError("Non-JSON value requires a storage format codec");

    for (const key of Reflect.ownKeys(value))
    {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (typeof key !== "string" || !descriptor.enumerable || !Object.hasOwn(descriptor, "value"))
            throw new TypeError("Non-JSON property requires a storage format codec");
        assertJson(descriptor.value, seen);
    }
}

CjsSchema.meta.define("CjsLocalStorage")(CjsLocalStorage);
