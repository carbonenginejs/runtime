import { validateStoragePolicy } from "./storagePolicy.js";

/**
 * Our host service registry. It constructs lazily and injects scoped storage;
 * it does not register Blue classes or infer data-provider routing.
 */
export class TnyServices
{
    #storage = null;
    #services = new Map();
    #closed = false;
    #closing = null;

    /** Retain the storage manager used for service store injection. */
    constructor(storage) { this.#storage = storage; }

    /** Validate and retain a named service constructor without instantiating it. */
    Register(name, Constructor, options = {})
    {
        this._AssertOpen();
        if (typeof name !== "string" || !name.trim() || name !== name.trim())
            throw new TypeError("Service name must be a nonempty, trimmed string");
        if (this.#services.has(name)) throw new Error("Service " + name + " is already registered");
        if (typeof Constructor !== "function") throw new TypeError("Service " + name + " requires a constructor");
        if (typeof Constructor.prototype?.Close !== "function")
            throw new TypeError("Service " + name + " must implement Close or extend TnyService");
        validateStoragePolicy(Constructor.storagePolicy, name);
        this.#services.set(name, { Constructor, options, usesStorage: Constructor.storagePolicy !== null,
            instance: null, constructing: false });
        return this;
    }

    /** Return one instance per registration, or null when no service has that name. */
    Get(name)
    {
        this._AssertOpen();
        const entry = this.#services.get(name);
        if (!entry) return null;
        if (entry.instance) return entry.instance;
        if (entry.constructing) throw new Error("Circular service construction: " + name);
        entry.constructing = true;
        try
        {
            const store = entry.usesStorage ? this.#storage.CreateStore(name) : null;
            const instance = new entry.Constructor(store, entry.options);
            entry.instance = instance;
            return instance;
        }
        finally { entry.constructing = false; }
    }

    /** Return registered service names in registration order. */
    List() { return Array.from(this.#services.keys()); }

    /** Reject acquisition or registration after shutdown begins. */
    _AssertOpen()
    {
        if (this.#closed) throw new Error("Services are closed");
    }

    /** Prevent new acquisitions and return the shared shutdown promise. */
    Close()
    {
        if (!this.#closing)
        {
            this.#closed = true;
            this.#closing = this._CloseServices();
        }
        return this.#closing;
    }

    /**
     * Close instantiated services in reverse registration order and collect
     * failures.
     */
    async _CloseServices()
    {
        const errors = [];
        for (const { instance } of Array.from(this.#services.values()).reverse())
        {
            if (!instance) continue;
            try { await instance.Close(); }
            catch (error) { errors.push(error); }
        }
        if (errors.length) throw new AggregateError(errors, "Service shutdown failed");
    }
}
