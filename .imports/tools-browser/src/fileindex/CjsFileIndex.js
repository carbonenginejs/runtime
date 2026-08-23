import { decodeUtf8 } from "@carbonenginejs/runtime-utils/text";
import { CjsFileIndexSource } from "./CjsFileIndexSource.js";
import { CjsFileIndexEntry } from "./CjsFileIndexEntry.js";

/** An immutable file index with deterministic declaration-order lookup. */
export class CjsFileIndex
{

    #entriesByPath;

    /**
     * Freezes the entries and indexes them by logical path, rejecting a duplicate
     * logical path or an entry whose root disagrees with the index root; entries
     * keep their declaration order and plain objects are upgraded to entries.
     * @param {Iterable} entries CjsFileIndexEntry instances or entry option objects.
     * @param {object} options root (default "res"), kind, name and sourceURL; name
     * defaults to "app" for an app root and "main" otherwise.
     */
    constructor(entries, options = {})
    {
        this.root = CjsFileIndexEntry.normalizeRoot(options.root ?? "res");
        this.kind = options.kind ?? `${this.root}fileindex`;
        this.name = normalizeName(options.name ?? (this.root === "app" ? "app" : "main"));
        this.sourceURL = normalizeSourceURL(options.sourceURL);
        this.entries = Object.freeze(Array.from(entries, entry =>
            entry instanceof CjsFileIndexEntry
                ? entry
                : new CjsFileIndexEntry({ ...entry, root: this.root })
        ));
        this.count = this.entries.length;
        this.#entriesByPath = new Map();

        for (const entry of this.entries)
        {
            if (entry.root !== this.root)
            {
                throw new Error(`Invalid ${this.kind} entry root: ${entry.logicalPath}`);
            }

            if (this.#entriesByPath.has(entry.logicalPath))
            {
                throw new Error(`Duplicate ${this.kind} resource: ${entry.logicalPath}`);
            }

            this.#entriesByPath.set(entry.logicalPath, entry);
        }

        Object.freeze(this);
    }

    /**
     * Normalizes the path against this index root first, so a rootless,
     * backslashed or mixed-case path still matches; returns null when the index
     * does not declare it.
     */
    Find(logicalPath)
    {
        return this.#entriesByPath.get(
            CjsFileIndexEntry.normalizeLogicalPath(logicalPath, this.root)
        ) ?? null;
    }

    /**
     * Reports whether this index alone declares the path, without consulting
     * overlays or any other index.
     */
    Has(logicalPath)
    {
        return this.Find(logicalPath) !== null;
    }

    [Symbol.iterator]()
    {
        return this.entries[Symbol.iterator]();
    }

    /**
     * Parses file-index text as one entry per non-empty line, numbering lines
     * from 1 so a malformed row is reported against its source line.
     */
    static parse(text, options = {})
    {
        if (typeof text !== "string")
        {
            throw new TypeError("file-index text must be a string.");
        }

        const root = CjsFileIndexEntry.normalizeRoot(options.root ?? "res");
        const entries = [];
        const lines = text.split(/\r?\n/u);

        for (let index = 0; index < lines.length; index++)
        {
            const line = lines[index].trim();

            if (line) entries.push(CjsFileIndexEntry.parse(line, index + 1, root));
        }

        return new CjsFileIndex(entries, { ...options, root });
    }

    /**
     * Parses text as the app-rooted appfileindex, which is the only index that
     * declares which resfileindexes a build has.
     */
    static parseAppFileIndex(text, options = {})
    {
        return CjsFileIndex.parse(text, {
            ...options,
            root: "app",
            kind: "appfileindex",
            name: options.name ?? "app"
        });
    }

    /**
     * Parses text as a res-rooted resfileindex; pass options.name to distinguish
     * it from the other resfileindexes of the same build.
     */
    static parseResFileIndex(text, options = {})
    {
        return CjsFileIndex.parse(text, { ...options, root: "res", kind: "resfileindex" });
    }

    /**
     * Decodes caller-supplied UTF-8 bytes in fatal mode, so malformed input
     * fails instead of silently producing replacement characters, then parses
     * them.
     */
    static decode(bytes, options = {})
    {
        return CjsFileIndex.parse(decodeUtf8(bytes, { fatal: true }), options);
    }

    /** Decodes UTF-8 bytes as the app-rooted appfileindex. */
    static decodeAppFileIndex(bytes, options = {})
    {
        return CjsFileIndex.decode(bytes, {
            ...options,
            root: "app",
            kind: "appfileindex",
            name: options.name ?? "app"
        });
    }

    /** Decodes UTF-8 bytes as a res-rooted resfileindex. */
    static decodeResFileIndex(bytes, options = {})
    {
        return CjsFileIndex.decode(bytes, { ...options, root: "res", kind: "resfileindex" });
    }

    /**
     * Fetches and decodes one index from a caller-supplied URL; it discovers
     * nothing, and the fetch implementation itself may be injected for tests or
     * non-browser hosts. Failures carry a code: CJS_FILEINDEX_FETCH_UNSUPPORTED
     * when no fetch exists, CJS_FILEINDEX_HTTP_ERROR for a non-ok response.
     * @param {string|object} source Anything the injected fetch accepts.
     * @param {object} options fetch, requestInit, root, kind and name; the
     * resolved response URL becomes the index sourceURL.
     */
    static async load(source, options = {})
    {
        const fetchFunction = options.fetch ?? globalThis.fetch;

        if (typeof fetchFunction !== "function")
        {
            const error = new Error("fetch is unavailable in this environment.");
            error.code = "CJS_FILEINDEX_FETCH_UNSUPPORTED";
            throw error;
        }

        const response = await fetchFunction(source, options.requestInit);

        if (!response || typeof response.arrayBuffer !== "function")
        {
            throw new TypeError("file-index fetch must return a Response-like value.");
        }

        const sourceURL = response.url || String(source);

        if (response.ok === false)
        {
            const error = new Error(`Unable to load file index ${sourceURL}: HTTP ${response.status ?? "error"}.`);
            error.code = "CJS_FILEINDEX_HTTP_ERROR";
            error.status = response.status ?? null;
            error.sourceURL = sourceURL;
            throw error;
        }

        return CjsFileIndex.decode(await response.arrayBuffer(), {
            root: options.root,
            kind: options.kind,
            name: options.name,
            sourceURL
        });
    }

    /** Fetches one URL and decodes it as the app-rooted appfileindex. */
    static loadAppFileIndex(source, options = {})
    {
        return CjsFileIndex.load(source, {
            ...options,
            root: "app",
            kind: "appfileindex",
            name: options.name ?? "app"
        });
    }

    /** Fetches one URL and decodes it as a res-rooted resfileindex. */
    static loadResFileIndex(source, options = {})
    {
        return CjsFileIndex.load(source, { ...options, root: "res", kind: "resfileindex" });
    }

    /**
     * Reads the app:/resfileindex[_<name>].txt rows already present in an
     * appfileindex, naming the unsuffixed one "main"; this reads declarations
     * rather than probing any host, and rejects a duplicate or malformed name.
     */
    static discoverResFileIndexes(appFileIndex)
    {
        if (!(appFileIndex instanceof CjsFileIndex) || appFileIndex.root !== "app")
        {
            throw new TypeError("discoverResFileIndexes requires an appfileindex.");
        }

        const declarations = [];
        const names = new Set();

        for (const entry of appFileIndex.entries)
        {
            const match = entry.logicalPath.match(/^app:\/resfileindex(?:_([^/]+))?\.txt$/u);

            if (!match) continue;

            const name = match[1] ?? "main";

            if (!/^[a-z0-9][a-z0-9._-]*$/u.test(name) || names.has(name))
            {
                throw new Error(`Invalid or duplicate resfileindex declaration: ${name}`);
            }

            names.add(name);
            declarations.push(Object.freeze({ name, entry }));
        }

        return Object.freeze(declarations);
    }

    /**
     * Loads every resfileindex an appfileindex declares, in parallel, and returns
     * frozen { name, declaration, index } records. It never guesses where the
     * declared files are hosted, so one of baseURL or resolveURL is required.
     * @param {object} options baseURL or resolveURL(entry, name), plus the fetch
     * and requestInit forwarded to each load.
     */
    static async loadDeclaredResFileIndexes(appFileIndex, options = {})
    {
        const declarations = CjsFileIndex.discoverResFileIndexes(appFileIndex);

        if (typeof options.resolveURL !== "function" && options.baseURL === undefined)
        {
            throw new TypeError("loadDeclaredResFileIndexes requires baseURL or resolveURL.");
        }

        const loaded = await Promise.all(declarations.map(async declaration =>
        {
            const sourceURL = typeof options.resolveURL === "function"
                ? options.resolveURL(declaration.entry, declaration.name)
                : CjsFileIndex.resolveLocationURL(options.baseURL, declaration.entry.location);
            const index = await CjsFileIndex.loadResFileIndex(sourceURL, {
                name: declaration.name,
                fetch: options.fetch,
                requestInit: options.requestInit
            });

            return Object.freeze({ name: declaration.name, declaration: declaration.entry, index });
        }));

        return Object.freeze(loaded);
    }

    /**
     * Joins one entry storage location onto a base URL through a throwaway
     * source, so the containment check that stops a location escaping its base
     * still applies.
     */
    static resolveLocationURL(baseURL, location)
    {
        return new CjsFileIndexSource({
            id: "default",
            baseURL
        }).Resolve(location);
    }

}

function normalizeName(value)
{
    if (typeof value !== "string" || value.trim() === "")
    {
        throw new TypeError("file-index name must be a non-empty string.");
    }

    return value.trim();
}

function normalizeSourceURL(value)
{
    if (value === undefined || value === null) return null;

    if (typeof value !== "string" || value.trim() === "")
    {
        throw new TypeError("file-index sourceURL must be a non-empty string or null.");
    }

    return value.trim();
}
