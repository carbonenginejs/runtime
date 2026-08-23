import { CjsSchema, io, type } from "#schema";
import { CjsModel } from "#model";
import { CjsCharacterLibraryDocuments } from "./CjsCharacterLibraryDocuments.js";
import { CjsCharacterTextureMetadata } from "../model/catalog/CjsCharacterTextureMetadata.js";

/** Hydrated character library whose public fields have the same shape as its JSON values. */
@type.define({ className: "CjsCharacterLibrary", family: "character" })
export class CjsCharacterLibrary extends CjsModel
{

    #documentIndexes = new Map();

    #textureMetadataRequests = new Map();

    #resourceManager = null;

    @io.readwrite
    @type.string
    schema = "carbonenginejs.characterLibrary";

    @io.readwrite
    @type.uint32
    schemaVersion = 10;

    @io.readwrite
    @type.string
    sourceTarget = null;

    @io.readwrite
    @type.string
    sourceGame = null;

    @io.readwrite
    @type.string
    sourceProvider = null;

    @io.readwrite
    @type.string
    sourceBuild = null;

    @io.readwrite
    @type.string
    generatedAt = null;

    @io.readwrite
    @type.model("CjsCharacterLibraryDocuments")
    documents = new CjsCharacterLibraryDocuments();

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

    /** Rejects combined plain values that cannot hydrate without losing fields or structure. */
    static validateValues(value)
    {
        RequirePlainObject(value, "Character library");

        if (value.schema !== "carbonenginejs.characterLibrary"
            || ![ 7, 8, 9, 10 ].includes(value.schemaVersion))
        {
            throw new TypeError(
                "Character library must use carbonenginejs.characterLibrary schema version 7, 8, 9, or 10"
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

        const normalized = value.schemaVersion < 10
            ? {
                ...value,
                schemaVersion: 10,
                documents: value.schemaVersion < 9
                    ? {
                        ...value.documents,
                        characterTextureMetadata: []
                    }
                    : value.documents
            }
            : value;

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
        this.#documentIndexes.delete(key);
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
        this.#documentIndexes.delete(key);
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
            this.#documentIndexes.delete(key);
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
            this.#documentIndexes.delete(key);
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
            this.#documentIndexes.delete(key);
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
                    CjsCharacterLibraryDocuments.getDocumentType(name)
                ));
                this.documents.__state.flags.delete(GetDocumentIndexFlag(name));
            }

            this.#documentIndexes = indexes;
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
            CjsCharacterLibraryDocuments.getDocumentType(key)
        );
        this.#documentIndexes.set(key, entry);
        this.documents.__state.flags.delete(GetDocumentIndexFlag(key));
        return this;
    }

    /** Returns whether a document contains a record with the requested source identity. */
    Has(documentName, recordID)
    {
        return this.Get(documentName, recordID) !== null;
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

        if (this.documents.__state.flags.delete(GetDocumentIndexFlag(key)))
        {
            this.#documentIndexes.delete(key);
        }

        let entry = this.#documentIndexes.get(key);

        if (!entry || entry.document !== document || entry.length !== document.length)
        {
            entry = CreateDocumentIndex(
                key,
                document,
                CjsCharacterLibraryDocuments.getDocumentType(key)
            );
            this.#documentIndexes.set(key, entry);
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
                CjsCharacterLibraryDocuments.getDocumentType(key)
            );
            entry.misses.add(identity);
            this.#documentIndexes.set(key, entry);
            record = entry.records.get(identity) ?? null;
        }

        return record && record.recordID === identity ? record : null;
    }

    /** Supplies the resource manager used by extension-neutral data inspection. */
    SetResourceManager(resMan = null)
    {
        if (resMan !== null && typeof resMan.GetObject !== "function")
        {
            throw new TypeError("Character library resource manager must expose GetObject");
        }

        this.#resourceManager = resMan;
        return this;
    }

    /** Returns or discovers extension-neutral character data for one resource path. */
    async InspectResourceForData(resourcePath, {
        resMan = this.#resourceManager,
        source = this
    } = {})
    {
        const { identity, pngPath } = NormalizeTextureResource(resourcePath);
        const existing = this.Get("characterTextureMetadata", identity);
        if (existing) return existing;

        if (!resMan || typeof resMan.GetObject !== "function")
        {
            throw new TypeError("Character resource inspection requires resMan.GetObject");
        }

        if (!this.#textureMetadataRequests.has(identity))
        {
            const request = (async () =>
            {
                const payload = await resMan.GetObject(pngPath, {
                    emit: "raw",
                    cacheSource: true
                });
                const metadata = payload?.metadata ?? payload;
                const values = CjsCharacterTextureMetadata.fromPngInspection(
                    identity,
                    pngPath,
                    metadata
                );
                return this.Get("characterTextureMetadata", identity)
                    ?? this.Create("characterTextureMetadata", values, { source });
            })().finally(() => this.#textureMetadataRequests.delete(identity));

            this.#textureMetadataRequests.set(identity, request);
        }

        return this.#textureMetadataRequests.get(identity);
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

function GetDocumentIndexFlag(documentName)
{
    return `index:${documentName}`;
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

function CreateDocumentIndex(name, document, typeName)
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
    const path = String(value ?? "").replace(/\\/gu, "/").toLowerCase();
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
