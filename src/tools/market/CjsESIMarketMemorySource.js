import { throwIfAborted } from "#utils/errors";

/** Provides deterministic caller-owned market records without transport or UI. */
export class CjsESIMarketMemorySource
{

    /**
     * Creates a market esi market memory source around caller-supplied browser
     * collaborators.
     */
    constructor({ regions = [], types = [], orders = [], history = [] } = {})
    {
        this.regions = CopyRecords(regions);
        this.types = CopyRecords(types);
        this.orders = CopyRecords(orders);
        this.history = CopyRecords(history);
    }

    /** Returns the configured region summaries. */
    async GetRegions({ signal } = {})
    {
        throwIfAborted(signal, "Market request aborted");

        return CopyRecords(this.regions);
    }

    /** Returns the configured initial type shelf. */
    async BrowseTypes({ signal } = {})
    {
        throwIfAborted(signal, "Market request aborted");

        return this.types.map(SummarizeType);
    }

    /** Searches configured types by exact ID or case-insensitive name fragment. */
    async SearchTypes(query, { signal } = {})
    {
        throwIfAborted(signal, "Market request aborted");

        const value = String(query ?? "").trim().toLocaleLowerCase();
        const result = [];

        for (const type of this.types)
        {
            if (String(type.typeID) !== value
                && !String(type.name ?? "").toLocaleLowerCase().includes(value))
            {
                continue;
            }

            result.push(SummarizeType(type));
        }

        return result;
    }

    /** Returns one configured type detail record. */
    async GetType(typeID, { signal } = {})
    {
        throwIfAborted(signal, "Market request aborted");

        const id = PositiveID(typeID, "typeID");
        const type = this.types.find(item => Number(item.typeID) === id);

        if (!type)
        {
            const error = new Error(`Unknown memory market type ${id}`);

            error.statusCode = 404;
            throw error;
        }

        return CopyRecord(type);
    }

    /** Returns configured orders matching one type and region. */
    async GetOrders({ typeID, regionID, signal } = {})
    {
        throwIfAborted(signal, "Market request aborted");

        const selectedTypeID = PositiveID(typeID, "typeID");
        const selectedRegionID = PositiveID(regionID, "regionID");
        const result = [];

        for (const order of this.orders)
        {
            if (Number(order.typeID) !== selectedTypeID
                || Number(order.regionID) !== selectedRegionID)
            {
                continue;
            }

            result.push(CopyRecord(order));
        }

        return result;
    }

    /** Returns configured history matching one type and region. */
    async GetHistory({ typeID, regionID, signal } = {})
    {
        throwIfAborted(signal, "Market request aborted");

        const selectedTypeID = PositiveID(typeID, "typeID");
        const selectedRegionID = PositiveID(regionID, "regionID");
        const result = [];

        for (const row of this.history)
        {
            if (Number(row.typeID) !== selectedTypeID
                || Number(row.regionID) !== selectedRegionID)
            {
                continue;
            }

            result.push(CopyRecord(row));
        }

        return result;
    }

}

function SummarizeType(type)
{
    return {
        typeID: type.typeID,
        name: type.name,
        group: type.group ?? type.groupName ?? "TYPE",
        iconURL: type.iconURL ?? null
    };
}

function PositiveID(value, name)
{
    const id = Number(value);

    if (!Number.isSafeInteger(id) || id <= 0)
    {
        throw new TypeError(`${name} must be a positive integer`);
    }

    return id;
}

function CopyRecords(records)
{
    const result = [];

    for (const record of records)
    {
        result.push(CopyRecord(record));
    }

    return result;
}

function CopyRecord(record)
{
    const result = {};

    for (const [ key, value ] of Object.entries(record ?? {}))
    {
        if (Array.isArray(value))
        {
            result[key] = value.map(item => item && typeof item === "object" ? CopyRecord(item) : item);
        }
        else if (value && typeof value === "object")
        {
            result[key] = CopyRecord(value);
        }
        else
        {
            result[key] = value;
        }
    }

    return result;
}

