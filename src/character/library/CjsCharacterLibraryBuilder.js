import { normalizeResourcePath } from "#utils/path";
import { CjsCharacterLibraryConfiguration } from "./CjsCharacterLibraryConfiguration.js";
import { CjsCharacterObjectBuilder } from "../formats/CjsCharacterObjectBuilder.js";
import { CjsSchema } from "#schema";
import { DictReader } from "../../blue/formats/graph/DictReader.js";
import { CjsCharacterLibrary } from "./CjsCharacterLibrary.js";

/**
 * Builds the character library from its files: indexes the configured sources through Blue's paths, and reads each record
 * through Blue's resMan when it is first needed (`LoadRecord`), or every one (`Build({ lazy: false })`). A host injects
 * both: Blue's own in a browser, an exact build's file access in tools-core.
 */
export class CjsCharacterLibraryBuilder
{

    _paths = null;

    _resMan = null;

    _configuration = CjsCharacterLibraryConfiguration;

    _flatLibrary = null;

    _sourceKinds = new Map();

    _kindPaths = new Map();

    _kindLoads = new Map();

    /**
     * In-flight LoadRecord reads by path, so concurrent requests share one load; a settled read is removed.
     * @type {Map<string, Promise<object>>}
     */
    _recordLoads = new Map();

    /**
     * Whether Index has listed the source paths.
     * @type {boolean}
     */
    _indexed = false;

    /**
     * Creates a source loader over Blue's paths and resMan.
     * @param {object} options Blue paths/resMan and optional configuration.
     */
    constructor(options = {})
    {
        this._paths = options.paths ?? null;
        this._resMan = options.resMan ?? null;
        this._configuration = options.configuration ?? CjsCharacterLibraryConfiguration;
        this._flatLibrary = new CjsCharacterLibrary();
    }

    /**
     * Indexes configured Blue paths. The object builders are registered once, by the manager's
     * `Initialize` (`CjsCharacterObjectBuilder.registerObjectBuilders`).
     * @returns {CjsCharacterLibraryBuilder} This loader.
     */
    Index()
    {
        if (this._indexed) return this;
        if (!this._paths || !this._resMan) throw new TypeError("Character source loading requires Blue paths and resMan.");
        const excluded = new Set();
        for (const root of this._configuration.roots)
        {
            for (const pattern of this._configuration.excludes)
            {
                for (const path of this._paths.Filter(root, pattern)) excluded.add(path);
            }
        }
        for (const kind of Object.keys(this._configuration.kinds)) this._kindPaths.set(kind, new Set());
        for (const row of this._configuration.getRows())
        {
            if (!this._kindPaths.has(row.kind)) throw new TypeError(`Unknown configured character kind ${row.kind}`);
            for (const path of this._paths.Filter(row.match))
            {
                if (excluded.has(path)) continue;
                const previous = this._sourceKinds.get(path);
                if (previous && previous !== row.kind) throw new TypeError(`Character source matches both ${previous} and ${row.kind}: ${path}`);
                this._sourceKinds.set(path, row.kind);
                this._kindPaths.get(row.kind).add(path);
            }
        }
        this._indexed = true;
        return this;
    }

    /**
     * The configured kind of an indexed text source, for the registered object builder.
     * @param {string} path A canonical source path.
     * @returns {string|null} Its kind; null for an unindexed or path-only source.
     */
    GetSourceKind(path)
    {
        this.Index();
        const kind = this._sourceKinds.get(path) ?? null;
        return kind && !this._configuration.kinds[kind].pathOnly ? kind : null;
    }

    /**
     * Returns the flat holdings, optionally loading every configured source kind.
     * @param {object} [options={}] Set lazy to true to defer reads until LoadKind/Get.
     * @returns {Promise<CjsCharacterLibrary>} Flat library; opaque resources stay paths.
     */
    async Build(options = {})
    {
        this.Index();
        if (!options.lazy)
        {
            for (const kind of this._kindPaths.keys()) await this.LoadKind(kind);
        }
        return this._flatLibrary;
    }

    /** Returns the flat holdings associated with this builder. */
    GetLibrary()
    {
        return this._flatLibrary;
    }

    /**
     * Lists indexed source candidates without fetching bytes or inventing basenames.
     * @param {string} kind Configured family; content variants share their source family.
     * @returns {Array<string>} Sorted canonical source paths.
     */
    ListSourceNames(kind)
    {
        this.Index();
        const family = kind === "cameraSequences" ? "cameras" : kind === "scalarPosts" ? "posts" : kind;
        if (!this._kindPaths.has(family)) throw new TypeError(`Unknown character kind ${kind}`);
        return [...this._kindPaths.get(family)].sort();
    }

    /**
     * Loads a source family once, identifying shared camera/post variants as it reads.
     * Failed batches may be retried without duplicating already stored records.
     * @param {string} kind Configured kind.
     * @returns {Promise<Array<object>>} Loaded records of the requested shape.
     */
    async LoadKind(kind)
    {
        this.Index();
        const family = kind === "cameraSequences" ? "cameras" : kind === "scalarPosts" ? "posts" : kind;
        if (!this._kindPaths.has(family)) throw new TypeError(`Unknown character kind ${kind}`);
        if (!this._kindLoads.has(family))
        {
            const operation = this.LoadSourceFamily(family);
            this._kindLoads.set(family, operation);
            operation.catch(() => { if (this._kindLoads.get(family) === operation) this._kindLoads.delete(family); });
        }
        await this._kindLoads.get(family);
        return this._flatLibrary.GetKind(kind);
    }

    /**
     * Acquires one family in bounded groups through the existing Blue object route.
     * @param {string} kind Configured source family.
     * @returns {Promise<void>} Completion of the family read.
     */
    async LoadSourceFamily(kind)
    {
        const names = [...this._kindPaths.get(kind)].sort();
        for (let start = 0; start < names.length; start += 8)
        {
            const results = await Promise.allSettled(names.slice(start, start + 8).map(path => this.LoadRecord(kind, path)));
            const failure = results.find(result => result.status === "rejected");
            if (failure) throw failure.reason;
        }
    }

    /**
     * Loads one indexed source record on its first need, through the existing Blue object route,
     * and stores it in the flat library. Concurrent requests for one path share one load; a failed
     * load is forgotten, so a later request retries it.
     *
     * Ours, as the whole builder is (non-carbon-extensions.md § *The shared character library*): the
     * library loads each record when a reader first needs it, rather than its whole family, so one
     * palette read does not read every palette.
     *
     * @param {string} kind Configured source family.
     * @param {string} path Canonical indexed source path.
     * @returns {Promise<object>} The stored record, of the family or its identified variant.
     */
    async LoadRecord(kind, path)
    {
        const variant = kind === "cameras" ? "cameraSequences" : kind === "posts" ? "scalarPosts" : null;
        const stored = this._flatLibrary.GetKindRecord(kind, path) ?? (variant ? this._flatLibrary.GetKindRecord(variant, path) : null);
        if (stored) return stored;
        if (!this._recordLoads.has(path))
        {
            const operation = this._LoadRecord(kind, path);
            this._recordLoads.set(path, operation);
            const clear = () => { if (this._recordLoads.get(path) === operation) this._recordLoads.delete(path); };
            operation.then(clear, clear);
        }
        return this._recordLoads.get(path);
    }

    /**
     * Resolves only an exact indexed reference; no fallback or path guessing occurs.
     * @param {string} path Canonical res path.
     * @returns {Promise<object>} Loaded record or opaque resource path record.
     */
    async Resolve(path)
    {
        this.Index();
        const key = normalizeResourcePath(path);
        const kind = this._sourceKinds.get(key);
        if (!kind) throw new Error(`Unresolved character reference: ${path}`);
        await this.LoadRecord(kind, key);
        const variant = kind === "cameras" ? "cameraSequences" : kind === "posts" ? "scalarPosts" : null;
        return this._flatLibrary.GetKindRecord(kind, key)
            ?? (variant ? this._flatLibrary.GetKindRecord(variant, key) : null);
    }

    /**
     * LoadRecord's read: a path-only kind becomes its path record; a text kind loads through resMan
     * LoadObject and its configured object builder, which identifies the record's actual kind.
     * @param {string} kind Configured source family.
     * @param {string} path Canonical indexed source path.
     * @returns {Promise<object>} The stored record.
     */
    async _LoadRecord(kind, path)
    {
        const declaration = this._configuration.kinds[kind];
        if (!await this._paths.FileExists(path)) throw new Error(`Missing indexed character source: ${path}`);
        let record, actual = kind;
        if (declaration.pathOnly)
        {
            const Constructor = CjsSchema.getConstructor(declaration.className);
            record = new Constructor();
            const value = declaration.className === "CjsCharacterNamedValue" ? { name: path, value: path } : { name: path, resFilePath: path };
            value._pdpType = declaration.pdpType;
            new DictReader({ liveLists: true }).ReadInto(record, value, null);
        }
        else
        {
            record = await this._resMan.LoadObject(path, CjsCharacterObjectBuilder.getLoadOptions(path));
            if (!record) throw new Error(`Character source did not load: ${path}`);
            // The reader names the file shape it read (a shared family's file is either of two).
            actual = CjsCharacterLibraryConfiguration.kindOf(record._pdpType);
        }
        this._flatLibrary.AddKind(actual, path, record);
        return record;
    }

    /**
     * Whether a kind belongs to a family whose files hold either of two record kinds (cameras or
     * cameraSequences, posts or scalarPosts), so a file's kind is known only once it is read.
     * @param {string} kind Configured kind.
     * @returns {boolean} True for the four shared-family kinds.
     */
    static isSharedFamily(kind)
    {
        return kind === "cameras" || kind === "cameraSequences" || kind === "posts" || kind === "scalarPosts";
    }

}
