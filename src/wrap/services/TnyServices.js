import { CjsSchema } from "#schema/CjsSchema";

import { validateStoragePolicy } from "./storagePolicy.js";

/**
 * Our host service registry. It constructs lazily and injects scoped storage;
 * it does not register Blue classes or infer data-provider routing.
 */
export class TnyServices
{
    _storage = null;
    _services = new Map();
    _closed = false;
    _closing = null;

    /** Retain the storage manager used for service store injection. */
    constructor(storage) { this._storage = storage; }

    /** Validate and retain a named service constructor without instantiating it. */
    Register(name, Constructor, options = {})
    {
        this._AssertOpen();
        if (typeof name !== "string" || !name.trim() || name !== name.trim())
            throw new TypeError("Service name must be a nonempty, trimmed string");
        if (this._services.has(name)) throw new Error("Service " + name + " is already registered");
        if (typeof Constructor !== "function") throw new TypeError("Service " + name + " requires a constructor");
        validateStoragePolicy(Constructor.storagePolicy, name);
        this._services.set(name, { Constructor, options, usesStorage: Constructor.storagePolicy !== null,
            instance: null, constructing: false });
        return this;
    }

    /** Return one instance per registration, or null when no service has that name. */
    Get(name)
    {
        this._AssertOpen();
        const entry = this._services.get(name);
        if (!entry) return null;
        if (entry.instance) return entry.instance;
        if (entry.constructing) throw new Error("Circular service construction: " + name);
        entry.constructing = true;
        try
        {
            const store = entry.usesStorage ? this._storage.CreateStore(name) : null;
            const instance = new entry.Constructor(store, entry.options);
            entry.instance = instance;
            return instance;
        }
        finally { entry.constructing = false; }
    }

    /** Return registered service names in registration order. */
    List() { return Array.from(this._services.keys()); }

    /** Reject acquisition or registration after shutdown begins. */
    _AssertOpen()
    {
        if (this._closed) throw new Error("Services are closed");
    }

    /** Prevent new acquisitions and return the shared shutdown promise. */
    Close()
    {
        if (!this._closing)
        {
            this._closed = true;
            this._closing = this._CloseServices();
        }
        return this._closing;
    }

    /**
     * Close instantiated services in reverse registration order and collect
     * failures.
     */
    async _CloseServices()
    {
        const errors = [];
        for (const { instance } of Array.from(this._services.values()).reverse())
        {
            if (!instance) continue;
            try { await instance.Close(); }
            catch (error) { errors.push(error); }
        }
        if (errors.length) throw new AggregateError(errors, "Service shutdown failed");
    }
}

CjsSchema.meta.define("TnyServices")(TnyServices);
