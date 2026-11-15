import { CjsCharacterLibraryConfiguration } from "./CjsCharacterLibraryConfiguration.js";
import { CjsCharacterGeneric } from "../model/source/CjsCharacterGeneric.js";
import { CjsSchema, meta, type } from "#schema";
import { DictWriter } from "../../blue/formats/graph/DictWriter.js";
import { DictReader } from "../../blue/formats/graph/DictReader.js";
// The record classes the kinds name (by class name) register themselves on import.
import "../model/index.js";

/**
 * The character library's items, by kind: each kind a list of its records (`CjsCharacterLibraryConfiguration.kinds`)
 * beside the names they were stored under (`sourceNames`). Its data (`GetData`, `SetData`) is the items collected by
 * kind, and that is the library's whole format: a prebuilt or cached library reads into the
 * same record classes the readers make, through Blue's dict reader and writer.
 */
@meta.define("CjsCharacterLibrary")
export class CjsCharacterLibrary
{

    /** Runtime indexes rebuilt from the paired sourceNames and kind lists. */
    _kindIndexes = new Map();

    /** Shared original source documents. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterGeneric")
    generic = new CjsCharacterGeneric();

    /** Names aligned with each kind list. Mutate both through AddKind/RemoveKind. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.map({ kind: "list", itemType: "string" })
    sourceNames = new Map();

    /** Flat parts holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterPart")
    parts = [];

    /** Flat avatarPartMetaData holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsAvatarPartMetaData")
    avatarPartMetaData = [];

    /** Flat colorVariations holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterColorVariation")
    colorVariations = [];

    /** Flat baseColors holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterBaseColor")
    baseColors = [];

    /** Flat types holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterType")
    types = [];

    /** Flat projectedDecals holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsProjectedDecal")
    projectedDecals = [];

    /** Flat cameras holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterCamera")
    cameras = [];

    /** Flat cameraSequences holdings: cameras read from the positional layout. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterCamera")
    cameraSequences = [];

    /** Flat positions holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterPosition")
    positions = [];

    /** Flat poses holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterPose")
    poses = [];

    /** Flat lights holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterLightRig")
    lights = [];

    /** Flat backgrounds holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterBackground")
    backgrounds = [];

    /** Flat posts holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterPost")
    posts = [];

    /** Flat scalarPosts holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterPost")
    scalarPosts = [];

    /** Flat characters holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterPreset")
    characters = [];

    /** Flat scenes holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterScene")
    scenes = [];

    /** Flat curveSetMetadata holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterCurveSetMetadata")
    curveSetMetadata = [];

    /** Flat curveCacheLists holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterCurveCacheList")
    curveCacheLists = [];

    /** Flat materialSets holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterMaterialSet")
    materialSets = [];

    /** Flat clips holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterClip")
    clips = [];

    /** Flat rigs holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterRig")
    rigs = [];

    /** Flat gstates holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterGState")
    gstates = [];

    /** Flat textures holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterTexture")
    textures = [];

    /** Flat blackResources holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterNamedValue")
    blackResources = [];

    /** Flat geometryResources holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterNamedValue")
    geometryResources = [];

    /** Flat staticResources holdings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterNamedValue")
    staticResources = [];

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    schema = "carbonenginejs.characterLibrary";

    /**
     * The data format's version: 2 since 2026-11-16, when keyed collections became lists of named records (values hold
     * no maps); 1 from 2026-11-10. Earlier versions are not read, nor migrated: `validateData` refuses them.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.uint32
    schemaVersion = 2;

    /**
     * The library's data: every item's, by kind, written by Blue's dict writer (persisted members, with type tags).
     * The document a cache stores and `SetData` reads.
     * @returns {object} The data.
     */
    GetData()
    {
        return new DictWriter().WriteObject(this, {}, { persistOnly: true, typeTags: true });
    }

    /**
     * Reads the library's data (`GetData`'s document, checked by `validateData`) into this library through Blue's
     * dict reader. An item written without a library ID gets its name, as `AddKind` gives one.
     * @param {object} data The library's data.
     * @returns {CjsCharacterLibrary} This library.
     * @throws {TypeError} For data `validateData` refuses.
     */
    SetData(data)
    {
        new DictReader({ liveLists: true }).ReadInto(this, CjsCharacterLibrary.validateData(data), null);
        this._kindIndexes.clear();
        for (const kind of Object.keys(CjsCharacterLibraryConfiguration.kinds))
        {
            const records = this.GetKind(kind), names = this.sourceNames.get(kind) ?? [];
            for (let i = 0; i < records.length; i++)
                if (records[i]._pdpID === "" && names[i]) records[i]._pdpID = names[i];
        }
        return this;
    }

    /**
     * Checks complete library data: this format and version, known kinds, each kind's records paired with unique
     * names, and every record's fields against its class.
     * @param {object} value The data.
     * @returns {object} The data.
     * @throws {TypeError} For anything else; earlier formats are not read.
     */
    static validateData(value)
    {
        RequirePlainObject(value, "Character library");
        if (value.schema !== "carbonenginejs.characterLibrary" || value.schemaVersion !== 2)
            throw new TypeError("Character library must use carbonenginejs.characterLibrary schema version 2");
        RequirePlainObject(value.generic, "Character generic holdings");
        RequirePlainObject(value.sourceNames, "Character source names");
        for (const key of Object.keys(value.sourceNames))
        {
            if (!Object.hasOwn(CjsCharacterLibraryConfiguration.kinds, key)) throw new TypeError(`Unknown character kind ${key}`);
        }
        for (const [ kind, declaration ] of Object.entries(CjsCharacterLibraryConfiguration.kinds))
        {
            ValidateKindNames(kind, declaration.generic ? value.generic[kind] : value[kind], value.sourceNames[kind] ?? []);
        }
        ValidateModelValue(value, CjsCharacterLibrary, "Character library");
        return value;
    }

    /**
     * Returns a kind's stored list.
     * @param {string} kind Configured kind.
     * @returns {Array<object>} Stored records.
     */
    GetKind(kind)
    {
        if (!Object.hasOwn(CjsCharacterLibraryConfiguration.kinds, kind)) throw new TypeError(`Unknown character kind ${kind}`);
        return CjsCharacterLibraryConfiguration.kinds[kind].generic ? this.generic[kind] : this[kind];
    }

    /**
     * Pairs a typed record with its canonical source identity, and gives it its library ID (`_pdpID`) where it has
     * none: today the identity itself (opaque to every reader of it).
     * @param {string} kind Configured kind.
     * @param {string} name Library identity.
     * @param {object} record Registered typed record.
     * @returns {object} The stored record.
     */
    AddKind(kind, name, record)
    {
        const records = this.GetKind(kind);
        const declaration = CjsCharacterLibraryConfiguration.kinds[kind];
        const Constructor = CjsSchema.getConstructor(declaration.className);
        if (!CjsSchema.cast(record, Constructor)) throw new TypeError(`Invalid record for ${kind}`);
        if (typeof name !== "string" || !name.trim()) throw new TypeError("Character source name must be nonempty.");
        if (this.GetKindRecord(kind, name)) throw new TypeError(`Duplicate ${kind} name ${name}`);
        if (record._pdpID === "") record._pdpID = name;
        const names = this.sourceNames.get(kind) ?? [];
        records.push(record);
        names.push(name);
        this.sourceNames.set(kind, names);
        this._kindIndexes.get(kind).set(name, record);
        return record;
    }

    /**
     * Removes a paired flat record and name, leaving its referenced data untouched.
     * @param {string} kind Configured kind.
     * @param {string} name Stored identity.
     * @returns {boolean} Whether a record was removed.
     */
    RemoveKind(kind, name)
    {
        const records = this.GetKind(kind);
        const names = this.sourceNames.get(kind) ?? [];
        const index = names.indexOf(name);
        if (index < 0) return false;
        records.splice(index, 1);
        names.splice(index, 1);
        this._kindIndexes.delete(kind);
        return true;
    }

    /**
     * Looks up a loaded flat record by the explicit source identity.
     * @param {string} kind Configured kind.
     * @param {string} name Stored identity.
     * @returns {object|null} Stored record, or null.
     */
    GetKindRecord(kind, name)
    {
        const records = this.GetKind(kind);
        if (!this._kindIndexes.has(kind))
        {
            const names = this.sourceNames.get(kind) ?? [];
            ValidateKindNames(kind, records, names);
            this._kindIndexes.set(kind, new Map(names.map((key, index) => [key, records[index]])));
        }
        return this._kindIndexes.get(kind).get(name) ?? null;
    }

    /**
     * Lists stored flat identities without returning the mutable index array.
     * @param {string} kind Configured kind.
     * @returns {Array<string>} Names in stored order.
     */
    ListKindNames(kind)
    {
        const records = this.GetKind(kind);
        const names = this.sourceNames.get(kind) ?? [];
        ValidateKindNames(kind, records, names);
        return names.slice();
    }

}

/**
 * Validates a serialized record against the schema's exposed declarations.
 * Attribute aliases retain authored document keys when JavaScript fields are renamed.
 *
 * @param {object} value Serialized record or graph reference.
 * @param {Function} Constructor The record's registered constructor.
 * @param {string} label Document path used in validation errors.
 * @returns {void}
 */
function ValidateModelValue(value, Constructor, label)
{
    RequirePlainObject(value, label);

    if (Object.hasOwn(value, "_ref"))
    {
        if (Object.keys(value).length !== 1)
        {
            throw new TypeError(`${label} reference must contain only _ref`);
        }

        return;
    }

    const schema = CjsSchema.getSchema(Constructor);
    // Incoming records use exposed document names, not JavaScript storage keys.
    const fields = new Map([ ...schema.members, ...schema.properties ].map(field => [ field.name, field ]));

    for (const key of Object.keys(value))
    {
        if (key === "_id" || key === "_type")
        {
            continue;
        }

        const field = fields.get(key);

        if (!field)
        {
            throw new TypeError(`${label} contains unsupported field ${JSON.stringify(key)}`);
        }

        ValidateFieldValue(value[key], field.type, `${label}.${key}`);
    }
}

function ValidateFieldValue(value, fieldType, label)
{
    if (value === null || value === undefined || !fieldType)
    {
        return;
    }

    if (fieldType.kind === "rootRef")
    {
        if ((typeof value === "string" && value.trim()) || Number.isSafeInteger(value))
        {
            return;
        }

        const Constructor = CjsSchema.getConstructor(fieldType.className);

        if (!Constructor)
        {
            throw new TypeError(`${label} uses unregistered model ${fieldType.className}`);
        }

        ValidateModelValue(value, Constructor, label);
        return;
    }

    if (fieldType.kind === "list" || fieldType.kind === "array")
    {
        if (!Array.isArray(value))
        {
            throw new TypeError(`${label} must be an array`);
        }

        const Constructor = CjsSchema.getConstructor(fieldType.itemType);

        if (Constructor)
        {
            for (let index = 0; index < value.length; index++)
            {
                ValidateModelValue(value[index], Constructor, `${label}[${index}]`);
            }
        }
    }
}

function RequirePlainObject(value, label)
{
    if (value === null || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError(`${label} must be a plain object`);
    }

    const prototype = Object.getPrototypeOf(value);

    if (prototype !== Object.prototype && prototype !== null)
    {
        throw new TypeError(`${label} must be a plain object`);
    }
}

function IsPlainObject(value)
{
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

/**
 * Checks the paired library-owned name index without modifying raw records.
 * @param {string} kind Configured kind.
 * @param {Array<object>} records Stored records.
 * @param {Array<string>} names Paired names.
 * @returns {void}
 */
function ValidateKindNames(kind, records, names)
{
    if (!Array.isArray(records) || !Array.isArray(names) || records.length !== names.length)
        throw new TypeError(`Character ${kind} records and source names must have equal lengths.`);
    if (names.some(name => typeof name !== "string" || !name.trim()) || new Set(names).size !== names.length)
        throw new TypeError(`Character ${kind} source names must be nonempty and unique.`);
}
