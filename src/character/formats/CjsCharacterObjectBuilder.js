import { CjsSchema } from "../../blue/schema/CjsSchema.js";
import { DictReader } from "../../blue/formats/graph/DictReader.js";
import { getResourceExtension, normalizeResourcePath } from "#utils/path";
import { CjsLoadingObject } from "../../blue/resman/CjsLoadingObject.js";
import { CjsCharacterYamlFormat } from "../../resource/formats/character/CjsCharacterYamlFormat.js";
import { CjsYamlReader } from "../../resource/formats/yaml/core/CjsYamlReader.js";
import { createCharacterYamlTagHandlers, normalizeCharacterYamlValues } from "./yaml.js";

/**
 * Caches one character YAML parse and creates fresh typed records per LoadObject. The file is read through the
 * character format (`CjsCharacterYamlFormat`) as plain values: tuples as arrays, ints as numbers.
 * Identification is separate from construction, as in the static format route.
 * It does not build characters or acquire any referenced resource. It holds no table of its own: its caller hands it
 * the configuration that declares the files it reads, `{ kinds, sourceLists }` (the parts library's
 * `CjsCharacterLibraryConfiguration`; the character factory's `CjsCharacterFactory.recipeConfiguration`).
 */
export class CjsCharacterObjectBuilder
{
    _reader = null;

    /** The character format this source is read through; it decodes the strings the file writes values into. */
    _format = null;

    _kind = "";

    _path = "";

    /** The caller's configuration: its kinds and their list forms. @type {{ kinds: Object<string, object>, sourceLists: Object<string, Object<string, (string|string[]|object)>> }} */
    _configuration = null;

    /**
     * Parses one already acquired source with its configured family.
     * @param {string|ArrayBuffer|ArrayBufferView} bytes Original YAML input.
     * @param {string} kind Configured source family.
     * @param {string} path Original logical source path.
     * @param {{ kinds: Object<string, object>, sourceLists: Object<string, Object<string, (string|string[]|object)>> }} configuration
     *   The kinds the caller reads (`className`, `envelope`, `items`: the class of an envelope list's mapping
     *   entries; `slots`, `leading`, `list`: the fields an envelope list splits into, `ReadEnvelope`) and their list forms
     *   (`normalizeCharacterYamlValues`).
     * @param {object} [options={}] YAML reader options, including an alias bound.
     */
    constructor(bytes, kind, path, configuration, options = {})
    {
        this._kind = kind;
        this._path = path;
        this._configuration = configuration;
        const format = new CjsCharacterYamlFormat({
            ...options,
            preservePythonTags: false,
            intAsBigInt: false,
            sourceName: path,
            tagPolicy: "handle",
            tagHandlers: createCharacterYamlTagHandlers(configuration.sourceLists),
            maxAliasCount: options.maxAliasCount ?? 100000,
            // Two published sculpting-limit files repeat keys. Keep the full AST;
            // the existing YAML conversion uses the last value when explicitly allowed.
            uniqueKeys: options.uniqueKeys ?? kind !== "sculptingLimits"
        });
        this._format = format;
        this._reader = new CjsYamlReader(bytes, format.GetConfiguration());
        this._reader.AssertSyntax();
        this._reader.AssertAliasLimit();
    }

    /**
     * Creates a detached object through the existing values transport.
     * @param {number} [objectMarker=0] IBlueObjectBuilder root marker; only zero applies.
     * @returns {object} The configured source class, with authored references intact.
     */
    CreateObject(objectMarker = 0)
    {
        if (objectMarker !== 0) throw new RangeError("Character text has only its root object marker.");
        let raw = this._format.DecodeValues(this._reader.ReadRaw());
        const { sourceLists } = this._configuration;
        const identified = CjsCharacterObjectBuilder.inspect(raw, this._kind, this._configuration.kinds);
        const Constructor = CjsSchema.getConstructor(identified.className);
        if (!Constructor) throw new TypeError(`Character kind ${identified.kind} requires registered ${identified.className}.`);
        if (identified.kind === "lights") raw = ReadLightRig(raw, this._path, sourceLists);
        if (identified.kind === "scalarPosts") raw = ReadScalarPost(raw, this._path);
        if (identified.kind === "cameraSequences") raw = ReadPositionalCamera(raw, this._path);
        if (identified.items)
        {
            // An envelope list whose mappings are records of its declared class (a recipe's modifiers); its other
            // entries (a recipe's leading sex) stay as written.
            const Item = CjsSchema.getConstructor(identified.items);
            if (!Item) throw new TypeError(`Character kind ${identified.kind} requires registered ${identified.items}.`);
            raw = raw.map(entry =>
            {
                if (entry === null || typeof entry !== "object" || Array.isArray(entry)) return entry;
                const item = new Item();
                new DictReader({ liveLists: true }).ReadInto(item, normalizeCharacterYamlValues(Item, entry, sourceLists), null);
                return item;
            });
        }
        const existing = CjsSchema.cast(raw, Constructor);
        const object = existing || new Constructor();
        if (!existing)
        {
            const values = identified.envelope ? ReadEnvelope(raw, this._path, identified) : raw;
            CjsSchema.assertValues(values, identified.className);
            new DictReader({ liveLists: true }).ReadInto(object, normalizeCharacterYamlValues(Constructor, values, sourceLists), null);
        }
        // The file shape it was read from travels with the record (CjsCharacterRecord._pdpType).
        if (identified.pdpType) object._pdpType = identified.pdpType;
        return object;
    }

    /**
     * Returns the cached source document for the inverse format mapping.
     * @returns {import("yaml").Document} Parsed source; callers must clone before editing.
     */
    GetSourceDocument()
    {
        return this._reader.document;
    }

    /** Returns the logical source identity without normalizing authored field values. */
    GetPath()
    {
        return this._path;
    }

    /**
     * The `ex` the character `.yaml` kinds load under: a character `.yaml` routes as `.yaml` + `character`,
     * so plain `.yaml` stays the generic reader's.
     *
     * Ours (non-carbon-extensions.md § *The shared character library*; Ruru, 2026-11-01): Carbon's `ex` is a
     * resource factory suffix; the character `.yaml` files have no extension of their own to register.
     */
    static ex = "character";

    /**
     * The extensions a configuration's text kinds register under: each kind's own extension (`color`, `type`,
     * `proj`, ...), each one the character format reads (`CjsCharacterYamlFormat.extensions`), and `.yaml` + `ex` for
     * the `.yaml` kinds and the files without an extension.
     * @param {{ kinds: Object<string, object>, getRows: function(): Array<{match: string, kind: string}> }} configuration
     *   The kinds and their path rows (`CjsCharacterLibraryConfiguration`).
     * @returns {string[]} Normalized registration extensions.
     * @throws {TypeError} For a text kind whose extension the character format does not read.
     */
    static getExtensions(configuration)
    {
        const extensions = new Set();
        for (const row of configuration.getRows())
        {
            if (configuration.kinds[row.kind].pathOnly) continue;
            const extension = CjsCharacterObjectBuilder.getRouteExtension(row.match.slice(row.match.lastIndexOf("/") + 1));
            if (extension !== "yaml" + CjsCharacterObjectBuilder.ex && !CjsCharacterYamlFormat.extensions.includes("." + extension))
                throw new TypeError(`The character format reads no .${extension} (${row.kind})`);
            extensions.add(extension);
        }
        return [ ...extensions ].sort();
    }

    /**
     * The registration extension a character source loads under: its own, or `yaml` + `ex` for `.yaml` and
     * extension-less files.
     * @param {string} path A source path or file pattern.
     * @returns {string} The normalized registration extension.
     */
    static getRouteExtension(path)
    {
        const extension = getResourceExtension(path).toLowerCase();
        return !extension || extension === "yaml" ? "yaml" + CjsCharacterObjectBuilder.ex : extension;
    }

    /**
     * The resMan LoadObject options that route a character source to its object builder.
     * @param {string} path The source path.
     * @returns {{ext?: string, ex?: string}} Empty for a kind with its own extension.
     */
    static getLoadOptions(path)
    {
        return CjsCharacterObjectBuilder.getRouteExtension(path) === "yaml" + CjsCharacterObjectBuilder.ex
            ? { ext: ".yaml", ex: CjsCharacterObjectBuilder.ex }
            : {};
    }

    /**
     * Registers the character format on a resMan by its own extensions (`RegisterFormat`), so a caller can read a
     * character file's values through resMan, and the character object builder for every text extension of a
     * configuration (`getExtensions`), which LoadObject prefers. Each build asks `kindOf` which configured kind the
     * path is.
     *
     * Ours (non-carbon-extensions.md § *The shared character library*): the character formats register
     * themselves, as Carbon modules register their own extensions (`BLUE_REGISTER_RESOURCE_EXTENSION`,
     * `IBlueResMan.h:151`); `CjsCharacterLibraryManager.Initialize` calls this with the library's configuration.
     *
     * @param {object} resMan The resource manager.
     * @param {function(string): (string|null)} kindOf A canonical source path's configured kind, or null.
     * @param {{ kinds: Object<string, object>, sourceLists: Object<string, Object<string, (string|string[]|object)>>, getRows: function(): Array<{match: string, kind: string}> }} configuration
     *   The kinds, their list forms and their path rows (`CjsCharacterLibraryConfiguration`).
     * @returns {void}
     */
    static registerObjectBuilders(resMan, kindOf, configuration)
    {
        const create = (bytes, context) =>
        {
            const path = normalizeResourcePath(context.path);
            const kind = kindOf(path);
            if (!kind) throw new TypeError(`No configured character source for ${path}`);
            return new CjsCharacterObjectBuilder(bytes, kind, path, configuration);
        };
        resMan.RegisterFormat(CjsCharacterYamlFormat);
        for (const extension of CjsCharacterObjectBuilder.getExtensions(configuration)) resMan.RegisterObjectBuilder(extension, create);
        // LoadObject consults a bare object builder only without an ex (BlueResMan LoadObject), so the .yaml + ex
        // route is an explicit object route over the builder just registered. Its builder answers the object, so
        // the route's Identify is never reached; it keeps the values as they are.
        resMan.RegisterExtension("yaml" + CjsCharacterObjectBuilder.ex, CjsLoadingObject, { Identify: () => true });
    }

    /**
     * Identifies an observed layout without constructing or routing objects.
     * @param {*} value Parsed YAML value.
     * @param {string} kind Configured source family.
     * @param {Object<string, object>} kinds The caller's kind declarations.
     * @returns {{kind:string,className:string,envelope?:boolean,items?:string,slots?:string[],leading?:string,list?:string}} Identified declaration.
     */
    static inspect(value, kind, kinds)
    {
        let selected = kind;
        if (kind === "cameras" && Array.isArray(value))
        {
            if (value.length !== 6) throw new TypeError("A positional character camera requires six source slots.");
            selected = "cameraSequences";
        }
        if (kind === "posts")
        {
            if (typeof value?.lut === "string" && typeof value.lut_influence === "number") selected = "scalarPosts";
            else if (typeof value?.lut !== "boolean" || !Array.isArray(value.lut_influence))
            {
                throw new TypeError("Unrecognized character post layout.");
            }
        }
        const declaration = kinds[selected];
        if (!declaration || declaration.pathOnly) throw new TypeError(`Character YAML has no text kind ${selected}.`);
        return { kind: selected, ...declaration };
    }
}

/**
 * An envelope file's values: its path as `name`, and the file's list as `value`, or, where the kind names them, the
 * list's items by position as its `slots` fields (a `.type` tuple; a shorter tuple leaves the last fields at their
 * defaults), or a leading string as its `leading` field and the rest as its `list` field (a recipe's sex and
 * modifiers).
 * @param {*} raw The file's value.
 * @param {string} path The file's path.
 * @param {{ slots?: string[], leading?: string, list?: string }} declaration The kind's declaration.
 * @returns {object} The record's values.
 * @throws {TypeError} For a kind with `slots` or a `list` field whose file is not a list, or a tuple longer than its
 *   slots.
 */
function ReadEnvelope(raw, path, declaration)
{
    if (!declaration.slots && !declaration.list) return { name: path, value: raw };
    if (!Array.isArray(raw)) throw new TypeError(`${path} must be a list`);
    const values = { name: path };
    if (declaration.slots)
    {
        if (raw.length > declaration.slots.length) throw new TypeError(`${path} has ${raw.length} items; its kind names ${declaration.slots.length}`);
        for (let i = 0; i < raw.length; i++) values[declaration.slots[i]] = raw[i];
        return values;
    }
    const leading = declaration.leading && typeof raw[0] === "string";
    if (leading) values[declaration.leading] = raw[0];
    values[declaration.list] = leading ? raw.slice(1) : raw;
    return values;
}

/**
 * A post written in the scalar layout, as `CjsCharacterPost` values. Every scalar post shipped (114 of build 3646012's
 * 317 scene posts, scenes_post.yaml) is the empty post: `lut: ''`, `lut_influence: 0`; it reads as no LUT, influence
 * zero, and its own `lut_path`; its `_pdpType` (`POST_SCALAR`) keeps the layout, so it writes back as it was read.
 * Derived (2026-11-10): the empty values are the only scalar ones, so no other reading is stated.
 * @param {object} raw The file's values.
 * @param {string} path The file's path.
 * @returns {object} The post's values.
 * @throws {TypeError} For a scalar post with other values.
 */
function ReadScalarPost(raw, path)
{
    if (raw.lut !== "" || raw.lut_influence !== 0) throw new TypeError(`${path}: a scalar post other than the empty one is unread`);
    return { lut: false, lut_influence: [ 0, 0, 0, 0 ], lut_path: raw.lut_path };
}

/**
 * A camera written in the positional layout, a six-item tuple, as `CjsCharacterCamera` values: position, point of
 * interest, field of view, front clip, back clip, then five hook names. Every positional camera shipped (15 of build
 * 3687575's 339 cameras) leaves the five hook names empty; they read as an empty `hook_names`, and others are unread,
 * since the tuple does not say which hook each one is. The fields the tuple lacks (`aspect_ratio`,
 * `transform_hook_scale`, `viewport_size`) stay at their defaults; its `_pdpType` (`CAMERA_SEQUENCE`) keeps the
 * layout. Derived (2026-11-12): the slot meanings come from the values: 0.3, 0.1 and 200 equal the keyed files' field
 * of view and clips, and the second tuple sits at head height.
 * @param {Array<*>} raw The file's six items.
 * @param {string} path The file's path.
 * @returns {object} The camera's values.
 * @throws {TypeError} For hook names other than five empty ones.
 */
function ReadPositionalCamera(raw, path)
{
    const [ position, point_of_interest, field_of_view, front_clip, back_clip, hooks ] = raw;
    if (!Array.isArray(hooks) || hooks.length !== 5 || hooks.some(value => value !== "")) throw new TypeError(`${path}: a positional camera's hook names other than empty are unread`);
    return { position, point_of_interest, field_of_view, front_clip, back_clip, hook_names: { fov: "", name: "", target: "", transform: "", translation: "" } };
}

/**
 * A light rig's values: the lights of the `Tr2InteriorScene` the file saves them in. The scene itself is not made.
 * @param {*} raw The file's value.
 * @param {string} path The file's path.
 * @param {Object<string, Object<string, (string|string[]|object)>>} sourceLists The caller's list forms, by record class.
 * @returns {{ lights: Array<object> }} The rig's values.
 * @throws {TypeError} For a file that is not a scene holding only lights.
 */
function ReadLightRig(raw, path, sourceLists)
{
    if (raw?.type !== "Tr2InteriorScene") throw new TypeError(`${path}: a light rig is saved as a Tr2InteriorScene`);
    const other = Object.keys(raw).filter(key => key !== "type" && key !== "lights");
    if (other.length) throw new TypeError(`${path}: a light rig's scene holds only lights, not ${other.join(", ")}`);
    return { lights: ReadTypeRecords(raw.lights ?? [], sourceLists) };
}

/**
 * Hydrates the existing light YAML's native type records without initialization.
 * @param {*} value Parsed light source value.
 * @param {Object<string, Object<string, (string|string[]|object)>>} sourceLists The caller's list forms, by record class.
 * @param {Map<object,object>} [memo=new Map()] Source aliases already encountered.
 * @returns {*} Converted value, preserving aliases and scalar spelling.
 */
function ReadTypeRecords(value, sourceLists, memo = new Map())
{
    if (!value || typeof value !== "object") return value;
    if (memo.has(value)) return memo.get(value);
    if (Array.isArray(value))
    {
        const result = [];
        memo.set(value, result);
        for (const item of value) result.push(ReadTypeRecords(item, sourceLists, memo));
        return result;
    }
    const name = typeof value.type === "string" ? value.type : "";
    const Constructor = name ? CjsSchema.getConstructor(name) : null;
    if (name && !Constructor) throw new TypeError(`Unregistered light YAML type ${name}.`);
    const result = Constructor ? new Constructor() : Object.create(null);
    memo.set(value, result);
    const values = Object.fromEntries(Object.entries(value)
        .filter(([ key ]) => key !== "type")
        .map(([ key, child ]) => [ key, ReadTypeRecords(child, sourceLists, memo) ]));
    if (Constructor) new DictReader({ liveLists: true }).ReadInto(result, normalizeCharacterYamlValues(Constructor, values, sourceLists), null);
    else Object.assign(result, values);
    return result;
}
