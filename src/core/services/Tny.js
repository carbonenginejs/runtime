import { TnyDatabase } from "./TnyDatabase.js";
import { TnyStorage } from "./TnyStorage.js";
import { TnyServices } from "./TnyServices.js";

/** Our inert orchestration owner; importable without Blue, rendering or a browser. */
export class Tny
{
    _storage = null;
    _services = null;
    _database = null;
    _closing = null;

    /** Construct inert storage, service and database owners from host options. */
    constructor({ storage = {} } = {})
    {
        this._storage = new TnyStorage(storage);
        this._services = new TnyServices(this._storage);
        this._database = new TnyDatabase(this._services);
    }

    /** Return the table registry owned by this host. */
    get database() { return this._database; }

    /** Return the storage manager owned by this host. */
    get storage() { return this._storage; }

    /** Return the service registry owned by this host. */
    get services() { return this._services; }

    /** Return the shared promise for closing this host once. */
    Close()
    {
        if (!this._closing) this._closing = this._Close();
        return this._closing;
    }

    /**
     * Close the database, services and storage in order and aggregate shutdown
     * errors.
     */
    async _Close()
    {
        const errors = [];
        await this._database.Close();
        try { await this._services.Close(); }
        catch (error) { errors.push(error); }
        try { await this._storage.Close(); }
        catch (error) { errors.push(error); }
        if (errors.length) throw new AggregateError(errors, "Tny shutdown failed");
    }
}
