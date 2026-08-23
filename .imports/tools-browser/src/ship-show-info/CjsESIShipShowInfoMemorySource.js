/** Provides caller-owned Show Info records without transport or presentation. */
export class CjsESIShipShowInfoMemorySource
{

    /**
     * Creates a ship-detail esi ship show info memory source around
     * caller-supplied browser collaborators.
     */
    constructor({ records = [] } = {})
    {
        if (!Array.isArray(records))
        {
            throw new TypeError("records must be an array");
        }

        this.records = records.map(CopyRecord);
    }

    /** Loads normalized ship data from the configured ship-detail source. */
    async FetchShip(request = {})
    {
        return this.#Fetch(request, "ship", true);
    }

    /** Loads normalized price data from the configured ship-detail source. */
    async FetchPrice(request = {})
    {
        return this.#Fetch(request, "price");
    }

    /** Loads normalized overview data from the configured ship-detail source. */
    async FetchOverview(request = {})
    {
        return this.#Fetch(request, "overview");
    }

    /** Loads normalized attributes data from the configured ship-detail source. */
    async FetchAttributes(request = {})
    {
        return this.#Fetch(request, "attributes");
    }

    /** Loads normalized fitting data from the configured ship-detail source. */
    async FetchFitting(request = {})
    {
        return this.#Fetch(request, "fitting");
    }

    /** Loads normalized skills data from the configured ship-detail source. */
    async FetchSkills(request = {})
    {
        return this.#Fetch(request, "skills");
    }

    /** Loads normalized variations data from the configured ship-detail source. */
    async FetchVariations(request = {})
    {
        return this.#Fetch(request, "variations");
    }

    /** Loads normalized industry data from the configured ship-detail source. */
    async FetchIndustry(request = {})
    {
        return this.#Fetch(request, "industry");
    }

    /** Loads normalized skins data from the configured ship-detail source. */
    async FetchSkins(request = {})
    {
        return this.#Fetch(request, "skins");
    }

    /** Loads normalized fetch data from the configured ship-detail source. */
    #Fetch({ typeID, signal } = {}, name, required = false)
    {
        ThrowIfAborted(signal);

        const selectedTypeID = PositiveID(typeID);
        const record = this.records.find(item => Number(item?.ship?.typeID) === selectedTypeID);

        if (!record)
        {
            const error = new Error(`Unknown memory Show Info type ${selectedTypeID}`);

            error.statusCode = 404;
            throw error;
        }
        if (!Object.hasOwn(record, name))
        {
            if (!required)
            {
                return null;
            }

            throw new TypeError(`Memory Show Info record ${selectedTypeID} has no ${name}`);
        }

        return CopyRecord(record[name]);
    }

}

function PositiveID(value)
{
    const id = Number(value);

    if (!/^\d+$/u.test(String(value ?? "")) || !Number.isSafeInteger(id) || id <= 0)
    {
        throw new TypeError("typeID must be a positive integer");
    }

    return id;
}

function CopyRecord(value)
{
    if (Array.isArray(value))
    {
        return value.map(CopyRecord);
    }
    if (!value || typeof value !== "object")
    {
        return value;
    }

    const result = {};

    for (const [ key, item ] of Object.entries(value))
    {
        result[key] = CopyRecord(item);
    }

    return result;
}

function ThrowIfAborted(signal)
{
    if (!signal?.aborted)
    {
        return;
    }

    if (typeof signal.throwIfAborted === "function")
    {
        signal.throwIfAborted();
    }

    const error = new Error("Show Info memory request aborted");

    error.name = "AbortError";
    throw error;
}
