import { throwIfAborted } from "#utils/errors";

export const SHIP_SHOW_INFO_PANEL_METHODS = {
    overview: "FetchOverview",
    attributes: "FetchAttributes",
    fitting: "FetchFitting",
    skills: "FetchSkills",
    variations: "FetchVariations",
    industry: "FetchIndustry",
    skins: "FetchSkins"
};

export const SHIP_SHOW_INFO_PANELS = Object.keys(SHIP_SHOW_INFO_PANEL_METHODS);

/** Coordinates Show Info data and renderer behavior without owning presentation. */
export class CjsShipShowInfoController
{

    #activeController = null;
    #destroyed = false;
    #generation = 0;
    #listeners = new Set();
    #panelData = new Map();
    #panelPending = new Map();

    /**
     * Creates a ship-detail ship show info controller around caller-supplied
     * browser collaborators.
     */
    constructor({ shipSource, renderer = null, onListenerError = null } = {})
    {
        if (typeof shipSource?.FetchShip !== "function")
        {
            throw new TypeError("CjsShipShowInfoController requires a ship source");
        }
        if (renderer !== null && typeof renderer !== "object")
        {
            throw new TypeError("renderer must be an object or null");
        }
        if (onListenerError !== null && typeof onListenerError !== "function")
        {
            throw new TypeError("onListenerError must be a function or null");
        }

        this.shipSource = shipSource;
        this.renderer = renderer;
        this.onListenerError = onListenerError;
        this.activePanel = "overview";
        this.characterID = null;
        this.error = null;
        this.regionID = null;
        this.selectedSkin = null;
        this.ship = null;
        this.status = "idle";
        this.typeID = null;
    }

    /** Mounts the optional injected renderer on a caller-owned surface. */
    async Mount(container)
    {
        this.#AssertUsable();

        if (typeof this.renderer?.Mount !== "function")
        {
            return false;
        }

        await this.renderer.Mount(container);

        return true;
    }

    /** Opens one ship and awaits its asynchronous source and renderer loads. */
    async Open({ typeID, regionID = null, characterID = null, signal = null } = {})
    {
        this.#AssertUsable();

        const selectedTypeID = PositiveID(typeID, "typeID");
        const selectedRegionID = OptionalPositiveID(regionID, "regionID");
        const selectedCharacterID = OptionalPositiveID(characterID, "characterID");

        this.#activeController?.abort(AbortError("A newer ship was selected"));

        const controller = new AbortController();
        const releaseSignal = ForwardAbort(signal, controller);
        const generation = ++this.#generation;

        this.#activeController = controller;
        this.#panelData.clear();
        this.#panelPending.clear();
        this.activePanel = "overview";
        this.characterID = selectedCharacterID;
        this.error = null;
        this.regionID = selectedRegionID;
        this.selectedSkin = null;
        this.ship = null;
        this.status = "loading";
        this.typeID = selectedTypeID;
        this.#Emit("loading");

        try
        {
            throwIfAborted(controller.signal, "Show Info request aborted");

            const ship = await this.shipSource.FetchShip({
                typeID: selectedTypeID,
                regionID: selectedRegionID,
                characterID: selectedCharacterID,
                signal: controller.signal
            });

            if (!ship || typeof ship !== "object")
            {
                throw new TypeError("Ship source FetchShip() returned no record");
            }

            ThrowIfStale(generation, this.#generation, controller.signal);

            if (typeof this.renderer?.FetchShip === "function")
            {
                await this.renderer.FetchShip({
                    ship,
                    dna: ship.dna,
                    signal: controller.signal
                });
            }

            ThrowIfStale(generation, this.#generation, controller.signal);

            this.ship = ship;
            this.status = "ready";
            this.#Emit("ship", { ship });

            return ship;
        }
        catch (error)
        {
            if (generation === this.#generation && !controller.signal.aborted)
            {
                this.error = error;
                this.status = "failed";
                this.#Emit("error", { error });
            }

            throw error;
        }
        finally
        {
            releaseSignal();

            if (this.#activeController === controller && controller.signal.aborted)
            {
                this.#activeController = null;
            }
        }
    }

    /** Selects a stage and lazily returns its provider-neutral panel record. */
    async SelectPanel(panel, { signal = null } = {})
    {
        this.#AssertReady();
        throwIfAborted(signal, "Show Info request aborted");

        const selectedPanel = NormalizePanel(panel);

        this.activePanel = selectedPanel;

        if (typeof this.renderer?.SelectPanel === "function")
        {
            const selection = this.renderer.SelectPanel({
                panel: selectedPanel,
                ship: this.ship,
                signal: this.#activeController?.signal ?? signal
            });

            await AwaitWithSignal(selection, signal);
        }

        throwIfAborted(signal, "Show Info request aborted");
        this.#Emit("panel-selection", { panel: selectedPanel });

        return this.FetchPanel(selectedPanel, { signal });
    }

    /** Lazily fetches one panel and shares its in-flight Promise. */
    FetchPanel(panel, { signal = null } = {})
    {
        this.#AssertReady();
        throwIfAborted(signal, "Show Info request aborted");

        const selectedPanel = NormalizePanel(panel);

        if (this.#panelData.has(selectedPanel))
        {
            return Promise.resolve(this.#panelData.get(selectedPanel));
        }
        if (this.#panelPending.has(selectedPanel))
        {
            return AwaitWithSignal(this.#panelPending.get(selectedPanel), signal);
        }

        return AwaitWithSignal(
            this.#FetchRecord(selectedPanel, SHIP_SHOW_INFO_PANEL_METHODS[selectedPanel]),
            signal
        );
    }

    /** Lazily fetches optional regional-price enrichment. */
    FetchPrice({ signal = null } = {})
    {
        this.#AssertReady();
        throwIfAborted(signal, "Show Info request aborted");

        if (typeof this.shipSource.FetchPrice !== "function")
        {
            return Promise.resolve(null);
        }

        return AwaitWithSignal(this.#FetchRecord("price", "FetchPrice"), signal);
    }

    /** Applies one skin through the injected renderer without changing source data. */
    async SelectSkin(skin = null, { signal = null } = {})
    {
        this.#AssertReady();
        throwIfAborted(signal, "Show Info request aborted");

        if (typeof this.renderer?.FetchSkin === "function")
        {
            const selection = this.renderer.FetchSkin({
                ship: this.ship,
                skin,
                signal: this.#activeController?.signal ?? signal
            });

            await AwaitWithSignal(selection, signal);
        }

        throwIfAborted(signal, "Show Info request aborted");
        this.selectedSkin = skin;
        this.#Emit("skin", { skin });

        return skin;
    }

    /** Opens a selected variation through the same newest-request-wins path. */
    SelectVariation(variation, { signal = null } = {})
    {
        const typeID = PositiveID(variation?.typeID, "variation.typeID");

        return this.Open({
            typeID,
            regionID: this.regionID,
            characterID: this.characterID,
            signal
        });
    }

    /** Subscribes to mutable controller event records. */
    Subscribe(listener)
    {
        this.#AssertUsable();

        if (typeof listener !== "function")
        {
            throw new TypeError("Show Info listener must be a function");
        }

        this.#listeners.add(listener);

        return () => this.#listeners.delete(listener);
    }

    /** Returns a mutable snapshot without exposing internal maps. */
    Snapshot()
    {
        const panels = {};

        for (const [ name, value ] of this.#panelData)
        {
            panels[name] = value;
        }

        return {
            activePanel: this.activePanel,
            characterID: this.characterID,
            error: this.error,
            panels,
            regionID: this.regionID,
            selectedSkin: this.selectedSkin,
            ship: this.ship,
            status: this.status,
            typeID: this.typeID
        };
    }

    /** Aborts all pending work and returns renderer ownership. */
    async Destroy()
    {
        if (this.#destroyed)
        {
            return;
        }

        this.#destroyed = true;
        ++this.#generation;
        this.#activeController?.abort(AbortError("Show Info controller destroyed"));
        this.#activeController = null;
        this.#panelData.clear();
        this.#panelPending.clear();
        this.status = "destroyed";

        if (typeof this.renderer?.Destroy === "function")
        {
            await this.renderer.Destroy();
        }

        this.#listeners.clear();
    }

    /** Loads normalized record data from the configured ship-detail source. */
    #FetchRecord(key, method)
    {
        const loader = this.shipSource[method];

        if (typeof loader !== "function")
        {
            this.#panelData.set(key, null);

            return Promise.resolve(null);
        }

        const generation = this.#generation;
        const signal = this.#activeController?.signal ?? null;
        const request = {
            typeID: this.typeID,
            regionID: this.regionID,
            characterID: this.characterID,
            ship: this.ship,
            signal
        };
        const pending = Promise.resolve(loader.call(this.shipSource, request))
            .then(value =>
            {
                ThrowIfStale(generation, this.#generation, signal);
                this.#panelData.set(key, value ?? null);
                this.#Emit("panel", { panel: key, data: value ?? null });

                return value ?? null;
            })
            .finally(() =>
            {
                if (this.#panelPending.get(key) === pending)
                {
                    this.#panelPending.delete(key);
                }
            });

        this.#panelPending.set(key, pending);

        return pending;
    }

    /** Notifies registered ship-detail observers after mutable state changes. */
    #Emit(kind, details = {})
    {
        const event = Object.assign({
            kind,
            snapshot: this.Snapshot()
        }, details);

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

    /**
     * Rejects controller work until required ship-detail collaborators are
     * ready.
     */
    #AssertReady()
    {
        this.#AssertUsable();

        if (this.status !== "ready" || !this.ship)
        {
            throw new Error("Show Info must open a ship first");
        }
    }

    /** Rejects work after the ship-detail component has been destroyed. */
    #AssertUsable()
    {
        if (this.#destroyed)
        {
            throw new Error("CjsShipShowInfoController has been destroyed");
        }
    }

}

function NormalizePanel(value)
{
    const panel = String(value ?? "").trim().toLowerCase();

    if (!Object.hasOwn(SHIP_SHOW_INFO_PANEL_METHODS, panel))
    {
        throw new TypeError(`Unknown Show Info panel: ${value}`);
    }

    return panel;
}

function PositiveID(value, name)
{
    const id = Number(value);

    if (!/^\d+$/u.test(String(value ?? "")) || !Number.isSafeInteger(id) || id <= 0)
    {
        throw new TypeError(`${name} must be a positive integer`);
    }

    return id;
}

function OptionalPositiveID(value, name)
{
    return value === null || value === undefined || value === ""
        ? null
        : PositiveID(value, name);
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
    if (generation !== currentGeneration)
    {
        throw AbortError("Show Info request was superseded");
    }

    throwIfAborted(signal, "Show Info request aborted");
}

function AbortError(message)
{
    const error = new Error(message);

    error.name = "AbortError";

    return error;
}

function AwaitWithSignal(value, signal)
{
    const pending = Promise.resolve(value);

    if (!signal)
    {
        return pending;
    }
    if (signal.aborted)
    {
        return Promise.reject(signal.reason ?? AbortError("Show Info request aborted"));
    }

    return new Promise((resolve, reject) =>
    {
        const onAbort = () => reject(signal.reason ?? AbortError("Show Info request aborted"));

        signal.addEventListener("abort", onAbort, { once: true });
        pending.then(resolve, reject).finally(() =>
        {
            signal.removeEventListener("abort", onAbort);
        });
    });
}
