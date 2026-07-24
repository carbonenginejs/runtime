import { decodeUtf8 } from "@carbonenginejs/runtime-utils/text";
import { CjsFileIndexSource } from "./CjsFileIndexSource.js";
import { CjsFileIndexEntry } from "./CjsFileIndexEntry.js";

/** An immutable file index with deterministic declaration-order lookup. */
export class CjsFileIndex
{

    #entriesByPath;

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

    Find(logicalPath)
    {
        return this.#entriesByPath.get(
            CjsFileIndexEntry.normalizeLogicalPath(logicalPath, this.root)
        ) ?? null;
    }

    Has(logicalPath)
    {
        return this.Find(logicalPath) !== null;
    }

    [Symbol.iterator]()
    {
        return this.entries[Symbol.iterator]();
    }

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

    static parseAppFileIndex(text, options = {})
    {
        return CjsFileIndex.parse(text, {
            ...options,
            root: "app",
            kind: "appfileindex",
            name: options.name ?? "app"
        });
    }

    static parseResFileIndex(text, options = {})
    {
        return CjsFileIndex.parse(text, { ...options, root: "res", kind: "resfileindex" });
    }

    static decode(bytes, options = {})
    {
        return CjsFileIndex.parse(decodeUtf8(bytes, { fatal: true }), options);
    }

    static decodeAppFileIndex(bytes, options = {})
    {
        return CjsFileIndex.decode(bytes, {
            ...options,
            root: "app",
            kind: "appfileindex",
            name: options.name ?? "app"
        });
    }

    static decodeResFileIndex(bytes, options = {})
    {
        return CjsFileIndex.decode(bytes, { ...options, root: "res", kind: "resfileindex" });
    }

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

    static loadAppFileIndex(source, options = {})
    {
        return CjsFileIndex.load(source, {
            ...options,
            root: "app",
            kind: "appfileindex",
            name: options.name ?? "app"
        });
    }

    static loadResFileIndex(source, options = {})
    {
        return CjsFileIndex.load(source, { ...options, root: "res", kind: "resfileindex" });
    }

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
