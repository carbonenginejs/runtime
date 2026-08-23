import { CjsDiagramLinearIndex } from "./CjsDiagramLinearIndex.js";

/**
 * Owns mutable renderer-neutral diagram collections and stable-ID lookups.
 * Call Refresh after mutating an owned record's identity, position, or bounds.
 */
export class CjsDiagramModel
{

    #edgesByID = new Map();
    #groupsByID = new Map();
    #layersByID = new Map();
    #nodesByID = new Map();

    /**
     * Creates a diagram diagram model around caller-supplied browser
     * collaborators.
     */
    constructor(records = {}, { spatialIndex = new CjsDiagramLinearIndex() } = {})
    {
        assertSpatialIndex(spatialIndex);
        this.spatialIndex = spatialIndex;
        this.nodes = [];
        this.edges = [];
        this.groups = [];
        this.layers = [];
        this.Replace(records);
    }

    /** Replaces all collections while retaining each caller-owned mutable record. */
    Replace({ nodes = [], edges = [], groups = [], layers = [] } = {})
    {
        this.nodes = copyIterable(nodes, "nodes");
        this.edges = copyIterable(edges, "edges");
        this.groups = copyIterable(groups, "groups");
        this.layers = copyIterable(layers, "layers");

        return this.Refresh();
    }

    /** Revalidates IDs and rebuilds lookup plus visible-set indexes. */
    Refresh()
    {
        this.#nodesByID = indexRecords(this.nodes, "node");
        this.#edgesByID = indexRecords(this.edges, "edge", validateEdge);
        this.#groupsByID = indexRecords(this.groups, "group", validateGroup);
        this.#layersByID = indexRecords(this.layers, "layer");
        this.spatialIndex.Rebuild(this.nodes);

        return this;
    }

    /** Returns one node by stable ID or null. */
    GetNode(id)
    {
        return this.#nodesByID.get(stableID(id, "node ID")) ?? null;
    }

    /** Returns one edge by stable ID or null. */
    GetEdge(id)
    {
        return this.#edgesByID.get(stableID(id, "edge ID")) ?? null;
    }

    /** Returns one group by stable ID or null. */
    GetGroup(id)
    {
        return this.#groupsByID.get(stableID(id, "group ID")) ?? null;
    }

    /** Returns one layer by stable ID or null. */
    GetLayer(id)
    {
        return this.#layersByID.get(stableID(id, "layer ID")) ?? null;
    }

    /** Returns nodes intersecting world-space bounds through the injected index. */
    QueryNodes(bounds, options = {})
    {
        return this.spatialIndex.Query(bounds, options);
    }

    /** Returns the topmost indexed node containing a world-space point. */
    FindNodeAt(x, y, options = {})
    {
        return this.spatialIndex.HitTest(x, y, options);
    }

    /** Returns the union of node bounds, or null for an empty model. */
    GetBounds()
    {
        return this.spatialIndex.GetBounds();
    }

    /** Returns new collection arrays while retaining mutable record ownership. */
    Snapshot()
    {
        return {
            nodes: copyIterable(this.nodes, "nodes"),
            edges: copyIterable(this.edges, "edges"),
            groups: copyIterable(this.groups, "groups"),
            layers: copyIterable(this.layers, "layers")
        };
    }

}

function validateEdge(record)
{
    stableID(record.sourceID, `edge ${record.id} sourceID`);
    stableID(record.targetID, `edge ${record.id} targetID`);

    if (record.points !== undefined && (!record.points || typeof record.points[Symbol.iterator] !== "function"))
    {
        throw new TypeError(`Edge ${record.id} points must be iterable`);
    }
}

function validateGroup(record)
{
    if (record.memberIDs === undefined) return;
    if (!record.memberIDs || typeof record.memberIDs[Symbol.iterator] !== "function")
    {
        throw new TypeError(`Group ${record.id} memberIDs must be iterable`);
    }

    for (const id of record.memberIDs)
    {
        stableID(id, `group ${record.id} member ID`);
    }
}

function indexRecords(records, label, validate = null)
{
    const result = new Map();

    for (const record of records)
    {
        if (!record || typeof record !== "object") throw new TypeError(`Diagram ${label}s must be objects`);

        const id = stableID(record.id, `${label}.id`);

        if (result.has(id)) throw new Error(`Duplicate diagram ${label} ID: ${id}`);
        if (validate) validate(record);

        result.set(id, record);
    }

    return result;
}

function copyIterable(value, label)
{
    if (!value || typeof value[Symbol.iterator] !== "function")
    {
        throw new TypeError(`Diagram ${label} must be iterable`);
    }

    const result = [];

    for (const item of value)
    {
        result.push(item);
    }

    return result;
}

function assertSpatialIndex(value)
{
    for (const method of [ "Rebuild", "Query", "HitTest", "GetBounds" ])
    {
        if (typeof value?.[method] !== "function")
        {
            throw new TypeError(`Diagram spatial index requires ${method}()`);
        }
    }
}

function stableID(value, label)
{
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;

    throw new TypeError(`${label} must be a non-empty string or finite number`);
}
