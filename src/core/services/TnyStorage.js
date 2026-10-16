import { CjsSchema } from "#schema/CjsSchema";

import { CjsStorage } from "../../resource/storage/CjsStorage.js";
import { TnyStore } from "./TnyStore.js";

/**
 * Our host-owned storage facade. Carbon's RemoteFileCache caches resource files;
 * db/StringStore interns database values. Neither owns these application stores.
 * CjsStorage supplies the existing injected backend and memory implementation.
 */
export class TnyStorage
{
    _storage = null;
    _stores = new Map();
    _closed = false;
    _closing = null;

    /**
     * Construct the shared storage service with host namespace and backend
     * options.
     */
    constructor(options = {})
    {
        this._storage = new CjsStorage({ namespace: "tny", ...options });
    }

    /** Stable names survive sessions; obtaining a handle does not open a database. */
    CreateStore(name)
    {
        this._GetStorage();
        if (typeof name !== "string" || !name.trim() || name !== name.trim())
            throw new TypeError("Store name must be a nonempty, trimmed string");
        if (!this._stores.has(name)) this._stores.set(name, new TnyStore(this, name));
        return this._stores.get(name);
    }

    /** Includes persisted stores that have not been requested in this session. */
    async List() { return this._GetStorage().List(); }

    /** Existing saved records are protected unless explicitly included. */
    async Purge(options) { return this._GetStorage().Purge(options); }

    /** Return the underlying storage service or reject use after closure. */
    _GetStorage()
    {
        if (this._closed) throw new Error("Storage is closed");
        return this._storage;
    }

    /** Invalidate store handles and return the shared backend shutdown promise. */
    Close()
    {
        if (!this._closing)
        {
            this._closed = true;
            this._closing = this._storage.Close();
        }
        return this._closing;
    }
}

CjsSchema.meta.define(TnyStorage, { className: "TnyStorage" });
