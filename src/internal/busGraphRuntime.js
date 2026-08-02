import { assertBusGraphRouteProjection } from "./busGraph.js";

/**
 * Owns stable, generation-scoped handles into one installed Audio Bus graph.
 * This checkpoint resolves topology only; it deliberately creates no audio nodes.
 */
export class CjsBusGraphRuntime
{
    #catalog = null;

    #routes = [];

    #sfxRoutes = new Map();

    #musicRoutes = new Map();

    #disposed = false;

    constructor(catalog)
    {
        const value = RequireRecord(catalog, "Audio Bus graph runtime catalog");

        if (value.schemaVersion !== 1 || !Array.isArray(value.routes))
        {
            throw new TypeError("Audio Bus graph runtime requires a version-1 route catalog");
        }
        this.#catalog = value;
        this.#routes = value.routes.map((route, index) => Object.freeze({
            index,
            route,
        }));
        this.#sfxRoutes = IndexRouteReferences(
            value.sfxRoutes,
            this.#routes,
            "Audio Bus graph runtime SFX routes",
        );
        this.#musicRoutes = IndexRouteReferences(
            value.musicRoutes,
            this.#routes,
            "Audio Bus graph runtime music routes",
        );
    }

    /** Resolves one SFX Sound's stable route handle, or null when it is unrouted. */
    ResolveSfxRoute(nodeId, projection = undefined)
    {
        return this.#Resolve(this.#sfxRoutes, nodeId, projection, "SFX Sound");
    }

    /** Resolves one music track's stable route handle, or null when it is unrouted. */
    ResolveMusicRoute(trackId, projection = undefined)
    {
        return this.#Resolve(this.#musicRoutes, trackId, projection, "music track");
    }

    /** Invalidates this library generation. Safe to call more than once. */
    Dispose()
    {
        if (this.#disposed) return;
        this.#disposed = true;
        this.#catalog = null;
        this.#routes = [];
        this.#sfxRoutes.clear();
        this.#musicRoutes.clear();
    }

    #Resolve(index, rawId, projection, kind)
    {
        if (this.#disposed || rawId === null || rawId === undefined)
        {
            return null;
        }
        const id = CanonicalPositiveId(rawId, `Audio Bus graph runtime ${kind}`);
        const handle = index.get(id) ?? null;

        if (handle && projection !== undefined)
        {
            assertBusGraphRouteProjection(
                handle.route,
                projection,
                `Audio Bus graph runtime ${kind} ${id}`,
            );
        }
        return handle;
    }
}

function IndexRouteReferences(value, handles, label)
{
    const raw = RequireRecord(value, label);
    const result = new Map();

    for (const [ rawId, rawIndex ] of Object.entries(raw))
    {
        const id = CanonicalPositiveId(rawId, `${label} ${rawId}`);
        const index = Number(rawIndex);

        if (!Number.isSafeInteger(index) || index < 0 || index >= handles.length)
        {
            throw new TypeError(`${label} ${id} has an invalid route index`);
        }
        result.set(id, handles[index]);
    }
    return result;
}

function RequireRecord(value, label)
{
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError(`${label} must be an object`);
    }
    return value;
}

function CanonicalPositiveId(value, label)
{
    const text = String(value);
    const number = Number(text);

    if (!Number.isSafeInteger(number)
        || number <= 0
        || number > 0xffffffff
        || String(number) !== text)
    {
        throw new TypeError(`${label} must be a canonical positive id`);
    }
    return text;
}
