import { CjsSchema } from "#schema/CjsSchema";

import { TnyServiceDatabase } from "./TnyServiceDatabase.js";

// Source: tools-core CjsToolHttpProxy.HandleSdeRoute wire contract; Tny host extension.
/** Remote tools-core SDE provider. HTTP transport is injectable for Node and workers. */
export class TnyServiceAPI extends TnyServiceDatabase
{
    _url = "";
    _target = "";
    _fetch = null;
    _tables = null;

    /**
     * Configure the remote endpoint, injected transport and table identity
     * fields.
     */
    constructor(store, { url, target = "eve", fetcher = globalThis.fetch, tables })
    {
        super(store, JSON.stringify([url, target, tables]));
        this._url = url.replace(/\/$/, "");
        this._target = target;
        this._fetch = (...args) => fetcher(...args);
        this._tables = structuredClone(tables);
    }

    /** Read and cache one build-verified API record or a confirmed absence. */
    async GetByID(identity, id)
    {
        return this._Cached(identity, "get", id, async () =>
        {
            const result = await this._Read(identity, `/${encodeURIComponent(id)}`);
            if (result === null) return null;
            const record = this._Record(identity, result);
            if (record[this._tables[identity.table].key] !== id) throw new Error("API returned the wrong record identity");
            return record;
        });
    }

    /**
     * Read a bounded API page with a cursor bound to the table, build and
     * filters.
     */
    async Find(identity, query)
    {
        return this._Cached(identity, "find", query, async () =>
        {
            const binding = JSON.stringify([identity, query.filters]);
            const cursor = query.cursor === null ? { offset: 0, binding } : JSON.parse(query.cursor);
            if (cursor.binding !== binding || !Number.isSafeInteger(cursor.offset) || cursor.offset < 0)
                throw new TypeError("Cursor belongs to a different table, build or query");
            const parameters = new URLSearchParams({ limit: String(query.limit), offset: String(cursor.offset) });
            if (query.filters.length > 1 || query.filters.some(f => f.operator !== "eq" || !["number", "string", "boolean"].includes(typeof f.value)))
                throw new TypeError("This API supports one scalar equality filter");
            if (query.filters.length)
            {
                parameters.set("field", query.filters[0].field);
                parameters.set("value", String(query.filters[0].value));
            }
            const result = await this._Read(identity, `?${parameters}`);
            if (!result || !Array.isArray(result.items) || result.items.length > query.limit)
                throw new TypeError("Invalid SDE page");
            return { entries: result.items.map(row => this._Record(identity, row)),
                nextCursor: result.items.length < query.limit ? null : JSON.stringify({ binding, offset: cursor.offset + result.items.length }) };
        });
    }

    /**
     * Fetch JSON from the configured table endpoint and reject mismatched
     * builds.
     */
    async _Read(identity, suffix)
    {
        if (!Object.hasOwn(this._tables, identity.table)) throw new Error(`Unconfigured API table ${identity.table}`);
        const url = `${this._url}/${encodeURIComponent(this._target)}/${encodeURIComponent(identity.build)}/sde/${encodeURIComponent(identity.table)}${suffix}`;
        const response = await this._fetch(url);
        let result;
        try { result = await response.json(); }
        catch (cause) { throw new Error(`SDE HTTP ${response.status} at ${url}: expected JSON response`, { cause }); }
        // A requested build can resolve to a prepared fallback. Never cache it under the requested build.
        if (String(result.build) !== identity.build) throw new Error(`SDE build mismatch: requested ${identity.build}, received ${result.build}`);
        if (response.status === 404 && String(result.error).startsWith("SDE record not found:")) return null;
        if (!response.ok) throw new Error(`SDE HTTP ${response.status}: ${result.error}`);
        return result;
    }

    /** Validate an API row and attach its declared primary-key field. */
    _Record(identity, row)
    {
        if (row.table !== identity.table || !row.payload || typeof row.payload !== "object") throw new TypeError("Invalid SDE record");
        const key = this._tables[identity.table].key;
        const id = Number(row.id);
        if (!Number.isSafeInteger(id)) throw new TypeError("SDE ID is not a safe integer");
        if (Object.hasOwn(row.payload, key) && row.payload[key] !== id) throw new Error("SDE payload ID disagrees with row ID");
        return { ...row.payload, [key]: id };
    }
}

CjsSchema.meta.define("TnyServiceAPI")(TnyServiceAPI);
