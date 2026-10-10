import { TnyServiceDatabase } from "./TnyServiceDatabase.js";
import { CjsFsd64SchemaDecoder } from "../../resource/formats/fsd/64/core/CjsFsd64SchemaDecoder.js";

// Source: CjsFsd64SchemaDecoder source schemas; provider orchestration is our Tny extension.
/** Decodes client FSD through an injected byte reader, with build-scoped result caching. */
export class TnyServiceFSD extends TnyServiceDatabase
{
    _read = null;
    _tables = null;

    /**
     * Configure an injected byte source and the schemas defining its cache
     * scope.
     */
    constructor(store, { read, tables, sourceID })
    {
        if (typeof sourceID !== "string" || !sourceID) throw new TypeError("FSD sourceID is required");
        super(store, JSON.stringify([sourceID, Object.entries(tables).map(([name, table]) => [name, table.key, table.schema.schemaID])]));
        this._read = read;
        this._tables = tables;
    }

    /** Decode and cache one matching FSD record or a confirmed absence. */
    async GetByID(identity, id)
    {
        return this._Cached(identity, "get", id, async () =>
        {
            const { bytes, table } = await this._Input(identity);
            for (const [key, value] of CjsFsd64SchemaDecoder.entries(bytes, table.schema))
                if (key === id) return this._Record(table, key, value);
            return null;
        });
    }

    /** Decode a bounded filtered page with a build-scoped cursor. */
    async Find(identity, query)
    {
        return this._Cached(identity, "find", query, async () =>
        {
            const binding = JSON.stringify([identity, query.filters]);
            const cursor = query.cursor === null ? { offset: 0, binding } : JSON.parse(query.cursor);
            if (cursor.binding !== binding || !Number.isSafeInteger(cursor.offset) || cursor.offset < 0)
                throw new TypeError("Cursor belongs to a different table, build or query");
            const { bytes, table } = await this._Input(identity);
            const entries = [];
            let offset = 0;
            for (const [key, value] of CjsFsd64SchemaDecoder.entries(bytes, table.schema))
            {
                const record = this._Record(table, key, value);
                if (!query.filters.every(filter => matches(record, filter))) continue;
                if (offset++ < cursor.offset) continue;
                if (entries.length === query.limit)
                    return { entries, nextCursor: JSON.stringify({ binding, offset: cursor.offset + entries.length }) };
                entries.push(record);
            }
            return { entries, nextCursor: null };
        });
    }

    /** Read the configured FSD bytes and verify their source build. */
    async _Input(identity)
    {
        if (!Object.hasOwn(this._tables, identity.table)) throw new Error(`Unconfigured FSD table ${identity.table}`);
        const table = this._tables[identity.table];
        const result = await this._read(table.schema.path, structuredClone(identity));
        if (String(result.build) !== identity.build) throw new Error("FSD source build mismatch");
        return { bytes: result.bytes, table };
    }

    /**
     * Attach the map key to a decoded record after checking for identity
     * conflicts.
     */
    _Record(table, key, value)
    {
        if (Object.hasOwn(value, table.key) && value[table.key] !== key) throw new Error("FSD record identity mismatch");
        return { ...value, [table.key]: key };
    }
}

function matches(record, filter)
{
    if (!Object.hasOwn(record, filter.field)) return false;
    const value = record[filter.field], expected = filter.value;
    switch (filter.operator)
    {
        case "eq": return value === expected;
        case "ne": return value !== expected;
        case "lt": return value < expected;
        case "lte": return value <= expected;
        case "gt": return value > expected;
        case "gte": return value >= expected;
        case "in": return expected.includes(value);
        default: throw new TypeError("Unsupported FSD filter");
    }
}
