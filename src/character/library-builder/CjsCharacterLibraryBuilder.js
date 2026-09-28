import * as CcpLog from "../../global/logging/ccpLog.js";
import { CjsCharacterLibrary } from "../library/CjsCharacterLibrary.js";
import { CjsCharacterLibraryDocuments } from "../library/CjsCharacterLibraryDocuments.js";
import { createCharacterResourceReader } from "./resourceSource.js";

const DOCUMENT_NAMES = CjsCharacterLibraryDocuments.listDocumentNames();

const METADATA_FIELDS = [
    "sourceTarget",
    "sourceGame",
    "sourceProvider",
    "sourceBuild",
    "generatedAt"
];

/** Builds schema-v10 model-shaped JSON from source documents and lossless definition catalogs. */
export class CjsCharacterLibraryBuilder
{

    static schema = "carbonenginejs.characterLibrary";

    static schemaVersion = 11;

    /** Hydrates the deterministic values produced by build(). */
    static buildLibrary(documents = {}, options = {})
    {
        return CjsCharacterLibrary.from(this.build(documents, options));
    }

    /**
     * Builds a hydrated library from the twelve required cFSD documents using
     * blue.resMan by default or one caller-supplied byte source.
     */
    static async buildFromResources(options = {})
    {
        RequirePlainObject(options, "Character resource builder options");

        const read = createCharacterResourceReader(options);
        const signal = options.signal ?? null;
        const resourcePaths = options.resourcePaths ?? {};
        const suppliedDocuments = options.documents ?? {};

        RequirePlainObject(resourcePaths, "Character resource paths");
        RequirePlainObject(suppliedDocuments, "Character supplied documents");

        const [ fsdModule, readerModule ] = await Promise.all([
            import("#resource/formats/fsd"),
            import("#resource/formats/fsd/64/readers")
        ]);
        const registry = readerModule.CjsFsd64ReaderSetCharacterStaticData
            .registerAll(new fsdModule.CjsFsd64Reader());

        const decodedEntries = await Promise.all(
            readerModule.CjsFsd64ReaderSetCharacterStaticData.create().map(async reader =>
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
            schemaVersion: this.schemaVersion,
            documents: NormalizeDocuments(documents)
        };

        result.unresolvedRelationships = ApplyRelationships(result.documents);
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
        result = {};

        for (const [ key, child ] of Object.entries(value))
        {
            DefineValue(result, key, CloneJSON(child, `${label}.${key}`, active));
        }
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

function DefineValue(target, key, value)
{
    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        value,
        writable: true
    });
}
