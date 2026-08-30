import { throwIfAborted } from "#utils/errors";

const REQUIRED_SOURCE_METHODS = [
    "GetRegions",
    "BrowseTypes",
    "SearchTypes",
    "GetType",
    "GetOrders",
    "GetHistory"
];

/** Coordinates regional market data without owning DOM or presentation. */
export class CjsMarketController
{

    #browseController = null;
    #destroyed = false;
    #listeners = new Set();
    #loadController = null;
    #loadGeneration = 0;
    #searchController = null;
    #searchGeneration = 0;

    /**
     * Creates a market market controller around caller-supplied browser
     * collaborators.
     */
    constructor({ marketSource, onListenerError = null } = {})
    {
        for (const method of REQUIRED_SOURCE_METHODS)
        {
            if (typeof marketSource?.[method] !== "function")
            {
                throw new TypeError(`Market source requires ${method}()`);
            }
        }
        if (onListenerError !== null && typeof onListenerError !== "function")
        {
            throw new TypeError("onListenerError must be a function or null");
        }

        this.marketSource = marketSource;
        this.onListenerError = onListenerError;
        this.browseError = null;
        this.browseTypes = [];
        this.error = null;
        this.history = [];
        this.orders = [];
        this.regionError = null;
        this.regionID = null;
        this.regions = [];
        this.searchError = null;
        this.searchQuery = "";
        this.searchResults = [];
        this.searchStatus = "idle";
        this.status = "idle";
        this.type = null;
        this.typeID = null;
    }

    /** Loads browse metadata and then opens the requested regional market. */
    async Start({ typeID, regionID, signal = null } = {})
    {
        this.#AssertUsable();

        const selectedTypeID = PositiveID(typeID, "typeID");
        const selectedRegionID = PositiveID(regionID, "regionID");

        this.#browseController?.abort(AbortError("Market startup superseded"));
        const controller = new AbortController();
        const releaseSignal = ForwardAbort(signal, controller);

        this.#browseController = controller;
        this.typeID = selectedTypeID;
        this.regionID = selectedRegionID;
        this.status = "starting";
        this.#Emit("starting");

        try
        {
            const context = {
                selectedRegionID,
                signal: controller.signal
            };
            const results = await Promise.allSettled([
                this.marketSource.GetRegions.call(this.marketSource, context),
                this.marketSource.BrowseTypes.call(this.marketSource, context)
            ]);

            throwIfAborted(controller.signal, "Market request aborted");

            const regions = results[0];
            const browse = results[1];

            this.regionError = regions.status === "rejected" ? regions.reason : null;
            this.regions = regions.status === "fulfilled" && Array.isArray(regions.value)
                ? regions.value
                : [];
            this.browseError = browse.status === "rejected" ? browse.reason : null;
            this.browseTypes = browse.status === "fulfilled" && Array.isArray(browse.value)
                ? browse.value
                : [];
            this.searchResults = this.browseTypes;
            this.#Emit("directory");
        }
        finally
        {
            releaseSignal();

            if (this.#browseController === controller)
            {
                this.#browseController = null;
            }
        }

        return this.Open({
            typeID: selectedTypeID,
            regionID: selectedRegionID,
            signal
        });
    }

    /** Opens one type in one region and discards superseded results. */
    async Open({ typeID = this.typeID, regionID = this.regionID, signal = null } = {})
    {
        this.#AssertUsable();

        const selectedTypeID = PositiveID(typeID, "typeID");
        const selectedRegionID = PositiveID(regionID, "regionID");

        this.#loadController?.abort(AbortError("A newer market was selected"));

        const controller = new AbortController();
        const releaseSignal = ForwardAbort(signal, controller);
        const generation = ++this.#loadGeneration;

        this.#loadController = controller;
        this.error = null;
        this.regionID = selectedRegionID;
        this.status = "loading";
        this.typeID = selectedTypeID;
        this.#Emit("loading");

        try
        {
            const request = {
                typeID: selectedTypeID,
                regionID: selectedRegionID,
                signal: controller.signal
            };
            const [ type, orders, history ] = await Promise.all([
                this.marketSource.GetType.call(this.marketSource, selectedTypeID, request),
                this.marketSource.GetOrders.call(this.marketSource, request),
                this.marketSource.GetHistory.call(this.marketSource, request)
            ]);

            ThrowIfStale(generation, this.#loadGeneration, controller.signal);

            this.type = type;
            this.orders = Array.isArray(orders) ? orders : [];
            this.history = Array.isArray(history) ? history : [];
            this.status = "ready";
            this.#Emit("market");

            return type;
        }
        catch (error)
        {
            if (generation === this.#loadGeneration && !controller.signal.aborted)
            {
                this.error = error;
                this.status = "failed";
                this.#Emit("error");
            }

            throw error;
        }
        finally
        {
            releaseSignal();

            if (this.#loadController === controller)
            {
                this.#loadController = null;
            }
        }
    }

    /** Refreshes the active selection. */
    Refresh({ signal = null } = {})
    {
        return this.Open({ signal });
    }

    /** Searches types while ensuring only the newest query updates state. */
    async Search(query, { signal = null } = {})
    {
        this.#AssertUsable();

        const normalized = String(query ?? "").trim();

        this.#searchController?.abort(AbortError("A newer market search was entered"));
        this.searchQuery = normalized;
        this.searchError = null;

        if (!normalized)
        {
            ++this.#searchGeneration;
            this.#searchController = null;
            this.searchResults = this.browseTypes;
            this.searchStatus = "idle";
            this.#Emit("search");

            return this.searchResults;
        }

        const controller = new AbortController();
        const releaseSignal = ForwardAbort(signal, controller);
        const generation = ++this.#searchGeneration;

        this.#searchController = controller;
        this.searchResults = [];
        this.searchStatus = "loading";
        this.#Emit("search-loading");

        try
        {
            const results = await this.marketSource.SearchTypes.call(
                this.marketSource,
                normalized,
                { regionID: this.regionID, signal: controller.signal }
            );

            ThrowIfStale(generation, this.#searchGeneration, controller.signal);

            this.searchResults = Array.isArray(results) ? results : [];
            this.searchStatus = "ready";
            this.#Emit("search");

            return this.searchResults;
        }
        catch (error)
        {
            if (generation === this.#searchGeneration && !controller.signal.aborted)
            {
                this.searchError = error;
                this.searchResults = [];
                this.searchStatus = "failed";
                this.#Emit("search-error");
            }

            throw error;
        }
        finally
        {
            releaseSignal();

            if (this.#searchController === controller)
            {
                this.#searchController = null;
            }
        }
    }

    /** Subscribes to mutable controller event records. */
    Subscribe(listener)
    {
        this.#AssertUsable();

        if (typeof listener !== "function")
        {
            throw new TypeError("Market listener must be a function");
        }

        this.#listeners.add(listener);

        return () => this.#listeners.delete(listener);
    }

    /** Returns a mutable snapshot without exposing controller collections. */
    Snapshot()
    {
        return {
            browseError: this.browseError,
            browseTypes: this.browseTypes.slice(),
            error: this.error,
            history: this.history.slice(),
            orders: this.orders.slice(),
            regionError: this.regionError,
            regionID: this.regionID,
            regions: this.regions.slice(),
            searchError: this.searchError,
            searchQuery: this.searchQuery,
            searchResults: this.searchResults.slice(),
            searchStatus: this.searchStatus,
            status: this.status,
            type: this.type,
            typeID: this.typeID
        };
    }

    /** Aborts pending work and releases subscriptions. */
    Destroy()
    {
        if (this.#destroyed)
        {
            return;
        }

        this.#destroyed = true;
        ++this.#loadGeneration;
        ++this.#searchGeneration;
        this.#browseController?.abort(AbortError("Market controller destroyed"));
        this.#loadController?.abort(AbortError("Market controller destroyed"));
        this.#searchController?.abort(AbortError("Market controller destroyed"));
        this.#browseController = null;
        this.#loadController = null;
        this.#searchController = null;
        this.status = "destroyed";
        this.#listeners.clear();
    }

    /** Notifies registered market observers after mutable state changes. */
    #Emit(reason)
    {
        if (!this.#listeners.size)
        {
            return;
        }

        const event = {
            reason,
            state: this.Snapshot()
        };

        for (const listener of this.#listeners)
        {
            try
            {
                listener(event);
            }
            catch (error)
            {
                this.onListenerError?.(error, listener);
            }
        }
    }

    /** Rejects work after the market component has been destroyed. */
    #AssertUsable()
    {
        if (this.#destroyed)
        {
            throw new Error("CjsMarketController has been destroyed");
        }
    }

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

function ForwardAbort(signal, controller)
{
    if (!signal)
    {
        return () => undefined;
    }
    if (signal.aborted)
    {
        controller.abort(signal.reason);

        return () => undefined;
    }

    const onAbort = () => controller.abort(signal.reason);

    signal.addEventListener("abort", onAbort, { once: true });

    return () => signal.removeEventListener("abort", onAbort);
}

function ThrowIfStale(generation, currentGeneration, signal)
{
    throwIfAborted(signal, "Market request aborted");

    if (generation !== currentGeneration)
    {
        throw AbortError("Market request superseded");
    }
}

function AbortError(message)
{
    const error = new Error(message);

    error.name = "AbortError";

    return error;
}
