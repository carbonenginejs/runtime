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

    /**
     * Composes one build's appfileindex, its loaded resfileindexes and any manual
     * overlays into a frozen resolver. A "default" source built from the provider
     * res base URL is always prepended, overlay and index names share one
     * namespace, and duplicate layer names or source IDs are rejected.
     * @param {object} buildReference Result of resolveBuild; its build field
     * becomes the library build.
     * @param {Array} resFileIndexes { name, index, declaration, sourceID } records.
     */
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
        this.resFileIndexes = Array.from(resFileIndexes, normalizeLoadedIndex);
        this.overlays = Array.from(overlays, overlay =>
            overlay instanceof CjsFileIndexOverlay ? overlay : new CjsFileIndexOverlay(overlay)
        );
        this.sources = [
            new CjsFileIndexSource({ id: "default", baseURL: this.provider.remote.resBaseURL }),
            ...Array.from(sources, source =>
                source instanceof CjsFileIndexSource ? source : new CjsFileIndexSource(source)
            )
        ];
        this.indexNames = this.resFileIndexes.map(item => item.name);
        this.overlayNames = this.overlays.map(item => item.name);
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

        this;
    }

    /**
     * Returns the official index loaded under that layer name, or null; the
     * unsuffixed resfileindex is named "main".
     */
    GetResFileIndex(name)
    {
        return this.#resFileIndexesByName.get(normalizeName(name))?.index ?? null;
    }

    /**
     * Reports whether an official index was loaded under that layer name;
     * overlays do not count.
     */
    HasResFileIndex(name)
    {
        return this.GetResFileIndex(name) !== null;
    }

    /**
     * Returns the named manual overlay, or null; overlay names never collide
     * with official index names.
     */
    GetOverlay(name)
    {
        return this.#overlaysByName.get(normalizeName(name)) ?? null;
    }

    /** Reports whether a manual overlay was registered under that name. */
    HasOverlay(name)
    {
        return this.GetOverlay(name) !== null;
    }

    /**
     * Resolves a logical path through the layer precedence override overlays,
     * then the official resfileindexes, then fallback overlays, and returns a
     * frozen record { logicalPath, indexName, overlay, mode, sourceID,
     * sourceURL, entry } or null when no layer declares it.
     * @param {object} options indexName pins the lookup to one named overlay or
     * official index and skips precedence entirely.
     */
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

    /**
     * Returns a new library over the same build and loaded indexes with a
     * different overlay set, dropping the implicit "default" source so the
     * constructor re-adds it.
     */
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

    /**
     * Returns the last official resfileindex declaring the path, since a later
     * index clobbers earlier records of the same logical path.
     */
    #findOfficial(logicalPath)
    {
        // Official resfileindexes layer in declaration order: a later index
        // clobbers earlier records of the same logical path, so the last
        // declaring index owns the record and two identical logical paths
        // cannot coexist.
        const matches = this.resFileIndexes.filter(item => item.index.Has(logicalPath));
        return matches.at(-1) ?? null;
    }

    /**
     * Returns the one overlay of the given mode that declares the path, throwing
     * when two overlays of that mode make it ambiguous rather than picking a
     * winner.
     */
    #findSingleOverlay(logicalPath, mode)
    {
        const matches = this.overlays.filter(item => item.mode === mode && item.Has(logicalPath));
        ensureSingleMatch(matches, logicalPath, `${mode} overlays`);
        return matches[0] ?? null;
    }

    /**
     * Turns one layer hit into the frozen resolution record, taking the source
     * from the location prefix, else the layer sourceID, else "default", and
     * failing on an unknown source ID.
     */
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

        return {
            logicalPath,
            indexName: layer.name,
            overlay: isOverlay,
            mode: isOverlay ? layer.mode : null,
            sourceID,
            sourceURL: source.Resolve(entry.location),
            entry
        };
    }

    /**
     * Resolves a build reference to an exact build number. A numeric reference
     * short-circuits with no network at all; "latest" reads each configured
     * client's remote metadata and keeps the highest build, and a client name
     * reads only that client. Passing both client and a named build is rejected.
     * @returns {object} Frozen { buildRef, build, client, metadataToken,
     * metadataURL, metadata, source } where source records how it was decided.
     */
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

    /**
     * Loads a whole library for one provider: resolves the build, fetches
     * eveonline_<build>.txt as the appfileindex, then loads every resfileindex
     * it declares - all through the injected fetch and the provider's declared
     * base URLs.
     */
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

    return {
        name: normalizeName(value.name),
        declaration: value.declaration ?? null,
        sourceID: value.sourceID === undefined || value.sourceID === null
            ? null
            : CjsFileIndexSource.normalizeID(value.sourceID),
        index: value.index
    };
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
        const aliases = Array.from(new Set(Array.from(rawClient.aliases ?? [], normalizeBuildReference)));

        clients[id] = {
            id,
            metadataToken,
            aliases,
            references: [ ...new Set([ id, metadataToken.toLowerCase(), ...aliases ]) ]
        };
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
    return value;
}
