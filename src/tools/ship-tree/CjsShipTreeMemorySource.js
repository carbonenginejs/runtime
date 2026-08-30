import { throwIfAborted } from "#utils/errors";

/** Supplies authored Ship Tree answers from caller-owned browser-memory data. */
export class CjsShipTreeMemorySource
{

    /**
     * Creates a ship-tree ship tree memory source around caller-supplied browser
     * collaborators.
     */
    constructor({ trees = [] } = {})
    {
        this.trees = copyIterable(trees, "trees");
    }

    /** Returns one mutable tree answer for the requested faction or authority. */
    async FetchTree({ factionID = null, signal } = {})
    {
        throwIfAborted(signal, "Ship Tree request was aborted");

        const tree = this.trees.find(item => sameID(item?.factionID ?? null, factionID));

        if (!tree) throw new Error(`No Ship Tree answer for faction ${String(factionID)}`);

        return copyTree(tree);
    }

}

function copyTree(tree)
{
    return {
        ...tree,
        factions: copyRecords(tree.factions ?? []),
        groups: copyRecords(tree.groups ?? []),
        types: copyRecords(tree.types ?? []),
        edges: copyRecords(tree.edges ?? []),
        provenance: tree.provenance ? { ...tree.provenance } : undefined
    };
}

function copyRecords(records)
{
    const result = [];

    for (const record of records)
    {
        const copy = { ...record };

        if (record.typeIDs) copy.typeIDs = copyIterable(record.typeIDs, "typeIDs");
        if (record.layout) copy.layout = { ...record.layout };

        result.push(copy);
    }

    return result;
}

function copyIterable(value, label)
{
    if (!value || typeof value[Symbol.iterator] !== "function")
    {
        throw new TypeError(`Ship Tree memory ${label} must be iterable`);
    }

    const result = [];

    for (const item of value)
    {
        result.push(item);
    }

    return result;
}

function sameID(left, right)
{
    return left === right || String(left) === String(right);
}

