import { normalizeResourcePath } from "#utils/path";
import { CjsSchema, edit, type } from "#schema";
import { CjsModel } from "#model";
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
@type.define({ className: "CjsCharacterLibrary", family: "character" })
export class CjsCharacterLibrary extends CjsModel
{

    _documentIndexes = new Map();

    _textureMetadataRequests = new Map();

    _resourceManager = null;

    /**
     * The source relationships between documents: owning document, path to
     * the member (`*` spans an array), target document. The builder turns
     * each into a `{ _ref }`; a schema-10 library is migrated along them.
     */
    static relationships = [
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

    @edit.readwrite
    @edit.persist
    @type.string
    schema = "carbonenginejs.characterLibrary";

    @edit.readwrite
    @edit.persist
    @type.uint32
    schemaVersion = 11;

    @edit.readwrite
    @edit.persist
    @type.string
    sourceTarget = null;

    @edit.readwrite
    @edit.persist
    @type.string
    sourceGame = null;

    @edit.readwrite
    @edit.persist
    @type.string
    sourceProvider = null;

    @edit.readwrite
    @edit.persist
    @type.string
    sourceBuild = null;

    @edit.readwrite
    @edit.persist
    @type.string
    generatedAt = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterLibraryDocuments")
    documents = new CjsCharacterLibraryDocuments();

    /**
     * Source relationships whose target record does not exist. Each owning
     * member holds null; the builder records here which identity it named.
     */
    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterUnresolvedRelationship")
    unresolvedRelationships = [];

    /** Hydrates a complete library after applying the explicit legacy migration. */
    static from(values = {}, options = {})
    {
        return super.from(this.validateValues(values), options);
    }

    /** Applies complete library values through the same migration used by from(). */
    SetValues(values = {}, options = {})
    {
        const input = IsCompleteLibraryValue(values)
            ? this.constructor.validateValues(values)
            : values;
        return super.SetValues(input, options);
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

        if (value.schema !== "carbonenginejs.characterLibrary"
            || ![ 7, 8, 9, 10, 11 ].includes(value.schemaVersion))
        {
            throw new TypeError(
                "Character library must use carbonenginejs.characterLibrary schema version 7, 8, 9, 10, or 11"
            );
        }

        RequirePlainObject(value.documents, "Character library documents");
        if (value.schemaVersion < 9
            && Object.hasOwn(value.documents, "characterTextureMetadata"))
        {
            throw new TypeError(
                "Character library schemas 7 and 8 cannot define characterTextureMetadata"
            );
        }

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
        if (resMan !== null && typeof resMan.GetResource !== "function")
        {
            throw new TypeError("Character library resource manager must expose GetResource");
        }

        this._resourceManager = resMan;
        return this;
    }

    /**
     * Returns or discovers extension-neutral character data for one resource path.
     *
     * The extension-neutral name, `.dds` and `.png` address the same record.
     * An existing record is returned directly; otherwise the `.png` is
     * requested raw through `resMan.GetObject`, and concurrent requests for one
     * identity share that operation. A discovered record is added through
     * `Create`, so it raises the ordinary `recordadded` event.
     */
    async InspectResourceForData(resourcePath, {
        resMan = this._resourceManager,
        source = this
    } = {})
    {
        const { identity, pngPath } = NormalizeTextureResource(resourcePath);
        const existing = this.Get("characterTextureMetadata", identity);
        if (existing) return existing;

        if (!resMan || typeof resMan.GetResource !== "function")
        {
            throw new TypeError("Character resource inspection requires resMan.GetResource");
        }

        if (!this._textureMetadataRequests.has(identity))
        {
            const request = (async () =>
            {
                // PNG inspection data is the resource's decoded output, not an
                // object: read through the resource (Ready answers what the
                // load published, as GetObject did before it served objects only).
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
    const Constructor = CjsSchema.GetConstructor(typeName);

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

function EmitRecordEvent(library, eventName, documentName, record, options, extra = {})
{
    if (options.skipEvents === true || library.__state.suppressEvents !== 0) return;
    library.EmitEvent(eventName, library, {
        documentName,
        record,
        source: options.source ?? library,
        ...extra
    });
}

function CreateDocumentIndex(name, document, typeName, revision)
{
    const records = new Map();
    const Constructor = CjsSchema.GetConstructor(typeName);

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
    const fields = new Map(schema.fields.map(field => [ field.name, field ]));

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

    if (fieldType.kind === "model")
    {
        if ((typeof value === "string" && value.trim()) || Number.isSafeInteger(value))
        {
            return;
        }

        const Constructor = CjsSchema.GetConstructor(fieldType.className);

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

        const Constructor = CjsSchema.GetConstructor(fieldType.itemType);

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
        && Object.hasOwn(value, "documents");
}

export default CjsCharacterLibrary;
