/** Provides caller-owned Show Info records without transport or presentation. */
export class CjsESIShipShowInfoMemorySource
{

    constructor({ records = [] } = {})
    {
        if (!Array.isArray(records))
        {
            throw new TypeError("records must be an array");
        }

        this.records = records.map(CopyRecord);
    }

    async FetchShip(request = {})
    {
        return this.#Fetch(request, "ship", true);
    }

    async FetchPrice(request = {})
    {
        return this.#Fetch(request, "price");
    }

    async FetchOverview(request = {})
    {
        return this.#Fetch(request, "overview");
    }

    async FetchAttributes(request = {})
    {
        return this.#Fetch(request, "attributes");
    }

    async FetchFitting(request = {})
    {
        return this.#Fetch(request, "fitting");
    }

    async FetchSkills(request = {})
    {
        return this.#Fetch(request, "skills");
    }

    async FetchVariations(request = {})
    {
        return this.#Fetch(request, "variations");
    }

    async FetchIndustry(request = {})
    {
        return this.#Fetch(request, "industry");
    }

    async FetchSkins(request = {})
    {
        return this.#Fetch(request, "skins");
    }

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
