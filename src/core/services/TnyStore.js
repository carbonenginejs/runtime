/** Our collection-scoped handle. It cannot close or purge the shared backend. */
export class TnyStore
{
    #owner = null;
    #name = "";

    /** Bind a named collection to its owning storage manager. */
    constructor(owner, name)
    {
        this.#owner = owner;
        this.#name = name;
    }

    /** Return the stable collection name. */
    get name() { return this.#name; }

    /** Read one key from this collection using the owner storage queue. */
    async Read(key, options) { return this.#owner._GetStorage().Read(this.#name, key, options); }

    /** Write one value under a key in this collection. */
    async Write(key, value, options) { return this.#owner._GetStorage().Write(this.#name, key, value, options); }

    /** Write a batch of values scoped to this collection. */
    async WriteBatch(entries) { return this.#owner._GetStorage().WriteBatch(this.#name, entries); }

    /** Delete one key from this collection. */
    async Delete(key) { return this.#owner._GetStorage().Delete(this.#name, key); }

    /** List identities belonging to this collection. */
    async List() { return this.#owner._GetStorage().List(this.#name); }
}
