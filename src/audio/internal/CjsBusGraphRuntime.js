import { assertBusGraphRouteProjection } from "./busGraph.js";

/**
 * Owns stable, generation-scoped handles into one installed Audio Bus graph.
 * This checkpoint resolves topology only; it deliberately creates no audio nodes.
 */
export class CjsBusGraphRuntime
{
    _catalog = null;

    _routes = [];

    _sfxRoutes = new Map();

    _musicRoutes = new Map();

    _disposed = false;

    /** Installs one validated portable Bus graph generation. */
    constructor(catalog)
    {
        const value = RequireRecord(catalog, "Audio Bus graph runtime catalog");

        if (value.schemaVersion !== 1 || !Array.isArray(value.routes))
        {
            throw new TypeError("Audio Bus graph runtime requires a version-1 route catalog");
        }
        this._catalog = value;
        this._routes = value.routes.map((route, index) => ({
            index,
            route,
        }));
        this._sfxRoutes = IndexRouteReferences(
            value.sfxRoutes,
            this._routes,
            "Audio Bus graph runtime SFX routes",
        );
        this._musicRoutes = IndexRouteReferences(
            value.musicRoutes,
            this._routes,
            "Audio Bus graph runtime music routes",
        );
    }

    /** Resolves one SFX Sound's stable route handle, or null when it is unrouted. */
    ResolveSfxRoute(nodeId, projection = undefined)
    {
        return this._Resolve(this._sfxRoutes, nodeId, projection, "SFX Sound");
    }

    /** Resolves one music track's stable route handle, or null when it is unrouted. */
    ResolveMusicRoute(trackId, projection = undefined)
    {
        return this._Resolve(this._musicRoutes, trackId, projection, "music track");
    }

    /** Returns the immutable installed catalog while this generation is live. */
    GetCatalog()
    {
        return this._disposed ? null : this._catalog;
    }

    /** Returns whether a route handle belongs to this live generation. */
    OwnsRouteHandle(handle)
    {
        return !this._disposed && this._routes.includes(handle);
    }

    /** Invalidates this library generation. Safe to call more than once. */
    Dispose()
    {
        if (this._disposed) return;
        this._disposed = true;
        this._catalog = null;
        this._routes = [];
        this._sfxRoutes.clear();
        this._musicRoutes.clear();
    }

    /** Resolves and optionally verifies one exact route projection. */
    _Resolve(index, rawId, projection, kind)
    {
        if (this._disposed || rawId === null || rawId === undefined)
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
