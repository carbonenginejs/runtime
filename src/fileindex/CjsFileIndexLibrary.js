import { CjsFileIndex } from "./CjsFileIndex.js";
import { CjsFileIndexEntry } from "./CjsFileIndexEntry.js";
import { CjsFileIndexOverlay } from "./CjsFileIndexOverlay.js";
import { CjsFileIndexSource } from "./CjsFileIndexSource.js";

/** One complete provider/build appfileindex, resfileindexes, and manual overlays. */
export class CjsFileIndexLibrary
{

    #overlaysByName;
    #resFileIndexesByName;
    #sourcesByID;

    constructor({ provider, buildReference, appIndex, resFileIndexes, overlays = [], sources = [] })
    {
        if (!(appIndex instanceof CjsFileIndex) || appIndex.root !== "app")
        {
            throw new TypeError("CjsFileIndexLibrary requires an appfileindex.");
        }

        this.provider = normalizeProvider(provider);
        this.buildReference = freezeDeep(buildReference);
        this.build = buildReference.build;
        this.appIndex = appIndex;
        this.resFileIndexes = Object.freeze(Array.from(resFileIndexes, normalizeLoadedIndex));
        this.overlays = Object.freeze(Array.from(overlays, overlay =>
            overlay instanceof CjsFileIndexOverlay ? overlay : new CjsFileIndexOverlay(overlay)
        ));
        this.sources = Object.freeze([
            new CjsFileIndexSource({ id: "default", baseURL: this.provider.remote.resBaseURL }),
            ...Array.from(sources, source =>
                source instanceof CjsFileIndexSource ? source : new CjsFileIndexSource(source)
            )
        ]);
        this.indexNames = Object.freeze(this.resFileIndexes.map(item => item.name));
        this.overlayNames = Object.freeze(this.overlays.map(item => item.name));
        this.#resFileIndexesByName = new Map();
        this.#overlaysByName = new Map();
        this.#sourcesByID = new Map();

        for (const item of this.resFileIndexes)
        {
            if (this.#resFileIndexesByName.has(item.name))
            {
                throw new Error(`Duplicate loaded resfileindex: ${item.name}`);
            }

            this.#resFileIndexesByName.set(item.name, item);
        }

        for (const overlay of this.overlays)
        {
            if (this.#resFileIndexesByName.has(overlay.name) || this.#overlaysByName.has(overlay.name))
            {
                throw new Error(`Duplicate file-index layer name: ${overlay.name}`);
            }

            this.#overlaysByName.set(overlay.name, overlay);
        }

        for (const source of this.sources)
        {
            if (this.#sourcesByID.has(source.id))
            {
                throw new Error(`Duplicate file-index source ID: ${source.id}`);
            }

            this.#sourcesByID.set(source.id, source);
        }

        Object.freeze(this);
    }

    GetResFileIndex(name)
    {
        return this.#resFileIndexesByName.get(normalizeName(name))?.index ?? null;
    }

    HasResFileIndex(name)
    {
        return this.GetResFileIndex(name) !== null;
    }

    GetOverlay(name)
    {
        return this.#overlaysByName.get(normalizeName(name)) ?? null;
    }

    HasOverlay(name)
    {
        return this.GetOverlay(name) !== null;
    }

    Resolve(logicalPath, options = {})
    {
        const normalizedPath = CjsFileIndexEntry.normalizeLogicalPath(logicalPath, "res");

        if (options.indexName !== undefined)
        {
            const name = normalizeName(options.indexName);
            const layer = this.#overlaysByName.get(name) ?? this.#resFileIndexesByName.get(name);

            if (!layer) return null;

            return this.#resolveLayer(normalizedPath, layer, this.#overlaysByName.has(name));
        }

        const override = this.#findSingleOverlay(normalizedPath, "override");
        if (override) return this.#resolveLayer(normalizedPath, override, true);

        const official = this.#findOfficial(normalizedPath);
        if (official) return this.#resolveLayer(normalizedPath, official, false);

        const fallback = this.#findSingleOverlay(normalizedPath, "fallback");
        return fallback ? this.#resolveLayer(normalizedPath, fallback, true) : null;
    }

    WithOverlays(overlays)
    {
        return new CjsFileIndexLibrary({
            provider: this.provider,
            buildReference: this.buildReference,
            appIndex: this.appIndex,
            resFileIndexes: this.resFileIndexes,
            overlays,
            sources: this.sources.filter(source => source.id !== "default")
        });
    }

    #findOfficial(logicalPath)
    {
        // Official resfileindexes layer in declaration order: a later index
        // clobbers earlier records of the same logical path, so the last
        // declaring index owns the record and two identical logical paths
        // cannot coexist.
        const matches = this.resFileIndexes.filter(item => item.index.Has(logicalPath));
        return matches.at(-1) ?? null;
    }

    #findSingleOverlay(logicalPath, mode)
    {
        const matches = this.overlays.filter(item => item.mode === mode && item.Has(logicalPath));
        ensureSingleMatch(matches, logicalPath, `${mode} overlays`);
        return matches[0] ?? null;
    }

    #resolveLayer(logicalPath, layer, isOverlay)
    {
        const entry = layer.index.Find(logicalPath);

        if (!entry) return null;

        const parsed = CjsFileIndexSource.parseLocation(entry.location);
        const sourceID = parsed.sourceID ?? layer.sourceID ?? "default";
        const source = this.#sourcesByID.get(sourceID);

        if (!source)
        {
            throw new Error(`Unknown file-index source ID: ${sourceID}`);
        }

        return Object.freeze({
            logicalPath,
            indexName: layer.name,
            overlay: isOverlay,
            mode: isOverlay ? layer.mode : null,
            sourceID,
            sourceURL: source.Resolve(entry.location),
            entry
        });
    }

    static async resolveBuild(providerValue, options = {})
    {
        const provider = normalizeProvider(providerValue);
        const buildRef = normalizeBuildReference(options.build ?? provider.defaultBuildRef);
        const clientRef = options.client === undefined || options.client === null
            ? null
            : normalizeBuildReference(options.client);

        if (isExactBuild(buildRef))
        {
            const client = clientRef ? resolveProviderClient(provider, clientRef) : null;
            return freezeDeep({
                buildRef,
                build: buildRef,
                client: client?.id ?? null,
                metadataToken: client?.metadataToken ?? null,
                metadataURL: null,
                metadata: null,
                source: "exact"
            });
        }

        if (buildRef !== "latest" && clientRef)
        {
            throw new Error("Use either client or a named build reference, not both.");
        }

        const clients = buildRef === "latest"
            ? clientRef ? [ resolveProviderClient(provider, clientRef) ] : Object.values(provider.clients)
            : [ resolveProviderClient(provider, buildRef) ];

        if (clients.length === 0)
        {
            throw new Error(`Provider ${provider.id} has no clients for latest build discovery.`);
        }

        const candidates = await Promise.all(clients.map(client =>
            readClientBuild(provider, client, options.fetch ?? globalThis.fetch)
        ));
        candidates.sort((left, right) => compareExactBuilds(right.build, left.build));
        const selected = candidates[0];

        return freezeDeep({
            buildRef,
            build: selected.build,
            client: selected.client.id,
            metadataToken: selected.client.metadataToken,
            metadataURL: selected.metadataURL,
            metadata: selected.metadata,
            source: buildRef === "latest" && !clientRef ? "latest-remote-metadata" : "remote-metadata"
        });
    }

    static async load(providerValue, options = {})
    {
        const provider = normalizeProvider(providerValue);
        const fetchFunction = options.fetch ?? globalThis.fetch;
        const buildReference = await CjsFileIndexLibrary.resolveBuild(provider, {
            build: options.build,
            client: options.client,
            fetch: fetchFunction
        });
        const appIndex = await CjsFileIndex.loadAppFileIndex(
            joinURL(provider.remote.indexBaseURL, `eveonline_${buildReference.build}.txt`),
            { fetch: fetchFunction, requestInit: options.requestInit }
        );
        const resFileIndexes = await CjsFileIndex.loadDeclaredResFileIndexes(appIndex, {
            baseURL: provider.remote.appBaseURL,
            fetch: fetchFunction,
            requestInit: options.requestInit
        });

        return new CjsFileIndexLibrary({
            provider,
            buildReference,
            appIndex,
            resFileIndexes,
            overlays: options.overlays,
            sources: options.sources
        });
    }

}

function normalizeLoadedIndex(value)
{
    if (!value || !(value.index instanceof CjsFileIndex) || value.index.root !== "res")
    {
        throw new TypeError("CjsFileIndexLibrary resFileIndexes must contain resfileindexes.");
    }

    return Object.freeze({
        name: normalizeName(value.name),
        declaration: value.declaration ?? null,
        sourceID: value.sourceID === undefined || value.sourceID === null
            ? null
            : CjsFileIndexSource.normalizeID(value.sourceID),
        index: value.index
    });
}

function ensureSingleMatch(matches, logicalPath, label)
{
    if (matches.length > 1)
    {
        throw new Error(`Ambiguous ${logicalPath}: declared by multiple ${label}.`);
    }
}

function normalizeName(value)
{
    return CjsFileIndexOverlay.normalizeName(value);
}

function normalizeProvider(value)
{
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError("File-index provider must be an object.");
    }

    if (!value.remote || typeof value.remote !== "object" || Array.isArray(value.remote))
    {
        throw new TypeError("File-index provider remote must be an object.");
    }

    const clients = {};

    for (const [ rawID, rawClient ] of Object.entries(value.clients ?? {}))
    {
        const id = normalizeName(rawID);
        const metadataToken = normalizeRequiredString(rawClient?.metadataToken, `provider client ${id} metadataToken`);
        const aliases = Object.freeze(Array.from(new Set(Array.from(rawClient.aliases ?? [], normalizeBuildReference))));

        clients[id] = Object.freeze({
            id,
            metadataToken,
            aliases,
            references: Object.freeze([ ...new Set([ id, metadataToken.toLowerCase(), ...aliases ]) ])
        });
    }

    return freezeDeep({
        game: value.game === undefined ? null : String(value.game),
        id: normalizeName(value.id),
        defaultBuildRef: normalizeBuildReference(value.defaultBuildRef ?? "latest"),
        remote: {
            metadataBaseURL: normalizeHTTPURL(value.remote.metadataBaseURL, "metadataBaseURL"),
            indexBaseURL: normalizeHTTPURL(value.remote.indexBaseURL, "indexBaseURL"),
            appBaseURL: normalizeHTTPURL(value.remote.appBaseURL, "appBaseURL"),
            resBaseURL: normalizeHTTPURL(value.remote.resBaseURL, "resBaseURL")
        },
        clients
    });
}

function resolveProviderClient(provider, reference)
{
    const client = Object.values(provider.clients).find(item => item.references.includes(reference));

    if (!client) throw new Error(`Unknown client for provider ${provider.id}: ${reference}`);
    return client;
}

async function readClientBuild(provider, client, fetchFunction)
{
    if (typeof fetchFunction !== "function")
    {
        const error = new Error("fetch is unavailable in this environment.");
        error.code = "CJS_FILEINDEX_FETCH_UNSUPPORTED";
        throw error;
    }

    const metadataURL = joinURL(provider.remote.metadataBaseURL, `eveclient_${client.metadataToken}.json`);
    const response = await fetchFunction(metadataURL);

    if (!response || typeof response.json !== "function")
    {
        throw new TypeError("Build metadata fetch must return a Response-like value.");
    }

    if (response.ok === false)
    {
        const error = new Error(`Unable to load build metadata ${metadataURL}: HTTP ${response.status ?? "error"}.`);
        error.code = "CJS_FILEINDEX_HTTP_ERROR";
        error.status = response.status ?? null;
        error.sourceURL = metadataURL;
        throw error;
    }

    const metadata = await response.json();
    return { build: normalizeExactBuild(metadata?.build ?? metadata?.buildNumber), client, metadataURL, metadata };
}

function normalizeBuildReference(value)
{
    if (typeof value !== "string" && typeof value !== "number")
    {
        throw new TypeError("Build reference must be a string or number.");
    }

    const reference = String(value).trim().toLowerCase();

    if (!reference || reference.includes("/") || reference.includes("\\"))
    {
        throw new TypeError(`Invalid build reference: ${value}`);
    }

    return reference;
}

function normalizeExactBuild(value)
{
    const build = String(value ?? "").trim();
    if (!isExactBuild(build)) throw new TypeError("Remote metadata does not contain a numeric build.");
    return build;
}

function isExactBuild(value)
{
    return /^\d+$/u.test(String(value ?? "").trim());
}

function compareExactBuilds(left, right)
{
    const leftBuild = BigInt(left);
    const rightBuild = BigInt(right);
    if (leftBuild > rightBuild) return 1;
    if (leftBuild < rightBuild) return -1;
    return 0;
}

function normalizeHTTPURL(value, label)
{
    const url = new URL(normalizeRequiredString(value, `provider remote.${label}`));
    if (url.protocol !== "https:" && url.protocol !== "http:")
    {
        throw new TypeError(`provider remote.${label} must use HTTP(S).`);
    }
    return url.href.replace(/\/$/u, "");
}

function normalizeRequiredString(value, label)
{
    if (typeof value !== "string" || value.trim() === "")
    {
        throw new TypeError(`${label} must be a non-empty string.`);
    }
    return value.trim();
}

function joinURL(baseURL, relativePath)
{
    return `${String(baseURL).replace(/\/+$/u, "")}/${String(relativePath).replace(/^\/+/, "")}`;
}

function freezeDeep(value, seen = new Set())
{
    if (!value || typeof value !== "object" || seen.has(value)) return value;
    seen.add(value);
    for (const item of Object.values(value)) freezeDeep(item, seen);
    return Object.freeze(value);
}
