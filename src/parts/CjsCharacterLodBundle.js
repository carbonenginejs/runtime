import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterLodBundle", family: "character" })
/** One atomic character configuration and geometry selection. */
export class CjsCharacterLodBundle extends CjsCharacterNode
{
    @type.int32
    @io.persist
    requestedLod = null;

    @type.int32
    @io.persist
    resolvedLod = null;

    @type.path
    @io.persist
    configurationPath = "";

    @type.path
    @io.persist
    geometryPath = "";

    @type.string
    @io.persist
    modelFamily = "";

    @type.string
    @io.persist
    fallbackReason = "";

    /** Builds deterministic available bundles from flat resource paths. */
    static fromResources(configPaths = [], geometryPaths = [])
    {
        return BuildAvailableBundles(configPaths, geometryPaths)
            .map(value => this.from(value));
    }

    /** Resolves one requested LOD without separating its configuration and geometry. */
    static resolve(values, requestedLod)
    {
        const lod = NormalizeRequestedLod(requestedLod);
        const bundles = (values || [])
            .map(value => value instanceof this ? value : this.from(value))
            .filter(value => value.configurationPath && value.geometryPath)
            .sort(CompareBundles);

        if (!bundles.length)
        {
            return null;
        }

        const exact = lod === null
            ? null
            : bundles.find(value => value.resolvedLod === lod);
        const base = bundles.find(value => value.resolvedLod === null);
        const selected = exact || base || SelectNearestBundle(bundles, lod);
        const fallbackReason = exact || (lod === null && selected === base)
            ? ""
            : selected === base ? "base" : "nearest";

        return this.from({
            ...selected.GetValues(),
            requestedLod: lod,
            fallbackReason
        });
    }

}

function BuildAvailableBundles(configPaths, geometryPaths)
{
    const geometries = NormalizePathList(geometryPaths).map(ParseModelPath);
    const bundles = [];

    for (const configurationPath of NormalizePathList(configPaths))
    {
        const configuration = ParseModelPath(configurationPath);
        const candidates = geometries
            .filter(value => value.modelFamily === configuration.modelFamily
                && value.lod === configuration.lod)
            .sort((a, b) => CompareGeometryCandidates(configuration, a, b));
        const geometry = candidates[0];

        if (!geometry)
        {
            continue;
        }

        bundles.push({
            requestedLod: null,
            resolvedLod: configuration.lod,
            configurationPath: configuration.path,
            geometryPath: geometry.path,
            modelFamily: configuration.modelFamily,
            fallbackReason: ""
        });
    }

    return bundles.sort(CompareBundles);
}

function NormalizePathList(values)
{
    if (!Array.isArray(values))
    {
        throw new TypeError("Character LOD resource paths must be arrays");
    }

    return [ ...new Set(values.map(value => String(value || "")).filter(Boolean)) ]
        .sort(CompareStrings);
}

function ParseModelPath(value)
{
    const path = String(value || "");
    const separator = path.lastIndexOf("/");
    const dot = path.lastIndexOf(".");
    const stem = path.slice(separator + 1, dot > separator ? dot : undefined).toLowerCase();
    const match = stem.match(/_lod(\d+)/u);
    const family = stem
        .replace(/_lod\d+.*$/u, "")
        .replace(/_(?:nosim|wopockets)$/u, "")
        .replace(/[^a-z0-9]/gu, "");

    return {
        path,
        directory: path.slice(0, Math.max(separator, 0)).toLowerCase(),
        stem,
        modelFamily: family,
        lod: match ? Number(match[1]) : null
    };
}

function CompareGeometryCandidates(configuration, a, b)
{
    const directoryA = a.directory === configuration.directory ? 0 : 1;
    const directoryB = b.directory === configuration.directory ? 0 : 1;

    if (directoryA !== directoryB)
    {
        return directoryA - directoryB;
    }

    const stemA = a.stem === configuration.stem ? 0 : 1;
    const stemB = b.stem === configuration.stem ? 0 : 1;

    if (stemA !== stemB)
    {
        return stemA - stemB;
    }

    return CompareStrings(a.path, b.path);
}

function SelectNearestBundle(bundles, requestedLod)
{
    if (requestedLod === null)
    {
        return bundles[0];
    }

    return bundles.slice().sort((a, b) =>
    {
        const distanceA = Math.abs(a.resolvedLod - requestedLod);
        const distanceB = Math.abs(b.resolvedLod - requestedLod);

        // Native medium fallback prefers low before high. Generalize that
        // tie-break toward the larger LOD number (lower detail).
        return distanceA - distanceB
            || b.resolvedLod - a.resolvedLod
            || CompareBundles(a, b);
    })[0];
}

function NormalizeRequestedLod(value)
{
    if (value === null || value === undefined)
    {
        return null;
    }

    const lod = Number(value);

    if (!Number.isInteger(lod) || lod < 0)
    {
        throw new TypeError(`Character LOD must be a non-negative integer or null, received ${value}`);
    }

    return lod;
}

function CompareBundles(a, b)
{
    const lodA = a.resolvedLod === null ? -1 : a.resolvedLod;
    const lodB = b.resolvedLod === null ? -1 : b.resolvedLod;

    return lodA - lodB
        || CompareStrings(a.modelFamily, b.modelFamily)
        || CompareStrings(a.configurationPath, b.configurationPath)
        || CompareStrings(a.geometryPath, b.geometryPath);
}

function CompareStrings(a, b)
{
    return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}
