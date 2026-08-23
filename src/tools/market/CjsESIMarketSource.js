/**
 * Provides a direct browser adapter for ESI's public market and universe routes.
 *
 * All ESI routes, headers, pagination, retry policy, caching assumptions, and
 * wire translation stop at this class. Callers supply any initial region and
 * type shelf rather than receiving bundled game data from this package.
 */
export class CjsESIMarketSource
{

    /**
     * Creates a market esi market source around caller-supplied browser
     * collaborators.
     */
    constructor({
        baseURL = "https://esi.evetech.net",
        compatibilityDate = "2026-08-14",
        tenant = "tranquility",
        userAgent = "carbonenginejs-runtime-tools/0.0",
        regions = [],
        types = [],
        fetchImpl = globalThis.fetch
    } = {})
    {
        if (typeof fetchImpl !== "function") throw new TypeError("CjsESIMarketSource requires fetch");

        this.baseURL = baseURL.replace(/\/$/, "");
        this.compatibilityDate = compatibilityDate;
        this.tenant = tenant;
        this.userAgent = userAgent;
        this.regions = regions.map(region => ({
            regionID: Number(region.regionID),
            name: String(region.name ?? `Region ${region.regionID}`)
        }));
        this.types = types.map(type => ({
            typeID: Number(type.typeID),
            name: String(type.name ?? `Type ${type.typeID}`),
            group: String(type.group ?? "TYPE")
        }));
        // Bound for the same reason as CjsESIMarket: called as a method of
        // this object, an unbound browser `fetch` throws "Illegal invocation".
        this.fetchImpl = fetchImpl.bind(globalThis);
    }

    /** Returns common regions plus a caller-selected custom region. */
    async GetRegions({ selectedRegionID, signal } = {})
    {
        const regions = this.regions.map(region => ({
            regionID: region.regionID,
            name: region.name
        }));

        if (selectedRegionID && !regions.some(region => region.regionID === Number(selectedRegionID)))
        {
            try
            {
                const region = await this.#Json(`/universe/regions/${selectedRegionID}`, { signal });

                regions.push({ regionID: region.region_id, name: region.name });
            }
            catch (error)
            {
                if (error?.name === "AbortError") throw error;
                regions.push({ regionID: Number(selectedRegionID), name: `Region ${selectedRegionID}` });
            }
        }
        return regions;
    }

    /** Returns a deliberately small starting shelf; full indexing comes later. */
    async BrowseTypes()
    {
        return this.types.map(type => ({
            typeID: type.typeID,
            name: type.name,
            group: type.group,
            iconURL: this.#IconURL(type.typeID)
        }));
    }

    /** Resolves a numeric ID or an exact inventory type name through ESI. */
    async SearchTypes(query, { signal } = {})
    {
        const normalized = String(query ?? "").trim();
        const lowered = normalized.toLocaleLowerCase();
        const results = [];

        for (const type of this.types)
        {
            if (!type.name.toLocaleLowerCase().includes(lowered)) continue;
            results.push({
                typeID: type.typeID,
                name: type.name,
                group: type.group,
                iconURL: this.#IconURL(type.typeID)
            });
        }

        if (/^\d+$/.test(normalized))
        {
            try
            {
                const detail = await this.GetType(Number(normalized), { signal });

                if (!results.some(type => type.typeID === detail.typeID))
                {
                    results.unshift(summary(detail));
                }
            }
            catch (error)
            {
                if (error?.name === "AbortError") throw error;
            }
            return results;
        }

        if (normalized.length < 2) return results;

        const resolved = await this.#Json("/universe/ids", {
            method: "POST",
            body: [ normalized ],
            signal,
            cache: false
        });

        for (const entry of resolved.inventory_types ?? [])
        {
            if (results.some(type => type.typeID === entry.id)) continue;
            results.unshift({
                typeID: entry.id,
                name: entry.name,
                group: "EXACT MATCH",
                iconURL: this.#IconURL(entry.id)
            });
        }
        return results;
    }

    /** Gets and translates one marketable type plus its market-group trail. */
    async GetType(typeID, { signal } = {})
    {
        const type = await this.#Json(`/universe/types/${typeID}`, { signal });
        const breadcrumb = type.market_group_id
            ? await this.#GroupTrail(type.market_group_id, signal)
            : [];

        return {
            typeID: type.type_id,
            name: type.name,
            description: plainText(type.description),
            groupName: breadcrumb.at(-1)?.name ?? "MARKET TYPE",
            breadcrumb,
            iconURL: this.#IconURL(type.type_id),
            volume: type.volume ?? null,
            packagedVolume: type.packaged_volume ?? null
        };
    }

    /** Gets all public regional orders for one type and resolves public names. */
    async GetOrders({ regionID, typeID, signal })
    {
        const rows = await this.#Paged(`/markets/${regionID}/orders`, {
            order_type: "all",
            type_id: typeID
        }, signal);
        const names = await this.#Names(rows, signal);
        const orders = [];

        for (const row of rows)
        {
            const issued = Date.parse(row.issued);
            const expiresAt = Number.isFinite(issued)
                ? new Date(issued + row.duration * 24 * 60 * 60 * 1000).toISOString()
                : null;

            orders.push({
                orderID: row.order_id,
                typeID: row.type_id,
                side: row.is_buy_order ? "buy" : "sell",
                price: row.price,
                volumeRemain: row.volume_remain,
                volumeTotal: row.volume_total,
                minVolume: row.min_volume,
                range: row.range,
                issued: row.issued,
                expiresAt,
                locationID: row.location_id,
                locationName: names.get(row.location_id) ?? null,
                systemID: row.system_id,
                systemName: names.get(row.system_id) ?? null
            });
        }
        return orders;
    }

    /** Gets daily regional history for one type. */
    async GetHistory({ regionID, typeID, signal })
    {
        const rows = await this.#Json(`/markets/${regionID}/history`, {
            query: { type_id: typeID },
            signal
        });

        return rows.map(row => ({
            date: row.date,
            average: row.average,
            high: row.highest,
            low: row.lowest,
            orderCount: row.order_count,
            volume: row.volume
        }));
    }

    /** Builds the ordered parent trail for one market group. */
    async #GroupTrail(groupID, signal)
    {
        const trail = [];
        const seen = new Set();
        let current = Number(groupID);

        while (current && !seen.has(current) && trail.length < 16)
        {
            seen.add(current);
            const group = await this.#Json(`/markets/groups/${current}`, { signal });

            trail.unshift({ marketGroupID: group.market_group_id, name: group.name });
            current = Number(group.parent_group_id) || 0;
        }
        return trail;
    }

    /** Resolves ESI name records for a deduplicated identifier collection. */
    async #Names(orders, signal)
    {
        const unique = new Set();

        for (const order of orders)
        {
            unique.add(order.location_id);
            unique.add(order.system_id);
        }

        const ids = Array.from(unique);
        const names = new Map();

        for (let start = 0; start < ids.length; start += 500)
        {
            try
            {
                const rows = await this.#Json("/universe/names", {
                    method: "POST",
                    body: ids.slice(start, start + 500),
                    signal,
                    cache: false
                });

                for (const row of rows) names.set(row.id, row.name);
            }
            catch (error)
            {
                if (error?.name === "AbortError") throw error;
                // A private structure may make a name unavailable. Orders are
                // still useful with their system and numeric location IDs.
            }
        }
        return names;
    }

    /** Collects every paginated ESI response into one normalized result list. */
    async #Paged(path, query, signal)
    {
        const first = await this.#Response(path, { query: Object.assign({}, query, { page: 1 }), signal });
        const rows = await first.json();
        const pages = Math.max(1, Number(first.headers.get("X-Pages")) || 1);

        if (pages === 1) return rows;

        const requests = [];

        for (let page = 2; page <= pages; page++)
        {
            requests.push(this.#Json(path, {
                query: Object.assign({}, query, { page }),
                signal,
                cache: false
            }));
        }
        const batches = await Promise.all(requests);

        for (const batch of batches)
        {
            for (const row of batch) rows.push(row);
        }
        return rows;
    }

    /** Decodes a successful market response into a plain JSON value. */
    async #Json(path, options = {})
    {
        const response = await this.#Response(path, options);

        return response.json();
    }

    /** Validates the market transport response before body decoding. */
    async #Response(path, { method = "GET", query = null, body = null, signal } = {})
    {
        const url = this.#URL(path, query);
        const headers = {
            "Accept": "application/json",
            "X-Compatibility-Date": this.compatibilityDate,
            "X-Tenant": this.tenant,
            "X-User-Agent": this.userAgent
        };

        if (body !== null) headers["Content-Type"] = "application/json";

        let response = null;

        for (let attempt = 0; attempt < 3; attempt++)
        {
            response = await this.fetchImpl(url, {
                method,
                headers,
                body: body === null ? undefined : JSON.stringify(body),
                signal
            });

            if (response.ok) return response;
            if (![ 429, 502, 503, 504 ].includes(response.status) || attempt === 2) break;

            const seconds = Math.min(5, Math.max(1, Number(response.headers.get("Retry-After")) || attempt + 1));

            await delay(seconds * 1000, signal);
        }

        let message = `Market source request failed (${response?.status ?? "network"})`;

        try
        {
            const problem = await response.json();

            if (problem?.error) message = problem.error;
        }
        catch
        {
            // Keep the status-based message when the body is not JSON.
        }

        const error = new Error(message);

        error.statusCode = response?.status;
        throw error;
    }

    /** Constructs an ESI endpoint URL from normalized request parameters. */
    #URL(path, query)
    {
        const url = new URL(path, `${this.baseURL}/`);

        for (const [ name, value ] of Object.entries(query ?? {}))
        {
            if (value !== null && value !== undefined) url.searchParams.set(name, value);
        }
        return url;
    }

    /** Constructs an image-server URL for one normalized market type. */
    #IconURL(typeID)
    {
        return `https://images.evetech.net/types/${typeID}/icon?size=64&tenant=${encodeURIComponent(this.tenant)}`;
    }

}

function summary(type)
{
    return {
        typeID: type.typeID,
        name: type.name,
        group: type.groupName || "EXACT MATCH",
        iconURL: type.iconURL
    };
}

function plainText(value)
{
    return String(value ?? "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'")
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function delay(milliseconds, signal)
{
    return new Promise((resolve, reject) =>
    {
        const timeout = setTimeout(resolve, milliseconds);

        signal?.addEventListener("abort", () =>
        {
            clearTimeout(timeout);
            reject(signal.reason || new DOMException("Aborted", "AbortError"));
        }, { once: true });
    });
}
