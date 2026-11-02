import { normalizeResourcePath } from "#utils/path";
import { CjsCharacterLibraryConfiguration } from "./CjsCharacterLibraryConfiguration.js";
import { CjsCharacterObjectBuilder } from "../formats/CjsCharacterObjectBuilder.js";
import { CjsSchema } from "#schema";

import * as CcpLog from "../../global/logging/ccpLog.js";
import { CjsCharacterLibrary } from "./CjsCharacterLibrary.js";
import { CjsCharacterLibraryDocuments } from "./CjsCharacterLibraryDocuments.js";
import { createCharacterResourceReader } from "./resourceSource.js";

const DOCUMENT_NAMES = CjsCharacterLibraryDocuments.listDocumentNames();

const METADATA_FIELDS = [
    "sourceTarget",
    "sourceGame",
    "sourceProvider",
    "sourceBuild",
    "generatedAt"
];

/** Builds versioned model-shaped JSON from source documents and lossless definition catalogs. */
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
     * Creates the optional Blue-only source loader beside the legacy static APIs.
     * @param {object} options Blue paths/resMan and optional configuration.
     */
    constructor(options = {})
    {
        this._paths = options.paths ?? null;
        this._resMan = options.resMan ?? null;
        this._configuration = options.configuration ?? CjsCharacterLibraryConfiguration;
        this._flatLibrary = new CjsCharacterLibrary();
        this._flatLibrary.schemaVersion = 13;
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
     * palette read does not read every palette (operator ruling, 2026-11-01).
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
            CjsSchema.setValues(record, value, { initialize: false });
        }
        else
        {
            record = await this._resMan.LoadObject(path, CjsCharacterObjectBuilder.getLoadOptions(path));
            if (!record) throw new Error(`Character source did not load: ${path}`);
            const source = CjsCharacterObjectBuilder.getSource(record);
            if (!source) throw new TypeError(`Character source bypassed its configured object builder: ${path}`);
            actual = source.kind;
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

    static schema = "carbonenginejs.characterLibrary";

    static schemaVersion = 11;

    /**
     * Projects qualified schema-12 joins from exact indexed acquisition evidence.
     * Replacement: Blue-only source loading plus the later factory/tools preparation owner;
     * lifecycle: ../toDeprecate/CjsCharacterLibraryBuilder.json (prepareCatalog removal gates).
     * Rebuilds only producer-owned fields; supplied material profiles remain intact.
     * Without evidence this is a structural library, not a prepared character.
     * `fullCanvasDdsPaths` opts exact, externally qualified PNG/DDS siblings into
     * compressed selection. It preserves both original candidates and the PNG
     * metadata keyed by their extension-neutral path. The selected binding's
     * origin records qualification evidence, not a rendering override. Consumers
     * load the exact selected file through normal texture resources and use its
     * decoded cutout, so a full-canvas DDS cannot inherit a sibling PNG crop.
     * This producer policy is ours, not a Carbon image decoder.
     */
    static prepareCatalog(documents, evidence)
    {
        if (evidence === null) return;
        RequirePlainObject(evidence, "Character preparation evidence");
        if (!Array.isArray(evidence.indexedPaths)) throw new TypeError("Preparation requires exact indexedPaths");
        const indexed = new Set(evidence.indexedPaths);
        const definitions = new Map(documents.characterDefinitions.map(value => [ value.sourcePath, value ]));
        const profiles = documents.characterMaterialProfiles;
        const origin = (resourcePath, rule) => ({ kind: "derived", resourcePath, rule });
        const requirePath = path =>
        {
            if (!indexed.has(path)) throw new Error(`Character preparation path is not indexed: ${path}`);
            return path;
        };
        if (evidence.fullCanvasDdsPaths !== undefined && !Array.isArray(evidence.fullCanvasDdsPaths))
            throw new TypeError("Preparation fullCanvasDdsPaths must be an array");
        const fullCanvasDds = new Set(evidence.fullCanvasDdsPaths ?? []);
        const originalPaths = new Set(documents.characterPartSources.flatMap(source =>
            source.versions.flatMap(version => version.textureCandidateInput?.paths ?? [])));
        for (const path of fullCanvasDds)
        {
            requirePath(path);
            const identity = path.replace(/\.dds$/u, "");
            const pngPath = `${identity}.png`;
            const metadata = documents.characterTextureMetadata.find(value => value.recordID === identity);
            if (identity === path || !originalPaths.has(path) || !originalPaths.has(pngPath)
                || !indexed.has(pngPath) || !metadata || metadata.sourcePath !== pngPath)
                throw new Error(`Qualified DDS requires original siblings and retained PNG metadata: ${path}`);
        }

        const profileFor = path =>
        {
            requirePath(path);
            const definition = definitions.get(path);
            if (!definition || definition.extension !== ".color") throw new Error(`Missing retained color definition: ${path}`);
            const matches = profiles.filter(value => value.sourcePath === path);
            if (matches.length > 1) throw new Error(`Ambiguous material profile: ${path}`);
            const values = definition.values;
            RequirePlainObject(values, `Color definition ${path}`);
            const projected = { sourcePath: path };
            for (const field of [ "colors", "patternColors", "specularColors" ])
            {
                if (Object.hasOwn(values, field)) projected[field] = values[field].map(value => ({ value }));
            }
            for (const field of [ "pattern", "patternTransform", "patternRotation" ])
            {
                if (Object.hasOwn(values, field)) projected[field] = values[field];
            }
            let profile = matches[0];
            if (profile)
            {
                for (const [key, value] of Object.entries(projected))
                {
                    if (JSON.stringify(profile[key]) !== JSON.stringify(value))
                        throw new Error(`Conflicting supplied material profile: ${path}.${key}`);
                }
            }
            else
            {
                profile = { recordID: path, ...projected };
                profiles.push(profile);
            }
            profile.patternTexturePath = "";
            profile.patternOrigin = null;
            if (profile.pattern)
            {
                const paths = evidence.patternTextures?.[profile.pattern] ?? [];
                if (paths.length !== 1) throw new Error(`Pattern requires one qualified resource: ${profile.pattern}`);
                profile.patternTexturePath = requirePath(paths[0]);
                profile.patternOrigin = origin(path, "indexed-pattern-resource");
            }
            return profile.recordID;
        };

        for (const source of documents.characterPartSources)
        {
            const roots = [...new Set(source.sourcePaths?.length ? source.sourcePaths : [source.sourcePath])];
            const materialBindings = [];
            const bind = (kind, path, selectors = {}) => materialBindings.push({
                kind, partType: null, colorLocation: null, colorName: null,
                ...selectors, materialProfile: profileFor(path), origin: origin(path, "exact-source-color-definition")
            });
            for (const partType of documents.characterPartTypes)
            {
                if (partType.partSource !== source.recordID && !partType.partSources?.includes(source.recordID)) continue;
                if (!partType.colorVariant) continue;
                const paths = roots.map(root => `${root}/${partType.colorVariant}.color`).filter(path => definitions.has(path));
                if (paths.length !== 1) throw new Error(`Type color requires one exact source definition: ${partType.recordID}`);
                bind("type", paths[0], { partType: partType.recordID });
            }
            for (const entry of evidence.colorBindings ?? [])
            {
                if (entry.partSource !== source.recordID) continue;
                if (!roots.some(root => entry.path.startsWith(`${root}/`))) throw new Error("Color binding belongs to another source");
                bind("color", entry.path, { colorLocation: entry.colorLocation, colorName: entry.colorName });
            }
            const dependency = documents.characterPartMetadata.some(metadata =>
                metadata.dependencies?.some(value => value.partSource === source.recordID));
            const defaults = roots.map(root => `${root}/default.color`).filter(path => definitions.has(path));
            if (dependency && defaults.length)
            {
                if (defaults.length !== 1) throw new Error(`Ambiguous dependency default: ${source.recordID}`);
                bind("dependency-default", defaults[0]);
            }
            source.materialBindings = materialBindings;

            const baseline = source.versions.find(value => value.resourceVersion === null);
            const qualify = version =>
            {
                const input = version.textureCandidateInput;
                if (!input) throw new Error(`Original texture input unknown: ${source.recordID}`);
                const paths = new Set(input.paths);
                if (paths.size !== input.paths.length) throw new Error("Duplicate original texture candidate");
                return input.paths.filter(path => !path.endsWith(".png")
                    || !paths.has(path.slice(0, -4) + ".dds")
                    || !fullCanvasDds.has(path.slice(0, -4) + ".dds")).map(path => QualifyTexture(
                    requirePath(path), evidence.textureTargets?.[source.recordID], version.resourceVersion, origin
                )).map(binding =>
                {
                    if (fullCanvasDds.has(binding.path))
                        binding.origin = origin(binding.path, "qualified-dds-full-canvas");
                    return binding;
                });
            };
            const baseBindings = baseline ? qualify(baseline) : [];
            const channel = value => JSON.stringify([value.target,
                value.role.replace(/^(normal|specular|diffuse)-(?:source|overlay)$/u, "$1"), value.quality]);
            for (const version of source.versions)
            {
                const input = version.textureCandidateInput;
                if (!input) throw new Error(`Original texture input unknown: ${source.recordID}`);
                const own = qualify(version);
                let bindings = own;
                if (version !== baseline && (input.mode === "omitted" || input.mode === "channel-overrides" && own.length))
                {
                    const replaced = new Set(own.map(channel));
                    bindings = baseBindings.filter(value => !replaced.has(channel(value))).concat(own);
                }
                version.effectiveTextureBindings = bindings;
            }
        }
        profiles.sort((a, b) => CompareIdentities(a.recordID, b.recordID));
    }

    /** Hydrates the deterministic values produced by build(). */
    static buildLibrary(documents = {}, options = {})
    {
        return CjsCharacterLibrary.from(this.build(documents, options));
    }

    /**
     * Builds a hydrated library from cFSD documents read through blue.resMan
     * by default or one caller-supplied byte source, plus supplied documents.
     *
     * The runtime ships no FSD schemas. Each caller-supplied reader in
     * `readers` (for example a `CjsFsd64SchemaReader` subclass instance)
     * names one document through its schema's `name` and `path`; that
     * document is read from `resourcePaths[name]` or the schema path and
     * decoded through the FSD format. Without `readers` nothing is read and
     * the library is built from `documents` alone, so `build()` still
     * reports any required document neither source supplied. Passing
     * `resourcePaths` or `fsdOptions` without readers throws
     * `CJS_FSD_READER_REQUIRED`.
     *
     * @param {object} [options={}] Builder, resource and FSD options.
     * @param {Array<{Read: Function, ReadJSON: Function, constructor: {getFsdSchema: Function}}>} [options.readers] Caller-supplied character cFSD readers.
     * @param {Object<string, object>} [options.documents] Decoded documents keyed by name; decoded FSD documents replace same-named entries.
     * @param {Object<string, string>} [options.resourcePaths] Where each document's bytes are read from, by document name.
     * @param {object} [options.fsdOptions] Extra options for the FSD format read.
     * @returns {Promise<CjsCharacterLibrary>} The hydrated library.
     * @throws {TypeError} `CJS_FSD_READER_REQUIRED` when FSD options are given without readers.
     */
    static async buildFromResources(options = {})
    {
        RequirePlainObject(options, "Character resource builder options");

        const read = createCharacterResourceReader(options);
        const signal = options.signal ?? null;
        const resourcePaths = options.resourcePaths ?? {};
        const suppliedDocuments = options.documents ?? {};
        const readers = options.readers ?? [];

        RequirePlainObject(resourcePaths, "Character resource paths");
        RequirePlainObject(suppliedDocuments, "Character supplied documents");

        if (!Array.isArray(readers))
        {
            throw new TypeError("Character FSD readers must be an array");
        }

        if (readers.length === 0
            && (options.resourcePaths !== undefined || options.fsdOptions !== undefined))
        {
            const error = new TypeError(
                "Character FSD options require options.readers; the runtime ships no FSD schemas."
            );

            error.code = "CJS_FSD_READER_REQUIRED";
            throw error;
        }

        const fsdModule = readers.length === 0
            ? null
            : await import("#resource/formats/fsd");
        const registry = fsdModule === null
            ? null
            : new fsdModule.CjsFsd64Reader();

        for (const reader of readers)
        {
            registry.Register(reader.constructor.getFsdSchema().path, reader);
        }

        const decodedEntries = await Promise.all(
            readers.map(async reader =>
            {
                const schema = reader.constructor.getFsdSchema();
                const path = resourcePaths[schema.name] ?? schema.path;
                const bytes = await read(path, {
                    document: schema.name,
                    kind: "characterStaticData",
                    logicalPath: schema.path,
                    signal
                });

                return [
                    schema.name,
                    await fsdModule.CjsFsdFormat.readJSON(bytes, {
                        ...(options.fsdOptions ?? {}),
                        path: schema.path,
                        reader: registry
                    })
                ];
            })
        );
        const documents = {
            ...suppliedDocuments,
            ...Object.fromEntries(decodedEntries)
        };

        return this.buildLibrary(documents, OmitResourceOptions(options));
    }

    /**
     * Builds one deterministic library value from keyed or named JSON documents.
     *
     * Missing or unmodelled document families and blank record keys are
     * rejected, and the result must hydrate without losing a field.
     * `recordID` is reserved for the source-map key; existing `_id`s are
     * validated and reserved. The builder does no target discovery, cache
     * management, selected-asset loading, policy resolution or rendering.
     */
    static build(documents = {}, options = {})
    {
        RequirePlainObject(options, "Character library options");

        const result = {
            schema: this.schema,
            schemaVersion: options.schemaVersion ?? this.schemaVersion,
            documents: NormalizeDocuments(options.schemaVersion === 12 && !Array.isArray(documents)
                ? { ...Object.fromEntries(DOCUMENT_NAMES.map(name => [name, {}])), ...documents }
                : documents)
        };

        if (![ 11, 12 ].includes(result.schemaVersion)) throw new TypeError("Builder output must be schema 11 or 12");
        if (result.schemaVersion === 12)
        {
            result.rawDocuments = CloneJSON(documents, "Character raw documents", new WeakSet());
            this.prepareCatalog(result.documents, options.preparation ?? null);
        }
        result.unresolvedRelationships = ApplyRelationships(result.documents);
        if (result.schemaVersion === 12 && options.preparation && result.unresolvedRelationships.length)
            throw new Error("Character preparation has unresolved required relationships");
        ReportUnresolvedRelationships(result.unresolvedRelationships);

        for (const field of METADATA_FIELDS)
        {
            if (options[field] !== null && options[field] !== undefined)
            {
                result[field] = RequireNonEmptyString(
                    options[field],
                    `Character library ${field}`
                );
            }
        }

        return CjsCharacterLibrary.validateValues(result);
    }

    /** Builds from the single plain input object used by acquisition adapters. */
    static buildFromInputs(input = {})
    {
        RequirePlainObject(input, "Character library builder input");

        const { documents, ...options } = input;

        if (documents === undefined)
        {
            throw new TypeError("Character library builder input must define documents");
        }

        return this.build(documents, options);
    }

}

function OmitResourceOptions(options)
{
    const result = { ...options };

    for (const key of [
        "documents",
        "fsdOptions",
        "readers",
        "read",
        "resourcePaths",
        "signal",
        "source"
    ])
    {
        delete result[key];
    }

    return result;
}

export default CjsCharacterLibraryBuilder;

// The recovered character texture naming policy is applied at preparation,
// never by the renderer. A shorthand channel needs an explicitly qualified
// target. Duplicate formats/roles are rejected by library validation.
function QualifyTexture(path, targetHint, sourceVersion, origin)
{
    const name = path.split("/").at(-1).toLowerCase().replace(/\.(png|dds|tga|jpe?g)$/u, "");
    const quality = name.match(/_(4k|512|256)(?:_hi)?$/u)?.[1] ?? "standard";
    const family = name.replace(/_(4k|512|256)(?:_hi)?$/u, "").replace(/_hi$/u, "");
    const explicit = family.match(/^(colorize|comp)_(body|head|hair|acc)_(tn|mn|[dnslzm])$/u);
    const short = family.match(/_(tn|[dnslz])$/u);
    const target = explicit?.[2] ?? targetHint;
    const map = explicit?.[3] ?? short?.[1];
    if (!target || !map || !["body", "head", "hair", "acc"].includes(target))
        throw new Error(`Texture role/target is unqualified: ${path}`);
    const suffix = explicit?.[1] === "comp" ? "overlay" : "source";
    const roles = { l: "colorize-layer", z: "colorize-zones", m: "cut-mask", tn: "twist-normal", mn: "normal-overlay",
        d: `diffuse-${suffix}`, n: `normal-${suffix}`, s: `specular-${suffix}` };
    return { path, role: roles[map], target, quality, sourceVersion, origin: origin(path, "character-texture-role-v1") };
}

function NormalizeDocuments(input)
{
    const source = new Map();

    if (Array.isArray(input))
    {
        for (let index = 0; index < input.length; index++)
        {
            const descriptor = input[index];
            RequirePlainObject(descriptor, `Character document descriptor ${index}`);
            AddDocument(source, descriptor.name, descriptor.data);
        }
    }
    else
    {
        RequirePlainObject(input, "Character library document input");

        for (const [ name, data ] of Object.entries(input))
        {
            AddDocument(source, name, data);
        }
    }

    const missing = DOCUMENT_NAMES.filter(name =>
        CjsCharacterLibraryDocuments.isRequiredDocument(name) && !source.has(name)
    );
    const extra = [ ...source.keys() ].filter(name => !DOCUMENT_NAMES.includes(name));

    if (missing.length)
    {
        throw new Error(`Character library is missing documents: ${missing.join(", ")}`);
    }

    if (extra.length)
    {
        throw new Error(`Character library has unsupported documents: ${extra.sort(CompareText).join(", ")}`);
    }

    return Object.fromEntries(DOCUMENT_NAMES.map(name => [ name, source.get(name) ?? [] ]));
}

function AddDocument(documents, value, data)
{
    const name = String(value ?? "").trim();

    if (!/^[A-Za-z][A-Za-z0-9]*$/u.test(name))
    {
        throw new TypeError(`Invalid character document name ${JSON.stringify(value)}`);
    }

    if (documents.has(name))
    {
        throw new Error(`Duplicate character document ${JSON.stringify(name)}`);
    }

    RequirePlainObject(data, `Character document ${name}`);
    const records = [];

    for (const recordID of Object.keys(data).sort(CompareIdentities))
    {
        if (!recordID.trim())
        {
            throw new TypeError(`Character document ${name} recordID must be a non-empty string`);
        }

        const record = data[recordID];
        RequirePlainObject(record, `Character document ${name} record ${recordID}`);

        if (Object.hasOwn(record, "recordID"))
        {
            throw new TypeError(
                `Character document ${name} record ${recordID} already defines reserved recordID`
            );
        }

        const copied = CloneJSON(
            record,
            `Character document ${name} record ${recordID}`,
            new WeakSet()
        );
        const identified = {};

        DefineValue(identified, "recordID", String(recordID));

        for (const [ key, child ] of Object.entries(copied))
        {
            DefineValue(identified, key, child);
        }

        records.push(identified);
    }

    documents.set(name, records);
}

/**
 * Replaces proven relationship fields with graph-local `{ _ref }` tokens.
 * A zero source identity becomes `null`, and so does a positive identity
 * whose target is missing: the member is typed as the target's class and
 * holds only that or null. The dangling identity is a data fault: returned
 * for the library's `unresolvedRelationships` and reported by the build.
 * Existing
 * `_id`s are reserved and only referenced targets receive a new one. A character resource's `resPath`
 * links to `partType` only when an exact part-type record exists; `resPath`
 * itself is unchanged.
 */
function ApplyRelationships(documents)
{
    const recordsByDocument = new Map(DOCUMENT_NAMES.map(name => [
        name,
        new Map(documents[name].map(record => [ record.recordID, record ]))
    ]));
    const reservedGraphIDs = CollectGraphIDs(documents);
    const unresolved = [];
    const relationshipGraphIDs = new Map();
    let nextGraphID = 1;

    const AllocateGraphID = () =>
    {
        while (reservedGraphIDs.has(nextGraphID)) nextGraphID++;
        const graphID = nextGraphID++;
        reservedGraphIDs.add(graphID);
        return graphID;
    };

    const CreateReference = (targetName, targetID, target) =>
    {
        const graphKey = `${targetName}:${targetID}`;
        let graphID = relationshipGraphIDs.get(graphKey);

        if (graphID === undefined)
        {
            graphID = target._id ?? AllocateGraphID();
            relationshipGraphIDs.set(graphKey, graphID);
            if (target._id === undefined || target._id === null) target._id = graphID;
        }

        return { _ref: graphID };
    };

    for (const [ sourceName, path, targetName ] of CjsCharacterLibrary.relationships)
    {
        for (const source of documents[sourceName])
        {
            CjsCharacterLibrary.visitRelationshipField(
                source,
                path,
                0,
                `${sourceName}.${source.recordID}`,
                (owner, field, label) =>
                {
                    if (owner[field] === null || owner[field] === undefined)
                    {
                        return;
                    }

                    const targetID = NormalizeIdentity(owner[field], label);

                    if (targetID === "0")
                    {
                        owner[field] = null;
                        return;
                    }

                    const target = recordsByDocument.get(targetName).get(targetID);

                    if (!target)
                    {
                        unresolved.push({
                            document: sourceName,
                            recordID: source.recordID,
                            field: label.slice(`${sourceName}.${source.recordID}.`.length),
                            targetDocument: targetName,
                            targetID
                        });
                        owner[field] = null;
                        return;
                    }

                    owner[field] = CreateReference(targetName, targetID, target);
                }
            );
        }
    }

    const partTypes = recordsByDocument.get("characterPartTypes");

    for (const resource of documents.characterResources)
    {
        if (Object.hasOwn(resource, "partType"))
        {
            throw new TypeError(
                `Character document characterResources record ${resource.recordID} contains reserved derived relationship partType`
            );
        }

        const sourcePath = resource.resPath;

        if (sourcePath === null || sourcePath === undefined)
        {
            continue;
        }

        const targetID = NormalizeIdentity(
            sourcePath,
            `characterResources.${resource.recordID}.resPath`
        );
        const target = partTypes.get(targetID);

        if (target)
        {
            resource.partType = CreateReference("characterPartTypes", targetID, target);
        }
    }

    return unresolved;
}

/**
 * Reports each relationship whose target record is missing, as a warning on
 * the character channel, then the count. The source data is at fault; the
 * library holds `null` in each member.
 */
function ReportUnresolvedRelationships(unresolved)
{
    if (!unresolved.length) return;
    const channel = CcpLog.GetModuleChannel("character");
    for (const entry of unresolved)
    {
        CcpLog.CCP_LOGWARN_CH(
            channel,
            "Character library %s %s field %s names %s %s, which does not exist",
            entry.document,
            entry.recordID,
            entry.field,
            entry.targetDocument,
            entry.targetID
        );
    }
    CcpLog.CCP_LOGWARN_CH(channel, "Character library: %d unresolved relationship(s)", unresolved.length);
}

function NormalizeIdentity(value, label)
{
    if (typeof value === "string" && value.trim())
    {
        return value;
    }

    if (Number.isSafeInteger(value))
    {
        return String(value);
    }

    throw new TypeError(`${label} identity must be a non-empty string or safe integer`);
}

function CloneJSON(value, label, active)
{
    if (value === null || typeof value === "string" || typeof value === "boolean")
    {
        return value;
    }

    if (typeof value === "number")
    {
        if (!Number.isFinite(value))
        {
            throw new TypeError(`${label} contains a non-finite number`);
        }

        return value;
    }

    if (typeof value !== "object")
    {
        throw new TypeError(`${label} contains a non-JSON value`);
    }

    if (active.has(value))
    {
        throw new TypeError(`${label} contains a cycle`);
    }

    active.add(value);
    let result;

    if (Array.isArray(value))
    {
        result = value.map((child, index) => CloneJSON(child, `${label}[${index}]`, active));
    }
    else
    {
        RequirePlainObject(value, label);
        const record = {};

        for (const [ key, child ] of Object.entries(value))
        {
            DefineValue(record, key, CloneJSON(child, `${label}.${key}`, active));
        }
        result = record;
    }

    active.delete(value);
    return result;
}

function CollectGraphIDs(documents)
{
    const reservedGraphIDs = new Set();
    const definedGraphIDs = new Set();
    const referencedGraphIDs = new Set();

    for (const [ documentName, records ] of Object.entries(documents))
    {
        for (let index = 0; index < records.length; index++)
        {
            VisitGraphMetadata(
                records[index],
                `${documentName}[${index}]`,
                reservedGraphIDs,
                definedGraphIDs,
                referencedGraphIDs
            );
        }
    }

    const unresolved = [ ...referencedGraphIDs ].filter(value => !definedGraphIDs.has(value));

    if (unresolved.length)
    {
        throw new TypeError(
            `Unresolved character graph _ref ids: ${unresolved.map(JSON.stringify).join(", ")}`
        );
    }

    return reservedGraphIDs;
}

function VisitGraphMetadata(
    value,
    label,
    reservedGraphIDs,
    definedGraphIDs,
    referencedGraphIDs
)
{
    if (Array.isArray(value))
    {
        for (let index = 0; index < value.length; index++)
        {
            VisitGraphMetadata(
                value[index],
                `${label}[${index}]`,
                reservedGraphIDs,
                definedGraphIDs,
                referencedGraphIDs
            );
        }
        return;
    }

    if (!IsPlainObject(value)) return;

    if (value._id !== undefined && value._id !== null)
    {
        const graphID = RequireGraphID(value._id, `${label}._id`);

        if (definedGraphIDs.has(graphID))
        {
            throw new TypeError(`Duplicate character graph _id ${JSON.stringify(graphID)}`);
        }
        definedGraphIDs.add(graphID);
        reservedGraphIDs.add(graphID);
    }

    if (value._ref !== undefined && value._ref !== null)
    {
        const graphID = RequireGraphID(value._ref, `${label}._ref`);
        referencedGraphIDs.add(graphID);
        reservedGraphIDs.add(graphID);
    }

    for (const [ key, child ] of Object.entries(value))
    {
        if (key === "_id" || key === "_ref") continue;
        VisitGraphMetadata(
            child,
            `${label}.${key}`,
            reservedGraphIDs,
            definedGraphIDs,
            referencedGraphIDs
        );
    }
}

function RequireGraphID(value, label)
{
    if ((typeof value === "string" && value.length)
        || (typeof value === "number" && Number.isSafeInteger(value)))
    {
        return value;
    }

    throw new TypeError(`${label} must be a non-empty string or safe integer graph identity`);
}

function RequirePlainObject(value, label)
{
    if (!IsPlainObject(value))
    {
        throw new TypeError(`${label} must be a plain object`);
    }
}

function IsPlainObject(value)
{
    if (value === null || typeof value !== "object" || Array.isArray(value))
    {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function RequireNonEmptyString(value, label)
{
    const result = String(value).trim();

    if (!result)
    {
        throw new TypeError(`${label} must be a non-empty string`);
    }

    return result;
}

function CompareText(left, right)
{
    return String(left).localeCompare(String(right), "en");
}

function CompareIdentities(left, right)
{
    const a = String(left);
    const b = String(right);

    if (/^-?\d+$/u.test(a) && /^-?\d+$/u.test(b))
    {
        const aa = BigInt(a);
        const bb = BigInt(b);
        return aa < bb ? -1 : aa > bb ? 1 : 0;
    }

    return CompareText(a, b);
}

/**
 * Writes one data key into a plain JSON output record as an ordinary own data
 * property, so a key such as `__proto__` stays data instead of replacing the
 * record's prototype. The records stay ordinary objects for their consumers.
 *
 * @param {object} target A fresh plain JSON output record.
 * @param {string} key The data key.
 * @param {*} value The JSON value.
 */
function DefineValue(target, key, value)
{
    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        value,
        writable: true
    });
}

CjsSchema.meta.define("CjsCharacterLibraryBuilder")(CjsCharacterLibraryBuilder);
