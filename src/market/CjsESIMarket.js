/**
 * Provides a DOM-free client for a compatible regional-market HTTP backend.
 *
 * Returned records are normalized data only. This class owns no UI, price
 * formatting, sorting, chart geometry, or direct ESI requests.
 */
export class CjsESIMarket
{

    constructor({
        baseURL = "/api/market",
        origin = globalThis.location?.origin ?? null,
        fetchImpl = globalThis.fetch
    } = {})
    {
        if (typeof fetchImpl !== "function") throw new TypeError("CjsESIMarket requires fetch");

        const normalizedBaseURL = `${String(baseURL).replace(/\/$/, "")}/`;

        if (origin === null && !/^[a-z][a-z0-9+.-]*:/iu.test(normalizedBaseURL))
        {
            throw new TypeError("CjsESIMarket requires origin for a relative baseURL");
        }

        this.baseURL = new URL(normalizedBaseURL, origin ?? undefined);
        // Bound, because it is then called as `this.fetchImpl(...)` — which
        // makes the *client* the receiver. A browser's `fetch` refuses that
        // ("Illegal invocation"); Node's does not, so every test passed while
        // every real page failed. The thrown TypeError carries no status, so it
        // surfaced as an unexplained market failure rather than as a bug here.
        this.fetchImpl = fetchImpl.bind(globalThis);
    }

    /** Returns common regions plus an optional selected custom region. */
    GetRegions(selectedRegionID = null, { signal } = {})
    {
        const regionID = selectedRegionID === null ? null : positiveID(selectedRegionID, "selectedRegionID");

        return this.#Json("regions", { selectedRegionID: regionID }, signal);
    }

    /** Returns the small initial type shelf used before search. */
    BrowseTypes({ signal } = {})
    {
        return this.#Json("browse", null, signal);
    }

    /** Resolves an exact inventory-type name or numeric type ID. */
    SearchTypes(query, { regionID = null, signal } = {})
    {
        query = String(query ?? "").trim();
        if (!query || query.length > 128) throw new TypeError("query must contain 1 to 128 characters");

        const selectedRegionID = regionID === null ? null : positiveID(regionID, "regionID");

        return this.#Json("search", { q: query, regionID: selectedRegionID }, signal);
    }

    /** Returns normalized type detail and its market-group breadcrumb. */
    GetType(typeID, { signal } = {})
    {
        typeID = positiveID(typeID, "typeID");

        return this.#Json(`types/${typeID}`, null, signal);
    }

    /** Returns the complete normalized regional order book for one type. */
    GetOrders(typeID, regionID, { signal } = {})
    {
        typeID = positiveID(typeID, "typeID");
        regionID = positiveID(regionID, "regionID");

        return this.#Json(`regions/${regionID}/orders`, { typeID }, signal);
    }

    /** Returns normalized daily regional history for one type. */
    GetHistory(typeID, regionID, { signal } = {})
    {
        typeID = positiveID(typeID, "typeID");
        regionID = positiveID(regionID, "regionID");

        return this.#Json(`regions/${regionID}/history`, { typeID }, signal);
    }

    /** Returns type detail, current orders, and history in one app call. */
    async GetMarket(typeID, regionID, { signal } = {})
    {
        typeID = positiveID(typeID, "typeID");
        regionID = positiveID(regionID, "regionID");

        return this.#Json(`regions/${regionID}/types/${typeID}`, null, signal);
    }

    /** Returns non-sensitive backend cache counters. */
    GetStatus({ signal } = {})
    {
        return this.#Json("status", null, signal);
    }

    async #Json(path, query, signal)
    {
        const url = new URL(path, this.baseURL);

        for (const [ name, value ] of Object.entries(query ?? {}))
        {
            if (value !== null && value !== undefined && value !== "") url.searchParams.set(name, value);
        }

        const response = await this.fetchImpl(url, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
            signal
        });

        if (response.ok) return response.json();

        let message = `Market request failed (${response.status})`;

        try
        {
            const problem = await response.json();

            if (problem?.error) message = problem.error;
        }
        catch
        {
            // Retain the status-based message for non-JSON failures.
        }

        const error = new Error(message);

        error.statusCode = response.status;
        throw error;
    }

}

function positiveID(value, name)
{
    const id = Number(value);

    if (Number.isSafeInteger(id) && id > 0) return id;
    throw new TypeError(`${name} must be a positive integer`);
}
