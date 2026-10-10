import { TnyDatabase } from "./TnyDatabase.js";
import { TnyStorage } from "./TnyStorage.js";
import { TnyServices } from "./TnyServices.js";

/** Our inert orchestration owner; importable without Blue, rendering or a browser. */
export class Tny
{
    #storage = null;
    #services = null;
    #database = null;
    #closing = null;

    /** Construct inert storage, service and database owners from host options. */
    constructor({ storage = {} } = {})
    {
        this.#storage = new TnyStorage(storage);
        this.#services = new TnyServices(this.#storage);
        this.#database = new TnyDatabase(this.#services);
    }

    /** Return the table registry owned by this host. */
    get database() { return this.#database; }

    /** Return the storage manager owned by this host. */
    get storage() { return this.#storage; }

    /** Return the service registry owned by this host. */
    get services() { return this.#services; }

    /** Return the shared promise for closing this host once. */
    Close()
    {
        if (!this.#closing) this.#closing = this._Close();
        return this.#closing;
    }

    /**
     * Close the database, services and storage in order and aggregate shutdown
     * errors.
     */
    async _Close()
    {
        const errors = [];
        await this.#database.Close();
        try { await this.#services.Close(); }
        catch (error) { errors.push(error); }
        try { await this.#storage.Close(); }
        catch (error) { errors.push(error); }
        if (errors.length) throw new AggregateError(errors, "Tny shutdown failed");
    }
}
