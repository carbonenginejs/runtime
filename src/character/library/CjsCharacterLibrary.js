import { CjsCharacterLibraryConfiguration } from "./CjsCharacterLibraryConfiguration.js";
import { CjsCharacterGeneric } from "./kinds/CjsCharacterGeneric.js";
import { exposure as be } from "#be";
import { normalizeResourcePath } from "#utils/path";
import { CjsSchema, meta, type } from "#schema";
import { DictWriter } from "../../global/blue/DictWriter.js";
import { ReadValues } from "../../global/blue/values.js";
import { NOTIFY_METHODS } from "../../global/compose/notify.js";
import { CjsCharacterLibraryDocuments } from "./CjsCharacterLibraryDocuments.js";
import { CjsCharacterTextureMetadata } from "../model/catalog/CjsCharacterTextureMetadata.js";
import { CjsCharacterUnresolvedRelationship } from "./CjsCharacterUnresolvedRelationship.js";

/**
 * Hydrated character library whose public fields have the same shape as its JSON values.
 *
 * Each source record-map key becomes the record's `recordID`; other domain
 * identities (`typeID`, `raceID`, ...) keep their authored names. `_id` and
 * `_ref` only preserve object identity within one serialized graph and are
 * never domain IDs; round trips preserve relationships, not token numbers.
 * Document indexes and lazy index flags are runtime state excluded from
 * JSON.
 */
@meta.define("CjsCharacterLibrary")
export class CjsCharacterLibrary
{

    /** Runtime indexes rebuilt from the paired sourceNames and kind lists. */
    _kindIndexes = new Map();

    /** Shared original source documents; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterGeneric")
    generic = new CjsCharacterGeneric();

    /** Names aligned with each kind list. Mutate both through AddKind/RemoveKind. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.map({ kind: "list", itemType: "string" })
    sourceNames = new Map();

    /** Flat parts holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterPart")
    parts = [];

    /** Flat avatarPartMetaData holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsAvatarPartMetaData")
    avatarPartMetaData = [];

    /** Flat colorVariations holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterColorVariation")
    colorVariations = [];

    /** Flat baseColors holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterBaseColor")
    baseColors = [];

    /** Flat types holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterType")
    types = [];

    /** Flat projectedDecals holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsProjectedDecal")
    projectedDecals = [];

    /** Flat recipes holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterRecipe")
    recipes = [];

    /** Flat cameras holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterCamera")
    cameras = [];

    /** Flat cameraSequences holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterCameraSequence")
    cameraSequences = [];

    /** Flat positions holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterPosition")
    positions = [];

    /** Flat poses holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterPose")
    poses = [];

    /** Flat lights holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("Tr2InteriorScene")
    lights = [];

    /** Flat backgrounds holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterBackground")
    backgrounds = [];

    /** Flat posts holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterPost")
    posts = [];

    /** Flat scalarPosts holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterScalarPost")
    scalarPosts = [];

    /** Flat characters holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterPreset")
    characters = [];

    /** Flat scenes holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterScene")
    scenes = [];

    /** Flat curveSetMetadata holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterCurveSetMetadata")
    curveSetMetadata = [];

    /** Flat curveCacheLists holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterCurveCacheList")
    curveCacheLists = [];

    /** Flat materialSets holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterMaterialSet")
    materialSets = [];

    /** Flat clips holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterClip")
    clips = [];

    /** Flat rigs holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterRig")
    rigs = [];

    /** Flat gstates holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterGState")
    gstates = [];

    /** Flat textures holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterTexture")
    textures = [];

    /** Flat blackResources holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterNamedValue")
    blackResources = [];

    /** Flat geometryResources holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterNamedValue")
    geometryResources = [];

    /** Flat staticResources holdings; schema 13 only. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterNamedValue")
    staticResources = [];

    _documentIndexes = new Map();

    _textureMetadataRequests = new Map();

    _resourceManager = null;

    /**
     * The source relationships between documents: owning document, path to
     * the member (`*` spans an array), target document. The builder turns
     * each into a `{ _ref }`; a schema-10 library is migrated along them.
     */
    static relationships = [
        ...[ "partType", "colorLocation", "colorName", "materialProfile" ].map((field, i) => [
            "characterPartSources", [ "materialBindings", "*", field ],
            [ "characterPartTypes", "characterColorLocations", "characterColorNames", "characterMaterialProfiles" ][i]
        ]),
        [ "ancestries", [ "bloodlineID" ], "bloodlines" ],
        [ "bloodlines", [ "raceID" ], "races" ],
        [ "characterResources", [ "clothingAlsoCoversCategory" ], "characterModifierLocations" ],
        [ "characterResources", [ "clothingAlsoCoversCategory2" ], "characterModifierLocations" ],
        [ "characterResources", [ "clothingRemovesCategory" ], "characterModifierLocations" ],
        [ "characterResources", [ "clothingRemovesCategory2" ], "characterModifierLocations" ],
        [ "paperdolls", [ "modifiers", "*", "modifierLocationID" ], "characterModifierLocations" ],
        [ "paperdolls", [ "modifiers", "*", "paperdollResourceID" ], "characterResources" ],
        [ "paperdolls", [ "colorSelections", "*", "colorID" ], "characterColorLocations" ],
        [ "paperdolls", [ "colorSelections", "*", "colorNameA" ], "characterColorNames" ],
        [ "paperdolls", [ "colorSelections", "*", "colorNameBC" ], "characterColorNames" ],
        [ "paperdolls", [ "sculptWeights", "*", "sculptLocationID" ], "characterSculptingLocations" ],
        [ "paperdolls", [ "backgroundID" ], "characterPortraitResources" ],
        [ "characterPartTypes", [ "partSource" ], "characterPartSources" ],
        [ "characterPartTypes", [ "partSources", "*" ], "characterPartSources" ],
        [ "characterPartSources", [ "metadata" ], "characterPartMetadata" ],
        [ "characterPartSources", [ "versions", "*", "metadata" ], "characterPartMetadata" ],
        [ "characterPartMetadata", [ "dependencies", "*", "partSource" ], "characterPartSources" ],
        [ "characterPartMetadata", [ "dependencies", "*", "modifierLocation" ], "characterModifierLocations" ],
        [ "characterPartMetadata", [ "occlusions", "*", "partSource" ], "characterPartSources" ],
        [ "characterPartMetadata", [ "occlusions", "*", "modifierLocation" ], "characterModifierLocations" ]
    ];

    /**
     * Visits every relationship member along `path` in one source record:
     * `visit(owner, key, label)`, where `label` names the member from the
     * record (`paperdolls.30.modifiers[1].paperdollResourceID`).
     */
    static visitRelationshipField(value, path, index, label, visit)
    {
        if (index === path.length - 1)
        {
            if (!IsPlainObject(value))
            {
                throw new TypeError(`${label} must be an object`);
            }

            const field = path[index];

            if (Object.hasOwn(value, field))
            {
                visit(value, field, `${label}.${field}`);
            }

            return;
        }

        if (!IsPlainObject(value))
        {
            throw new TypeError(`${label} must be an object`);
        }

        const field = path[index];

        if (!Object.hasOwn(value, field) || value[field] === null)
        {
            return;
        }

        if (path[index + 1] === "*")
        {
            if (!Array.isArray(value[field]))
            {
                throw new TypeError(`${label}.${field} must be an array`);
            }

            if (index + 2 === path.length)
            {
                for (let itemIndex = 0; itemIndex < value[field].length; itemIndex++)
                {
                    visit(
                        value[field],
                        itemIndex,
                        `${label}.${field}[${itemIndex}]`
                    );
                }

                return;
            }

            for (let itemIndex = 0; itemIndex < value[field].length; itemIndex++)
            {
                CjsCharacterLibrary.visitRelationshipField(
                    value[field][itemIndex],
                    path,
                    index + 2,
                    `${label}.${field}[${itemIndex}]`,
                    visit
                );
            }

            return;
        }

        CjsCharacterLibrary.visitRelationshipField(value[field], path, index + 1, `${label}.${field}`, visit);
    }

    /**
     * Sets each relationship that holds a scalar instead of a `{ _ref }` to
     * null in place, and returns one unresolved-relationship record per member
     * - a schema-10 library kept a dangling identity in the member itself.
     */
    static nullDanglingRelationships(documents)
    {
        const unresolved = [];
        for (const [ sourceName, path, targetName ] of CjsCharacterLibrary.relationships)
        {
            for (const record of documents[sourceName] ?? [])
            {
                const prefix = `${sourceName}.${record.recordID}.`;
                CjsCharacterLibrary.visitRelationshipField(record, path, 0, `${sourceName}.${record.recordID}`, (owner, key, label) =>
                {
                    const value = owner[key];
                    if (value === null || value === undefined || typeof value === "object") return;
                    unresolved.push({
                        document: sourceName,
                        recordID: String(record.recordID),
                        field: label.slice(prefix.length),
                        targetDocument: targetName,
                        targetID: String(value)
                    });
                    owner[key] = null;
                });
            }
        }
        return unresolved;
    }

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    schema = "carbonenginejs.characterLibrary";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.uint32
    schemaVersion = 11;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    sourceTarget = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    sourceGame = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    sourceProvider = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    sourceBuild = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    generatedAt = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterLibraryDocuments")
    documents = new CjsCharacterLibraryDocuments();

    /**
     * Source relationships whose target record does not exist. Each owning
     * member holds null; the builder records here which identity it named.
     */
    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterUnresolvedRelationship")
    unresolvedRelationships = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.unknown
    rawDocuments = null;

    /** Exports the declared schema version, excluding newer fields from legacy payloads. */
    GetValues(options = {})
    {
        const values = new DictWriter().WriteObject(this, {}, this.schemaVersion === 13
            ? { persistOnly: true, typeTags: true, ...options } : options);
        if (this.schemaVersion < 13)
        {
            delete values.generic;
            delete values.sourceNames;
            for (const [kind, declaration] of Object.entries(CjsCharacterLibraryConfiguration.kinds))
            {
                if (!declaration.generic) delete values[kind];
            }
        }
        if (this.schemaVersion < 12)
        {
            VisitVersionFields(values, CjsCharacterLibrary, (owner, key) => { delete owner[key]; });
            values.unresolvedRelationships = (values.unresolvedRelationships ?? []).filter(value =>
                !value.field.startsWith("materialBindings[")
            );
        }
        return values;
    }

    /** Hydrates a complete library after applying the explicit legacy migration. */
    static from(values = {}, options = {})
    {
        const instance = new this();
        instance.SetValues(this.validateValues(values), { ...options, skipEvents: true });
        return instance;
    }

    /** Applies complete library values through the same migration used by from(). */
    SetValues(values = {}, options = {})
    {
        const input = IsCompleteLibraryValue(values)
            ? this.constructor.validateValues(values)
            : values;
        if (!CjsSchema.assertValues(input, "CjsCharacterLibrary.SetValues")) return false;
        const changed = ReadValues(this, input, options);
        this._kindIndexes.clear();
        return changed instanceof Set && !changed.size ? false : changed;
    }

    /**
     * Rejects combined plain values that cannot hydrate without losing fields or structure.
     *
     * Schemas 7, 8 and 9 migrate to 10. Schemas 7 and 8 predate
     * `characterTextureMetadata`, may not define it, and normalize it to an
     * empty collection.
     */
    static validateValues(value)
    {
        RequirePlainObject(value, "Character library");
        if (value.schema === "carbonenginejs.characterLibrary" && value.schemaVersion === 13)
        {
            RequirePlainObject(value.generic, "Character generic holdings");
            RequirePlainObject(value.sourceNames, "Character source names");
            for (const key of Object.keys(value.sourceNames))
            {
                if (!Object.hasOwn(CjsCharacterLibraryConfiguration.kinds, key)) throw new TypeError(`Unknown character kind ${key}`);
            }
            for (const [kind, declaration] of Object.entries(CjsCharacterLibraryConfiguration.kinds))
            {
                const records = declaration.generic ? value.generic[kind] : value[kind];
                const names = value.sourceNames[kind] ?? [];
                ValidateKindNames(kind, records, names);
            }
            ValidateModelValue(value, CjsCharacterLibrary, "Character library");
            return value;
        }

        if (value.schema !== "carbonenginejs.characterLibrary"
            || ![ 7, 8, 9, 10, 11, 12 ].includes(value.schemaVersion))
        {
            throw new TypeError(
                "Character library must use carbonenginejs.characterLibrary schema version 7, 8, 9, 10, 11, or 12"
            );
        }

        for (const key of ["generic", "sourceNames", ...Object.keys(CjsCharacterLibraryConfiguration.kinds)
            .filter(kind => !CjsCharacterLibraryConfiguration.kinds[kind].generic)])
        {
            if (Object.hasOwn(value, key)) throw new TypeError(`Character schema ${value.schemaVersion} cannot define schema-13 field ${key}`);
        }
        RequirePlainObject(value.documents, "Character library documents");
        if (value.schemaVersion < 9
            && Object.hasOwn(value.documents, "characterTextureMetadata"))
        {
            throw new TypeError(
                "Character library schemas 7 and 8 cannot define characterTextureMetadata"
            );
        }

        if (value.schemaVersion < 12)
        {
            VisitVersionFields(value, CjsCharacterLibrary, (_owner, key) =>
            {
                throw new TypeError("Character schema " + value.schemaVersion + " cannot define schema-12 field " + key);
            });
        }
        else ValidatePreparedCatalog(value);

        let normalized = value;
        if (value.schemaVersion < 9)
        {
            normalized = {
                ...normalized,
                documents: { ...normalized.documents, characterTextureMetadata: [] }
            };
        }
        if (value.schemaVersion < 11)
        {
            // Schema 10 and older kept a dangling identity inside its typed
            // member; 11 holds null there and lists it. Migrated on a copy.
            const documents = structuredClone(normalized.documents);
            normalized = {
                ...normalized,
                schemaVersion: 11,
                documents,
                unresolvedRelationships: [
                    ...(normalized.unresolvedRelationships ?? []),
                    ...CjsCharacterLibrary.nullDanglingRelationships(documents)
                ]
            };
        }

        for (const name of CjsCharacterLibraryDocuments.listDocumentNames())
        {
            if (!Object.hasOwn(normalized.documents, name)
                || !Array.isArray(normalized.documents[name]))
            {
                throw new TypeError(
                    `Character library documents must define array ${JSON.stringify(name)}`
                );
            }
        }

        ValidateModelValue(normalized, CjsCharacterLibrary, "Character library");
        return normalized;
    }

    /**
     * Returns the declared flat list without changing legacy document access.
     * @param {string} kind Configured kind.
     * @returns {Array<object>} Stored records.
     */
    GetKind(kind)
    {
        if (this.schemaVersion !== 13) throw new TypeError("Flat character kinds require schema 13.");
        const declaration = CjsCharacterLibraryConfiguration.kinds[kind];
        if (!Object.hasOwn(CjsCharacterLibraryConfiguration.kinds, kind)) throw new TypeError(`Unknown character kind ${kind}`);
        return declaration.generic ? this.generic[kind] : this[kind];
    }

    /**
     * Pairs a typed record with its canonical source identity.
     * @param {string} kind Configured kind.
     * @param {string} name Library identity; never stored inside the raw record.
     * @param {object} record Registered typed record.
     * @returns {object} The stored record.
     */
    AddKind(kind, name, record)
    {
        const records = this.GetKind(kind);
        const Constructor = CjsSchema.getConstructor(CjsCharacterLibraryConfiguration.kinds[kind].className);
        if (!CjsSchema.cast(record, Constructor)) throw new TypeError(`Invalid record for ${kind}`);
        if (typeof name !== "string" || !name.trim()) throw new TypeError("Character source name must be nonempty.");
        if (this.GetKindRecord(kind, name)) throw new TypeError(`Duplicate ${kind} name ${name}`);
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

    /** Lists the document collections declared by this library model. */
    ListDocuments()
    {
        return CjsCharacterLibraryDocuments.listDocumentNames();
    }

    /** Returns one hydrated document collection or null. */
    GetDocument(name)
    {
        const key = String(name);
        return CjsCharacterLibraryDocuments.getDocumentType(key) ? this.documents[key] : null;
    }

    /** Hydrates and adds one source record while preserving the library's JSON shape. */
    Create(documentName, values = {}, options = {})
    {
        const key = RequireDocumentName(documentName);
        const recordID = NormalizeStoredRecordID(values?.recordID);

        if (this.Get(key, recordID))
        {
            ThrowDuplicateRecord(key, recordID);
        }

        const record = this.documents.Create(key, values, options);
        this._documentIndexes.delete(key);
        EmitRecordEvent(this, "recordadded", key, record, options);
        return record;
    }

    /** Adds one already-hydrated source record without cloning or rehydrating it. */
    Add(documentName, record, options = {})
    {
        const key = RequireDocumentName(documentName);
        RequireDocumentRecord(key, record);
        const recordID = NormalizeStoredRecordID(record.recordID);

        if (this.Get(key, recordID))
        {
            ThrowDuplicateRecord(key, recordID);
        }

        this.documents.Add(key, record, options);
        this._documentIndexes.delete(key);
        EmitRecordEvent(this, "recordadded", key, record, options);
        return record;
    }

    /** Detaches one source record without deleting it. */
    Remove(documentName, record, options = {})
    {
        const key = RequireDocumentName(documentName);
        RequireDocumentRecord(key, record);
        const removed = this.documents.Remove(key, record, options);

        if (removed)
        {
            this._documentIndexes.delete(key);
            EmitRecordEvent(this, "recordremoved", key, record, options);
        }
        return removed;
    }

    /** Deletes one source record through an optional domain teardown hook. */
    Delete(documentName, record, options = {})
    {
        const key = RequireDocumentName(documentName);
        RequireDocumentRecord(key, record);
        const deleted = this.documents.Delete(key, record, options);

        if (deleted)
        {
            this._documentIndexes.delete(key);
            EmitRecordEvent(this, "recordremoved", key, record, options);
            EmitRecordEvent(this, "recorddeleted", key, record, options);
        }
        return deleted;
    }

    /** Clears one source-document collection without deleting its records. */
    Clear(documentName, options = {})
    {
        const key = RequireDocumentName(documentName);
        const count = this.documents[key].length;
        const cleared = this.documents.Clear(key, options);

        if (cleared)
        {
            this._documentIndexes.delete(key);
            EmitRecordEvent(this, "documentcleared", key, null, options, { count });
        }
        return cleared;
    }

    /** Clears one or every private record lookup index after direct editor mutation. */
    Reindex(documentName = null)
    {
        if (documentName === null || documentName === undefined) this._kindIndexes.clear();
        if (documentName === null || documentName === undefined)
        {
            const indexes = new Map();

            for (const name of this.ListDocuments())
            {
                indexes.set(name, CreateDocumentIndex(
                    name,
                    this.GetDocument(name),
                    CjsCharacterLibraryDocuments.getDocumentType(name),
                    this.documents.GetDocumentRevision(name)
                ));
            }

            this._documentIndexes = indexes;
            return this;
        }

        const key = String(documentName);

        if (!this.GetDocument(key))
        {
            throw new Error(`Unknown character library document ${JSON.stringify(key)}`);
        }

        const entry = CreateDocumentIndex(
            key,
            this.GetDocument(key),
            CjsCharacterLibraryDocuments.getDocumentType(key),
                this.documents.GetDocumentRevision(key)
        );
        this._documentIndexes.set(key, entry);
        return this;
    }

    /** Returns whether a document contains a record with the requested source identity. */
    Has(documentName, recordID)
    {
        return this.Get(documentName, recordID) !== null;
    }

    /**
     * The unresolved relationship recorded for one member, or null: which
     * identity `document` record `recordID` named at `field`
     * (`modifiers[1].paperdollResourceID`) that its target document lacks.
     */
    GetUnresolvedRelationship(documentName, recordID, field)
    {
        const document = String(documentName);
        const identity = String(recordID);
        for (const entry of this.unresolvedRelationships)
        {
            if (entry.document === document && entry.recordID === identity && entry.field === field) return entry;
        }
        return null;
    }

    /** Returns one hydrated source record by its named recordID field. */
    Get(documentName, recordID)
    {
        const key = String(documentName);
        const document = this.GetDocument(key);

        if (!document)
        {
            return null;
        }

        const identity = NormalizeLookupRecordID(recordID);

        let entry = this._documentIndexes.get(key);

        if (!entry || entry.document !== document || entry.length !== document.length
            || entry.revision !== this.documents.GetDocumentRevision(key))
        {
            entry = CreateDocumentIndex(
                key,
                document,
                CjsCharacterLibraryDocuments.getDocumentType(key),
                this.documents.GetDocumentRevision(key)
            );
            this._documentIndexes.set(key, entry);
        }

        let record = entry.records.get(identity) ?? null;

        if (record && record.recordID === identity)
        {
            return record;
        }

        if (record || !entry.misses.has(identity))
        {
            entry = CreateDocumentIndex(
                key,
                document,
                CjsCharacterLibraryDocuments.getDocumentType(key),
                this.documents.GetDocumentRevision(key)
            );
            entry.misses.add(identity);
            this._documentIndexes.set(key, entry);
            record = entry.records.get(identity) ?? null;
        }

        return record && record.recordID === identity ? record : null;
    }

    /** Supplies the resource manager used by extension-neutral data inspection. */
    SetResourceManager(resMan = null)
    {
        this._resourceManager = resMan;
        return this;
    }

    /**
     * Returns or discovers extension-neutral character data for one resource path.
     *
     * The extension-neutral name, `.dds` and `.png` address the same record.
     * An existing record is returned directly; otherwise the `.png` is
     * requested raw through `resMan.GetResource(...).Ready()`, and concurrent requests for one
     * identity share that operation. A discovered record is added through
     * `Create`, so it raises the ordinary `recordadded` event.
     * This enriches the catalog's source evidence. Character texture loading
     * uses the ordinary texture resource path; composition reads that texture's
     * native cutout, never this optional catalog record or its sibling PNG.
     */
    async InspectResourceForData(resourcePath, {
        resMan = this._resourceManager,
        source = this
    } = {})
    {
        const { identity, pngPath } = NormalizeTextureResource(resourcePath);
        const existing = this.Get("characterTextureMetadata", identity);
        if (existing) return existing;

        if (!resMan)
        {
            throw new TypeError("Character resource inspection requires a resource manager");
        }

        if (!this._textureMetadataRequests.has(identity))
        {
            const request = (async () =>
            {
                // PNG inspection data is the resource's decoded output, not an
                // object: read through the resource (Ready answers what the
                // load published, as LoadObject did before it served objects only).
                const request = { emit: "raw", cacheSource: true };
                const payload = await resMan.GetResource(pngPath, request).Ready(request);
                const metadata = payload?.metadata ?? payload;
                const values = CjsCharacterTextureMetadata.fromPngInspection(
                    identity,
                    pngPath,
                    metadata
                );
                return this.Get("characterTextureMetadata", identity)
                    ?? this.Create("characterTextureMetadata", values, { source });
            })().finally(() => this._textureMetadataRequests.delete(identity));

            this._textureMetadataRequests.set(identity, request);
        }

        return this._textureMetadataRequests.get(identity);
    }

}

function RequireDocumentName(value)
{
    const key = String(value);
    if (!CjsCharacterLibraryDocuments.getDocumentType(key))
    {
        throw new Error(`Unknown character library document ${JSON.stringify(key)}`);
    }
    return key;
}

function RequireDocumentRecord(documentName, record)
{
    const typeName = CjsCharacterLibraryDocuments.getDocumentType(documentName);
    const Constructor = CjsSchema.getConstructor(typeName);

    if (!Constructor || !(record instanceof Constructor))
    {
        throw new TypeError(
            `Character library document ${JSON.stringify(documentName)} requires ${typeName}`
        );
    }
    return record;
}

function ThrowDuplicateRecord(documentName, recordID)
{
    throw new Error(
        `Character library document ${JSON.stringify(documentName)} already contains record ${JSON.stringify(recordID)}`
    );
}

// Nothing outside the tests listens to the record events (recordadded,
// recordremoved, recorddeleted, documentcleared; checked 2026-10-14). Left for
// the character work, which is expected to move them onto the new event system
// rather than drop them.
function EmitRecordEvent(library, eventName, documentName, record, options, extra = {})
{
    if (options.skipEvents === true) return;
    NOTIFY_METHODS.EmitEvent.call(library, eventName, library, {
        documentName,
        record,
        source: options.source ?? library,
        ...extra
    });
}

function CreateDocumentIndex(name, document, typeName, revision)
{
    const records = new Map();
    const Constructor = CjsSchema.getConstructor(typeName);

    for (const record of document)
    {
        if (!Constructor || !(record instanceof Constructor))
        {
            throw new TypeError(
                `Character library document ${JSON.stringify(name)} requires ${typeName}`
            );
        }

        const recordID = NormalizeStoredRecordID(record?.recordID);

        if (records.has(recordID))
        {
            throw new Error(
                `Character library document ${JSON.stringify(name)} contains duplicate record ${JSON.stringify(recordID)}`
            );
        }

        records.set(recordID, record);
    }

    return {
        document,
        length: document.length,
        revision,
        misses: new Set(),
        records
    };
}

function NormalizeStoredRecordID(value)
{
    if (typeof value !== "string" || !value.trim())
    {
        throw new TypeError("Character library recordID must be a non-empty string");
    }

    return value;
}

function NormalizeLookupRecordID(value)
{
    const result = String(value ?? "");

    if (!result.trim())
    {
        throw new TypeError("Character library recordID must be a non-empty string");
    }

    return result;
}

function NormalizeTextureResource(value)
{
    const path = normalizeResourcePath(value);
    if (!/^res:\/.+$/u.test(path) || /[?#]/u.test(path))
    {
        throw new TypeError("Character resource inspection requires a res:/ path");
    }

    const identity = path.replace(/\.(?:dds|png)$/u, "");
    if (/\.[^/]+$/u.test(identity))
    {
        throw new TypeError(
            "Character resource inspection accepts extension-neutral, DDS, or PNG paths"
        );
    }

    return { identity, pngPath: `${identity}.png` };
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

function IsCompleteLibraryValue(value)
{
    return value !== null
        && typeof value === "object"
        && !Array.isArray(value)
        && Object.hasOwn(value, "schema")
        && Object.hasOwn(value, "schemaVersion")
        && (value.schemaVersion === 13 || Object.hasOwn(value, "documents"));
}

export default CjsCharacterLibrary;

// These are format-version fields, not generic schema defaults. Raw document
// values are opaque and must never be traversed as model declarations.
const VERSION_12_FIELDS = {
    CjsCharacterLibrary: [ "rawDocuments" ],
    CjsCharacterDefinition: [ "sourceText" ],
    CjsCharacterPartSource: [ "materialBindings" ],
    CjsCharacterPartSourceVersion: [ "effectiveTextureBindings", "textureCandidateInput" ],
    CjsCharacterMaterialProfile: [ "patternTexturePath", "patternOrigin" ]
};

function VisitVersionFields(value, Constructor, visit)
{
    if (!value || typeof value !== "object" || Object.hasOwn(value, "_ref")) return;
    const schema = CjsSchema.getSchema(Constructor);
    for (const key of VERSION_12_FIELDS[CjsSchema.getClassName(Constructor)] ?? [])
    {
        if (Object.hasOwn(value, key)) visit(value, key);
    }
    for (const field of schema.fields)
    {
        const child = value[field.name], descriptor = field.type;
        if (!child || !descriptor) continue;
        const Child = CjsSchema.getConstructor(descriptor.className ?? descriptor.itemType);
        if (!Child) continue;
        if (descriptor.kind === "list" || descriptor.kind === "array")
        {
            for (const item of child) VisitVersionFields(item, Child, visit);
        }
        else if (descriptor.kind === "rootRef") VisitVersionFields(child, Child, visit);
    }
}

function ValidatePreparedCatalog(library)
{
    const documents = library.documents;
    const origin = value => value && value.kind && value.rule
        && (value.resourcePath || value.document && value.recordID);
    for (const source of documents.characterPartSources ?? [])
    {
        const seen = new Set();
        for (const [index, binding] of (source.materialBindings ?? []).entries())
        {
            const unresolved = field => library.unresolvedRelationships?.find(value =>
                value.document === "characterPartSources" && value.recordID === source.recordID
                && value.field === `materialBindings[${index}].${field}`);
            const key = JSON.stringify([binding.kind,
                binding.partType ?? unresolved("partType")?.targetID,
                binding.colorLocation ?? unresolved("colorLocation")?.targetID,
                binding.colorName ?? unresolved("colorName")?.targetID]);
            if (seen.has(key)) throw new TypeError("Ambiguous character material binding");
            seen.add(key);
            if (![ "type", "color", "dependency-default" ].includes(binding.kind)
                || !origin(binding.origin)
                || !binding.materialProfile && !unresolved("materialProfile")
                || binding.kind === "type" && ((!binding.partType && !unresolved("partType")) || binding.colorLocation || binding.colorName)
                || binding.kind === "color" && (binding.partType || (!binding.colorLocation && !unresolved("colorLocation")) || (!binding.colorName && !unresolved("colorName")))
                || binding.kind === "dependency-default" && (binding.partType || binding.colorLocation || binding.colorName))
                throw new TypeError("Invalid character material binding");
        }
        for (const version of source.versions ?? [])
        {
            const input = version.textureCandidateInput;
            if (input && (![ "omitted", "complete", "channel-overrides" ].includes(input.mode)
                || !Array.isArray(input.paths) || !origin(input.origin)
                || input.mode === "omitted" && input.paths.length))
                throw new TypeError("Invalid character texture candidate input");
            const channels = new Set();
            for (const binding of version.effectiveTextureBindings ?? [])
            {
                const key = JSON.stringify([binding.role.replace(/^(normal|specular|diffuse)-(?:source|overlay)$/u, "$1"), binding.target, binding.quality]);
                if (channels.has(key)) throw new TypeError("Ambiguous character texture channel");
                channels.add(key);
                if (!binding.path || !binding.role || !binding.target || !origin(binding.origin))
                    throw new TypeError("Invalid character catalog texture binding");
            }
        }
    }
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
