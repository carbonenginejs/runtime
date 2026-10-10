import { encodeJson, decodeJson } from "../../global/utils/json.js";
import { decodeUtf8 } from "../../global/utils/text.js";
import { storageKey, matchesStorage } from "./storageRecord.js";

/**
 * Our small-data Web Storage adapter. Carbon's RemoteFileCache is a resource-file
 * cache, not browser application persistence. One owned item makes batch writes
 * a single replacement; no rollback journal or alternate graph format is added.
 * Workers supply a host bridge instead: Web Storage is not available there.
 */
export class CjsLocalStorage
{
    static className = "CjsLocalStorage";
    capabilities = { persistent: true, atomicBatch: true, binary: true };
    _storage = null;
    _key = "";

    /** Inject Storage for tests/hosts. Accessing the browser default can itself fail. */
    constructor({ storage = globalThis.localStorage, name = "carbonenginejs-storage" } = {})
    {
        if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function")
            throw new TypeError("localStorage backend requires getItem and setItem");
        if (typeof name !== "string" || !name.length) throw new TypeError("localStorage name must be nonempty");
        this._storage = storage;
        this._key = name;
    }

    /** Decode the record at one address or return null when absent. */
    async Read(address)
    {
        const item = this._Load().get(storageKey(address));
        return item ? decodeRecord(item) : null;
    }

    /** Prepare everything before setItem; quota/security errors leave the old item intact. */
    async WriteBatch(records)
    {
        const next = this._Load();
        for (const record of records) next.set(storageKey(record.address), encodeRecord(record));
        this._Save(next);
    }

    /** Remove one address by replacing the owned storage document. */
    async Delete(address)
    {
        const next = this._Load();
        if (next.delete(storageKey(address))) this._Save(next);
    }

    /** Yield decoded records matching the namespace and collection query. */
    async *List(query)
    {
        for (const item of this._Load().values())
        {
            const record = decodeRecord(item);
            if (matchesStorage(record, query)) yield record;
        }
    }

    /** Borrowed browser storage has no connection to close. */
    async Close() {}

    /** Validate and index the owned document, treating a missing item as empty. */
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

    /** Serialize the complete record map and replace the owned Web Storage item. */
    _Save(records)
    {
        const document = { format: "cjs.localstorage", version: 1, records: Array.from(records.values()) };
        this._storage.setItem(this._key, decodeUtf8(encodeJson(document, { space: 0, trailingNewline: false })));
    }
}

/** Internal backend framing preserves encoded bytes without interpreting graph markers. */
function encodeRecord(record)
{
    const { value, ...envelope } = record;
    assertJson(envelope);
    if (value instanceof ArrayBuffer || value instanceof Uint8Array)
    {
        const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : value;
        let text = "";
        for (let offset = 0; offset < bytes.length; offset += 8192)
            text += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
        return { envelope, encoding: value instanceof ArrayBuffer ? "arraybuffer" : "uint8", value: btoa(text) };
    }
    assertJson(value);
    return { envelope, encoding: "json", value };
}

function decodeRecord(item)
{
    if (!item || !item.envelope || !Object.hasOwn(item, "value")) throw new TypeError("Invalid localStorage record");
    assertJson(item.envelope);
    let value;
    if (item.encoding === "json") { assertJson(item.value); value = item.value; }
    else if (item.encoding === "arraybuffer" || item.encoding === "uint8")
    {
        if (typeof item.value !== "string") throw new TypeError("Invalid localStorage bytes");
        const text = atob(item.value);
        const bytes = Uint8Array.from(text, character => character.charCodeAt(0));
        value = item.encoding === "arraybuffer" ? bytes.buffer : bytes;
    }
    else throw new TypeError("Unsupported localStorage encoding");
    return { ...item.envelope, value };
}

/** Refuse JSON's silent loss of undefined, nonfinite numbers, prototypes and identity. */
function assertJson(value, seen = new Set())
{
    if (value === null || typeof value === "string" || typeof value === "boolean") return;
    if (typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0)) return;
    if (typeof value !== "object") throw new TypeError("Value requires a storage format codec for localStorage");
    if (seen.has(value)) throw new TypeError("Shared/cyclic values require a storage format codec for localStorage");
    seen.add(value);
    if (Array.isArray(value))
    {
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
