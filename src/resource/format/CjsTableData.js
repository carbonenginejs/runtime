import { CjsSchema } from "#schema/CjsSchema";

import { CARBON_TYPE } from "../../global/schema/types/carbonTypes.js";

/**
 * Our common decoded table representation. The class is an in-process builder;
 * GetValues emits the same plain cjstables document in browsers, Node and workers.
 * No persistence engine, schema registry, field renaming or hydration is involved.
 */
export class CjsTableData
{
    /** Validate a shared table header without acquiring records. Descriptions are nonoperational. */
    static defineTable(definition)
    {
        const table = structuredClone(definition);
        if (!table || typeof table.name !== "string" || !table.name.trim()) throw new TypeError("A table requires a name");
        if (!Array.isArray(table.columns) || !table.columns.length) throw new TypeError("A table requires columns");
        if (table.description !== undefined && typeof table.description !== "string") throw new TypeError("Table description must be a string");
        const names = new Set();
        for (const column of table.columns)
        {
            if (!column || typeof column.name !== "string" || !column.name || names.has(column.name))
                throw new TypeError("Column names must be unique nonempty strings");
            names.add(column.name);
            if (!Object.values(CARBON_TYPE).includes(column.type)) throw new TypeError(`Invalid type for ${column.name}`);
            if (column.primaryKey !== undefined && typeof column.primaryKey !== "boolean") throw new TypeError("primaryKey must be boolean");
            if (column.description !== undefined && typeof column.description !== "string") throw new TypeError("Column description must be a string");
        }
        return table;
    }

    /** Emit the column-oriented revision using the same header accepted by TnyDatabase. */
    static writeRows(definition, records, metadata = {})
    {
        const table = this.defineTable(definition);
        const entries = [];
        for (const row of records)
        {
            const entry = table.columns.map(column => Object.hasOwn(row, column.name) ? row[column.name] : null);
            if (entry.some(value => value === undefined)) throw new TypeError("Undefined table cells are invalid; use null");
            entries.push(entry);
        }
        return structuredClone({ format: "cjstables", version: 2, metadata, tables: [{ ...table, entries }] });
    }

    /** Decode one column-oriented table to ordinary records without class hydration. */
    static readRows(document, name)
    {
        if (document?.format !== "cjstables" || document.version !== 2 || !Array.isArray(document.tables))
            throw new TypeError("Expected column-oriented cjstables version 2");
        const source = document.tables.find(table => table.name === name);
        if (!source) throw new Error(`Unknown table ${name}`);
        const table = this.defineTable(source);
        if (!Array.isArray(source.entries)) throw new TypeError("Table entries must be an array");
        return source.entries.map(entry =>
        {
            if (!Array.isArray(entry) || entry.length !== table.columns.length || entry.some(value => value === undefined))
                throw new TypeError("Invalid column row");
            return Object.fromEntries(table.columns.map((column, index) => [column.name, structuredClone(entry[index])]));
        });
    }

    static className = "CjsTableData";
    tables = new Map();
    metadata = {};

    /**
     * Create an empty table set with caller-owned provenance.
     * @param {object} [metadata={}] Structured-cloneable source facts.
     */
    constructor(metadata = {})
    {
        this.metadata = metadata;
    }

    /**
     * Declare one table. A null keyPath means keys live separately from values.
     * @param {string} name Table name.
     * @param {object} [options={}] Key and column metadata.
     * @param {string|null} [options.keyPath=null] Literal field holding a row key, when present.
     * @param {string[]} [options.columns=[]] Source column names, with no name conversion.
     * @returns {CjsTableData} This builder.
     */
    AddTable(name, { keyPath = null, columns = [] } = {})
    {
        if (typeof name !== "string" || !name) throw new TypeError("Table name must be nonempty");
        if (keyPath !== null && (typeof keyPath !== "string" || !keyPath)) throw new TypeError("Invalid table keyPath");
        if (!Array.isArray(columns) || columns.some(column => typeof column !== "string")) throw new TypeError("Invalid table columns");
        if (this.tables.has(name)) throw new Error(`Duplicate table ${name}`);
        this.tables.set(name, { name, keyPath, columns: [...columns], records: new Map() });
        return this;
    }

    /**
     * Append a row without coercing its key or touching nested values.
     * @param {string} name Table name.
     * @param {string|number|bigint} key Stable row key; numeric and string keys differ.
     * @param {*} value Plain structured-cloneable value, including nested maps and bytes.
     * @returns {CjsTableData} This builder.
     */
    Add(name, key, value)
    {
        const table = this._Table(name);
        assertKey(key);
        if (table.records.has(key)) throw new Error(`Duplicate ${name} record key ${String(key)}`);
        if (table.keyPath !== null && (!value || value[table.keyPath] !== key))
            throw new TypeError(`Record key disagrees with ${name}.${table.keyPath}`);
        table.records.set(key, value);
        return this;
    }

    /**
     * Lookup retains an explicit found flag because null is valid table data.
     * @param {string} name Table name.
     * @param {string|number|bigint} key Row key.
     * @returns {{found: boolean, value: *}} The row or a miss.
     */
    Get(name, key)
    {
        const records = this._Table(name).records;
        return records.has(key) ? { found: true, value: records.get(key) } : { found: false, value: null };
    }

    /**
     * Iterate the table without materializing another array.
     * @param {string} name Table name.
     * @returns {IterableIterator<Array<*>>} Key/value entries.
     */
    Entries(name)
    {
        return this._Table(name).records.entries();
    }

    /**
     * Export the plain envelope. Values must be structured-cloneable; they are
     * borrowed here, and postMessage/structuredClone owns transport copies.
     * @returns {object} A versioned cjstables document.
     */
    GetValues()
    {
        const tables = [];
        for (const table of this.tables.values())
            tables.push({ name: table.name, keyPath: table.keyPath, columns: [...table.columns], entries: Array.from(table.records) });
        return { format: "cjstables", version: 1, metadata: this.metadata, tables };
    }

    /**
     * Export bounded documents, each independently cloneable across a worker boundary.
     * @param {number} [size=256] Maximum rows per document.
     * @returns {Generator<object>} Table documents in insertion order; empty tables are retained.
     */
    *Batches(size = 256)
    {
        if (!Number.isSafeInteger(size) || size < 1) throw new RangeError("Batch size must be positive");
        for (const table of this.tables.values())
        {
            let batch = new CjsTableData(this.metadata).AddTable(table.name, table);
            let count = 0;
            for (const [key, value] of table.records)
            {
                batch.Add(table.name, key, value);
                if (++count === size)
                {
                    yield batch.GetValues();
                    batch = new CjsTableData(this.metadata).AddTable(table.name, table);
                    count = 0;
                }
            }
            if (count || table.records.size === 0) yield batch.GetValues();
        }
    }

    /**
     * Reconstruct a builder from a worker result or concatenate streamed documents.
     * @param {object} document A cjstables version-one document.
     * @returns {CjsTableData} This builder.
     */
    Append(document)
    {
        if (document?.format !== "cjstables" || document.version !== 1 || !Array.isArray(document.tables))
            throw new TypeError("Expected cjstables version 1");
        const pending = new CjsTableData();
        for (const source of document.tables)
        {
            if (!pending.tables.has(source.name)) pending.AddTable(source.name, source);
            const target = pending._Table(source.name);
            if (target.keyPath !== source.keyPath || JSON.stringify(target.columns) !== JSON.stringify(source.columns))
                throw new TypeError(`Incompatible table metadata for ${source.name}`);
            for (const [key, value] of source.entries) pending.Add(source.name, key, value);
        }
        for (const source of pending.tables.values())
        {
            const target = this.tables.get(source.name);
            if (!target) continue;
            if (target.keyPath !== source.keyPath || JSON.stringify(target.columns) !== JSON.stringify(source.columns))
                throw new TypeError(`Incompatible table metadata for ${source.name}`);
            for (const key of source.records.keys())
                if (target.records.has(key)) throw new Error(`Duplicate ${source.name} record key ${String(key)}`);
        }
        for (const source of pending.tables.values())
        {
            if (!this.tables.has(source.name)) this.AddTable(source.name, source);
            for (const [key, value] of source.records) this.Add(source.name, key, value);
        }
        return this;
    }

    /**
     * Wrap a plain document, including one delivered by a worker.
     * @param {object} document A cjstables document.
     * @returns {CjsTableData} The reconstructed table builder.
     */
    static from(document)
    {
        return new CjsTableData(document.metadata ?? {}).Append(document);
    }

    /**
     * Import records whose key is a literal field, or their ordinal when keyPath is null.
     * @param {Iterable<*>} records Rows in source order.
     * @param {object} [options={}] Table metadata.
     * @param {string} [options.name="records"] Table name.
     * @param {string|null} [options.keyPath=null] Explicit key field; never inferred from casing.
     * @param {object} [options.metadata={}] Provenance.
     * @returns {CjsTableData} A single-table builder.
     */
    static fromRecords(records, { name = "records", keyPath = null, metadata = {} } = {})
    {
        const result = new CjsTableData(metadata).AddTable(name, { keyPath });
        let ordinal = 0;
        for (const row of records) result.Add(name, keyPath === null ? ordinal++ : row[keyPath], row);
        return result;
    }

    /**
     * Resolve a declared table without silently creating a new namespace.
     * @param {string} name Table name.
     * @returns {object} The internal table record.
     */
    _Table(name)
    {
        const table = this.tables.get(name);
        if (!table) throw new Error(`Unknown table ${name}`);
        return table;
    }
}

/**
 * Validate scalar identities without rounding wide integers or coercing strings.
 * @param {*} key Candidate key.
 * @returns {void}
 */
function assertKey(key)
{
    if (typeof key === "string" || typeof key === "bigint" || Number.isSafeInteger(key)) return;
    throw new TypeError("Table keys must be strings, safe integers or bigints");
}

CjsSchema.meta.define(CjsTableData, { className: "CjsTableData" });
