/**
 * Adds optional market enrichment to a provider-neutral Show Info source.
 *
 * The injected market source remains the authority for regional prices. A
 * failed or empty market read must not make an otherwise public ship
 * record unavailable, so this decorator adds an estimate only when one can be
 * derived and delegates every other panel unchanged.
 */
export class CjsESIShipShowInfoMarketSource
{
    /**
     * Creates a ship-detail esi ship show info market source around
     * caller-supplied browser collaborators.
     */
    constructor({ shipSource, market } = {})
    {
        if (typeof shipSource?.FetchShip !== "function")
        {
            throw new TypeError("CjsESIShipShowInfoMarketSource requires a ship source exposing FetchShip()");
        }
        if (typeof market?.GetMarket !== "function")
        {
            throw new TypeError("CjsESIShipShowInfoMarketSource requires a market client exposing GetMarket()");
        }

        this.shipSource = shipSource;
        this.market = market;
    }

    /** Loads normalized ship data from the configured ship-detail source. */
    FetchShip(request = {})
    {
        return this.shipSource.FetchShip(request);
    }

    /** Loads normalized price data from the configured ship-detail source. */
    async FetchPrice({ typeID, regionID, signal } = {})
    {
        let result;

        try
        {
            result = await this.market.GetMarket(typeID, regionID, { signal });
        }
        catch (error)
        {
            if (error?.name === "AbortError" || signal?.aborted) throw error;
            return {};
        }
        const estimatedPrice = MarketEstimate(result);

        return estimatedPrice === null ? {} : { estimatedPrice };
    }

    /** Loads normalized overview data from the configured ship-detail source. */
    FetchOverview(request = {})
    {
        return this.#Fetch("FetchOverview", request);
    }

    /** Loads normalized attributes data from the configured ship-detail source. */
    FetchAttributes(request = {})
    {
        return this.#Fetch("FetchAttributes", request);
    }

    /** Loads normalized fitting data from the configured ship-detail source. */
    FetchFitting(request = {})
    {
        return this.#Fetch("FetchFitting", request);
    }

    /** Loads normalized skills data from the configured ship-detail source. */
    FetchSkills(request = {})
    {
        return this.#Fetch("FetchSkills", request);
    }

    /** Loads normalized variations data from the configured ship-detail source. */
    FetchVariations(request = {})
    {
        return this.#Fetch("FetchVariations", request);
    }

    /** Loads normalized industry data from the configured ship-detail source. */
    FetchIndustry(request = {})
    {
        return this.#Fetch("FetchIndustry", request);
    }

    /** Loads normalized skins data from the configured ship-detail source. */
    FetchSkins(request = {})
    {
        return this.#Fetch("FetchSkins", request);
    }

    /** Loads normalized fetch data from the configured ship-detail source. */
    #Fetch(method, request)
    {
        if (typeof this.shipSource[method] !== "function") return null;
        return this.shipSource[method].call(this.shipSource, request);
    }
}

/**
 * Mirrors the catalog's headline: the lowest regional sell order is what a
 * buyer currently pays. The newest historical average remains a useful
 * estimate for temporarily empty sell books; buy orders are deliberately not
 * relabelled as a purchase price.
 */
export function MarketEstimate(result)
{
    let bestSell = null;

    for (const order of result?.orders ?? [])
    {
        if (order?.side !== "sell") continue;

        const price = PositivePrice(order.price);

        if (price !== null && (bestSell === null || price < bestSell)) bestSell = price;
    }
    if (bestSell !== null) return bestSell;

    let latest = null;
    for (const row of result?.history ?? [])
    {
        const price = PositivePrice(row?.average);
        const date = Date.parse(`${row?.date ?? ""}T00:00:00Z`);

        if (price === null || !Number.isFinite(date)) continue;
        if (!latest || date > latest.date) latest = { date, price };
    }
    return latest?.price ?? null;
}

function PositivePrice(value)
{
    const price = Number(value);

    return Number.isFinite(price) && price > 0 ? price : null;
}
