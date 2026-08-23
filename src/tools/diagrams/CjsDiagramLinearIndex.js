import {
    diagramBoundsContainPoint,
    diagramBoundsFromRecords,
    diagramBoundsIntersect,
    diagramRecordBounds,
    normalizeDiagramBounds
} from "./diagramBounds.js";

/**
 * Provides the visible-set and picking contract with a deterministic linear
 * implementation. Large renderers may inject a spatial index with the same API.
 */
export class CjsDiagramLinearIndex
{

    #byID = new Map();
    #entries = [];

    /**
     * Creates a diagram diagram linear index around caller-supplied browser
     * collaborators.
     */
    constructor(records = [], { getBounds = diagramRecordBounds } = {})
    {
        if (typeof getBounds !== "function") throw new TypeError("getBounds must be a function");

        this.getBounds = getBounds;
        this.Rebuild(records);
    }

    /** Rebuilds from an externally sized iterable without argument spread. */
    Rebuild(records)
    {
        if (!records || typeof records[Symbol.iterator] !== "function")
        {
            throw new TypeError("Indexed records must be iterable");
        }

        const entries = [];
        const byID = new Map();

        for (const record of records)
        {
            const id = recordID(record);

            if (byID.has(id)) throw new Error(`Duplicate diagram record ID: ${id}`);

            const entry = {
                id,
                bounds: normalizeDiagramBounds(this.getBounds(record)),
                record
            };

            entries.push(entry);
            byID.set(id, entry);
        }

        this.#entries = entries;
        this.#byID = byID;

        return this;
    }

    /** Returns the record for one stable ID or null. */
    Get(id)
    {
        return this.#byID.get(stableID(id, "id"))?.record ?? null;
    }

    /** Returns records whose world bounds intersect the requested bounds. */
    Query(bounds, { minimumImportance = -Infinity, predicate = null } = {})
    {
        bounds = normalizeDiagramBounds(bounds);
        minimumImportance = Number(minimumImportance);

        if (Number.isNaN(minimumImportance)) throw new TypeError("minimumImportance must be numeric");
        if (predicate !== null && typeof predicate !== "function")
        {
            throw new TypeError("predicate must be a function or null");
        }

        const result = [];

        for (const entry of this.#entries)
        {
            const importance = Number(entry.record.importance ?? 0);

            if (!Number.isFinite(importance)) continue;
            if (importance < minimumImportance) continue;
            if (!diagramBoundsIntersect(entry.bounds, bounds)) continue;
            if (predicate && !predicate(entry.record)) continue;

            result.push(entry.record);
        }

        return result;
    }

    /**
     * Returns the last indexed record containing a world-space point. Indexed
     * order therefore doubles as a simple paint-order convention.
     */
    HitTest(x, y, { predicate = null } = {})
    {
        x = finiteNumber(x, "x");
        y = finiteNumber(y, "y");

        if (predicate !== null && typeof predicate !== "function")
        {
            throw new TypeError("predicate must be a function or null");
        }

        for (let index = this.#entries.length - 1; index >= 0; index--)
        {
            const entry = this.#entries[index];

            if (!diagramBoundsContainPoint(entry.bounds, x, y)) continue;
            if (predicate && !predicate(entry.record)) continue;

            return entry.record;
        }

        return null;
    }

    /** Returns the union of all indexed records, or null when empty. */
    GetBounds()
    {
        return diagramBoundsFromRecords(this.#entries, { getBounds: entry => entry.bounds });
    }

    /** Returns records in deterministic indexed order. */
    List()
    {
        const result = [];

        for (const entry of this.#entries)
        {
            result.push(entry.record);
        }

        return result;
    }

}

function recordID(record)
{
    if (!record || typeof record !== "object") throw new TypeError("Indexed records must be objects");

    return stableID(record.id, "record.id");
}

function stableID(value, label)
{
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;

    throw new TypeError(`${label} must be a non-empty string or finite number`);
}

function finiteNumber(value, label)
{
    value = Number(value);

    if (!Number.isFinite(value)) throw new TypeError(`${label} must be a finite number`);

    return value;
}
