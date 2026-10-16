import { CjsSchema } from "#schema/CjsSchema";

/** Our collection-scoped handle. It cannot close or purge the shared backend. */
export class TnyStore
{
    _owner = null;
    _name = "";

    /** Bind a named collection to its owning storage manager. */
    constructor(owner, name)
    {
        this._owner = owner;
        this._name = name;
    }

    /** Return the stable collection name. */
    get name() { return this._name; }

    /** Read one key from this collection using the owner storage queue. */
    async Read(key, options) { return this._owner._GetStorage().Read(this._name, key, options); }

    /** Write one value under a key in this collection. */
    async Write(key, value, options) { return this._owner._GetStorage().Write(this._name, key, value, options); }

    /** Write a batch of values scoped to this collection. */
    async WriteBatch(entries) { return this._owner._GetStorage().WriteBatch(this._name, entries); }

    /** Delete one key from this collection. */
    async Delete(key) { return this._owner._GetStorage().Delete(this._name, key); }

    /** List identities belonging to this collection. */
    async List() { return this._owner._GetStorage().List(this._name); }
}

CjsSchema.meta.define(TnyStore, { className: "TnyStore" });
