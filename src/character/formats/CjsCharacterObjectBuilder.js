import { CjsSchema } from "../../global/schema/CjsSchema.js";
import { CjsYamlFormat } from "../../resource/formats/yaml/CjsYamlFormat.js";
import { CjsYamlReader } from "../../resource/formats/yaml/core/CjsYamlReader.js";
import { CjsCharacterLibraryConfiguration } from "../library/CjsCharacterLibraryConfiguration.js";
import { createCharacterYamlTagHandlers, normalizeCharacterYamlValues } from "./yaml.js";

/**
 * Caches one character YAML parse and creates fresh typed records per LoadObject.
 * Identification is separate from construction, as in the static format route.
 * It does not build characters or acquire any referenced resource.
 */
export class CjsCharacterObjectBuilder
{
    _reader = null;

    _kind = "";

    _path = "";

    /** Weak source associations retain authored presence without polluting data classes. */
    static _sources = new WeakMap();

    /**
     * Parses one already acquired source with its configured family.
     * @param {string|ArrayBuffer|ArrayBufferView} bytes Original YAML input.
     * @param {string} kind Configured source family.
     * @param {string} path Original logical source path.
     * @param {object} [options={}] YAML reader options, including an alias bound.
     */
    constructor(bytes, kind, path, options = {})
    {
        this._kind = kind;
        this._path = path;
        const format = new CjsYamlFormat({
            ...options,
            sourceName: path,
            tagPolicy: "handle",
            tagHandlers: createCharacterYamlTagHandlers(),
            maxAliasCount: options.maxAliasCount ?? 100000,
            // Two published sculpting-limit files repeat keys. Keep the full AST;
            // the existing YAML conversion uses the last value when explicitly allowed.
            uniqueKeys: options.uniqueKeys ?? kind !== "sculptingLimits"
        });
        this._reader = new CjsYamlReader(bytes, format.GetValues());
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
        let raw = this._reader.ReadRaw();
        const identified = CjsCharacterObjectBuilder.inspect(raw, this._kind);
        const Constructor = CjsSchema.getConstructor(identified.className);
        if (!Constructor) throw new TypeError(`Character kind ${identified.kind} requires registered ${identified.className}.`);
        if (identified.kind === "lights") raw = ReadTypeRecords(raw);
        if (identified.kind === "recipes")
        {
            const Modifier = CjsSchema.getConstructor("CjsCharacterRecipeModifier");
            if (!Modifier) throw new TypeError("Character recipes require registered modifier records.");
            raw = raw.map((entry, index) =>
            {
                if (index === 0 && typeof entry === "string") return entry;
                const modifier = new Modifier();
                CjsSchema.setValues(modifier, normalizeCharacterYamlValues(Modifier, entry), { initialize: false });
                return modifier;
            });
        }
        const existing = CjsSchema.cast(raw, Constructor);
        const object = existing || new Constructor();
        if (!existing)
        {
            const values = identified.envelope ? { name: this._path, value: raw } : raw;
            CjsSchema.assertValues(values, identified.className);
            CjsSchema.setValues(object, normalizeCharacterYamlValues(Constructor, values), { initialize: false });
        }
        CjsCharacterObjectBuilder._sources.set(object, { builder: this, kind: identified.kind });
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
     * Identifies an observed layout without constructing or routing objects.
     * @param {*} value Parsed YAML value.
     * @param {string} kind Configured source family.
     * @returns {{kind:string,className:string,envelope?:boolean}} Identified declaration.
     */
    static inspect(value, kind)
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
        const declaration = CjsCharacterLibraryConfiguration.kinds[selected];
        if (!declaration || declaration.pathOnly) throw new TypeError(`Character YAML has no text kind ${selected}.`);
        return { kind: selected, ...declaration };
    }

    /**
     * Finds the original layout for one loaded record without retaining the record.
     * @param {object} object Record returned by this builder.
     * @returns {{builder:CjsCharacterObjectBuilder,kind:string}|null} Source association.
     */
    static getSource(object)
    {
        return this._sources.get(object) || null;
    }
}

/**
 * Hydrates the existing light YAML's native type records without initialization.
 * @param {*} value Parsed light source value.
 * @param {Map<object,object>} [memo=new Map()] Source aliases already encountered.
 * @returns {*} Converted value, preserving aliases and scalar spelling.
 */
function ReadTypeRecords(value, memo = new Map())
{
    if (!value || typeof value !== "object") return value;
    if (memo.has(value)) return memo.get(value);
    if (Array.isArray(value))
    {
        const result = [];
        memo.set(value, result);
        for (const item of value) result.push(ReadTypeRecords(item, memo));
        return result;
    }
    const name = typeof value.type === "string" ? value.type : "";
    const Constructor = name ? CjsSchema.getConstructor(name) : null;
    if (name && !Constructor) throw new TypeError(`Unregistered light YAML type ${name}.`);
    const result = Constructor ? new Constructor() : Object.create(null);
    memo.set(value, result);
    const values = Object.fromEntries(Object.entries(value)
        .filter(([ key ]) => key !== "type")
        .map(([ key, child ]) => [ key, ReadTypeRecords(child, memo) ]));
    if (Constructor) CjsSchema.setValues(result, normalizeCharacterYamlValues(Constructor, values), { initialize: false });
    else Object.assign(result, values);
    return result;
}
