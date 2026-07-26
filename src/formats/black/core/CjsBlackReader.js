import { CjsCarbonDocument } from "@carbonenginejs/runtime-utils/document";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";

import { CjsBlueReader } from "../../../format/CjsBlueReader.js";

import {
    CJS_BLACK_FORMAT_ID,
    CJS_BLACK_FOURCC,
    CJS_BLACK_VERSION
} from "./blackConstants.js";
import { CjsBlackBinaryReader } from "./CjsBlackBinaryReader.js";
import { CjsBlackPropertyReaders } from "./CjsBlackPropertyReaders.js";
import { CjsBlackSchemaRegistry } from "./CjsBlackSchemaRegistry.js";

/**
 * Reads a `.black` stream into a payload/document/runtime graph.
 *
 * This transport owns the binary buffer, string tables, numeric references,
 * and binary read cursor. `ResetReadState()` clears only per-read graph state;
 * each read entrypoint separately restores the cursor to `dataOffset`.
 */
export class CjsBlackReader extends CjsBlueReader
{
    /**
     * Creates a CjsBlackReader over caller-provided Black bytes and reader
     * options.
     */
    constructor(input, options = {})
    {
        super(options, {
            schemaRegistry: CjsBlackSchemaRegistry,
            defaultRegistry: CjsSchema,
            includeShapeContext: true,
            includeSourceShape: true,
            includeEmptyPayloadType: true,
            requirePayloadReferenceTarget: true
        });
        this.reader = CjsBlackBinaryReader.from(input, this);
        this.references = new Map();
        this.nodes = [];
        this.nextNodeId = 1;
        this.info = null;
        this.readMode = "payload";
        this.payloadDepth = 0;
        this.payloadRootFields = null;
    }

    /**
     * Returns structural metadata without materializing the decoded payload for
     * the Black object-graph reader.
     */
    Inspect()
    {
        if (this.info) return this.info;

        const reader = this.reader;
        reader.ExpectU32(CJS_BLACK_FOURCC, "Invalid Black FOURCC");

        const version = reader.ReadU32();
        if (version !== CJS_BLACK_VERSION)
        {
            throw new RangeError(`Unsupported Black version: ${version}`);
        }

        const strings = CjsBlackReader.readStringTable(reader);
        const wideStrings = CjsBlackReader.readWideStringTable(reader);

        this.info = {
            format: {
                id: CJS_BLACK_FORMAT_ID,
                version
            },
            byteLength: reader.data.byteLength,
            dataOffset: reader.offset,
            strings,
            wideStrings
        };

        return this.info;
    }

    /**
     * Reads the primary public payload representation from the supplied input
     * for the Black object-graph reader.
     */
    Read()
    {
        return this.ReadPayload();
    }

    /** Reads document from the current Black object-graph reader. */
    ReadDocument()
    {
        const info = this.Inspect();
        this.ResetReadState();
        this.readMode = "document";
        this.reader.offset = info.dataOffset;

        const rootRef = this.ReadObject(this.reader);
        if (!CjsCarbonDocument.isRef(rootRef))
        {
            throw new TypeError("Black root object is null");
        }

        this.reader.ExpectEnd("Black object graph did not read to end");

        const includeRefIndex = this.ShouldIncludeRefIndex();
        const refs = {};
        if (includeRefIndex)
        {
            for (const node of this.nodes)
            {
                refs[String(node.id)] = {
                    kind: node.kind
                };
            }
        }

        return CjsCarbonDocument.create({
            format: info.format,
            roots: [{ name: this.options.rootName || "default", ref: rootRef }],
            nodes: this.nodes,
            refs: includeRefIndex ? refs : null,
            metadata: this.CreateDocumentMetadata(info),
            reports: this.reports
        });
    }

    /** Reads runtime from the current Black object-graph reader. */
    ReadRuntime()
    {
        const info = this.Inspect();
        this.ResetReadState();
        this.readMode = "runtime";
        this.reader.offset = info.dataOffset;

        const root = this.ReadObject(this.reader);
        if (root === null)
        {
            throw new TypeError("Black root object is null");
        }

        this.reader.ExpectEnd("Black object graph did not read to end");

        this.FinalizeRuntimeInstances();

        return {
            root,
            format: info.format,
            reports: this.reports
        };
    }

    /** Reads payload from the current Black object-graph reader. */
    ReadPayload()
    {
        const info = this.Inspect();
        this.ResetReadState();
        this.readMode = "payload";
        this.ValidatePayloadConfiguration();
        this.reader.offset = info.dataOffset;

        const object = this.ReadObject(this.reader);
        if (object === null)
        {
            throw new TypeError("Black root object is null");
        }

        this.reader.ExpectEnd("Black object graph did not read to end");

        const payload = {
            comments: this.reports,
            object
        };

        if (this.ShouldIncludeDocumentMetadata())
        {
            payload.metadata = this.CreateDocumentMetadata(info);
        }

        return payload;
    }

    /** Reads object from the current Black object-graph reader. */
    ReadObject(reader)
    {
        if (this.readMode === "runtime") return this.ReadRuntimeObject(reader);
        if (this.readMode === "payload") return this.ReadPayloadObject(reader);

        const blackReference = reader.ReadU32();
        if (blackReference === 0) return null;

        const existing = this.references.get(blackReference);
        if (existing) return CjsCarbonDocument.createRef(existing);

        return this.ReadObjectPayload(reader, {
            blackReference,
            embedded: false
        });
    }

    /** Reads embedded object from the current Black object-graph reader. */
    ReadEmbeddedObject(reader)
    {
        if (this.readMode === "runtime") return this.ReadRuntimeObjectPayload(reader, {
            blackReference: null,
            embedded: true
        });

        if (this.readMode === "payload") return this.ReadPayloadObjectPayload(reader, {
            blackReference: null,
            embedded: true
        });

        return this.ReadObjectPayload(reader, {
            blackReference: null,
            embedded: true
        });
    }

    /** Reads object payload from the current Black object-graph reader. */
    ReadObjectPayload(reader, options)
    {
        const payloadSize = reader.ReadU32();
        const objectReader = reader.ReadBinaryReader(payloadSize);
        const kind = objectReader.ReadStringRef();
        const shape = this.ResolveSourceShape(kind);
        const includeClassMetadata = this.ShouldIncludeClassMetadata();
        const includeFieldTrace = this.ShouldIncludeFieldTrace();
        const node = {
            id: this.nextNodeId++,
            kind,
            fields: {},
            ...(includeClassMetadata ? {
                source: shape?.source || {},
                meta: {
                    family: shape?.family || null,
                    hashes: shape?.hashes || null,
                    blue: shape?.blue || null
                }
            } : {}),
            ...(includeFieldTrace ? {
                meta: {
                    ...(includeClassMetadata ? {
                        family: shape?.family || null,
                        hashes: shape?.hashes || null,
                        blue: shape?.blue || null
                    } : {}),
                    black: {
                        reference: options.blackReference,
                        embedded: options.embedded,
                        payloadSize,
                        fields: {}
                    }
                }
            } : {}),
            raw: null
        };

        this.nodes.push(node);
        if (options.blackReference !== null)
        {
            this.references.set(options.blackReference, node.id);
        }

        let previousBlackName = null;
        while (!objectReader.AtEnd())
        {
            const blackName = objectReader.ReadStringRef();
            const target = this.ResolveFieldTargetWithContext(kind, shape, blackName, previousBlackName);
            const value = this.ReadFieldValueWithContext(objectReader, kind, blackName, target);
            this.AssignFieldValue(node, target, value);
            previousBlackName = blackName;
        }

        objectReader.ExpectEnd(`${kind} did not read to end`);
        return CjsCarbonDocument.createRef(node.id);
    }

    /** Reads runtime object from the current Black object-graph reader. */
    ReadRuntimeObject(reader)
    {
        const blackReference = reader.ReadU32();
        if (blackReference === 0) return null;

        if (this.references.has(blackReference))
        {
            return this.references.get(blackReference);
        }

        return this.ReadRuntimeObjectPayload(reader, {
            blackReference,
            embedded: false
        });
    }

    /** Reads runtime object payload from the current Black object-graph reader. */
    ReadRuntimeObjectPayload(reader, options)
    {
        const payloadSize = reader.ReadU32();
        const objectReader = reader.ReadBinaryReader(payloadSize);
        const kind = objectReader.ReadStringRef();
        const shape = this.ResolveSourceShape(kind);
        const target = this.CreateRuntimeTarget(kind, shape);

        if (options.blackReference !== null)
        {
            this.references.set(options.blackReference, target);
        }

        // Accumulate this object's fields into a plain values map, then hand
        // the whole map to the hydration adapter. The adapter (default:
        // Object.assign) decides how the caller's class receives its values -
        // direct assignment, SetValues, etc. The target instance is already
        // registered above, so back-references resolve to it while its values
        // are still being collected (the adapter must mutate in place).
        const values = {};
        let previousBlackName = null;
        while (!objectReader.AtEnd())
        {
            const blackName = objectReader.ReadStringRef();
            const fieldTarget = this.ResolveFieldTargetWithContext(kind, shape, blackName, previousBlackName);
            const value = this.ReadFieldValueWithContext(objectReader, kind, blackName, fieldTarget);
            this.AssignRuntimeFieldValue(values, fieldTarget, value);
            previousBlackName = blackName;
        }

        objectReader.ExpectEnd(`${kind} did not read to end`);
        this.ApplyRuntimeValues(target, values, kind, shape);
        return target;
    }

    /** Reads payload object from the current Black object-graph reader. */
    ReadPayloadObject(reader)
    {
        const blackReference = reader.ReadU32();
        if (blackReference === 0) return null;

        if (this.references.has(blackReference))
        {
            return this.CreatePayloadReference(this.references.get(blackReference), blackReference);
        }

        return this.ReadPayloadObjectPayload(reader, {
            blackReference,
            embedded: false
        });
    }

    /** Reads payload object payload from the current Black object-graph reader. */
    ReadPayloadObjectPayload(reader, options)
    {
        const payloadSize = reader.ReadU32();
        const objectReader = reader.ReadBinaryReader(payloadSize);
        const kind = objectReader.ReadStringRef();
        const shape = this.ResolveSourceShape(kind);
        const target = this.CreatePayloadTarget(kind);

        if (options.blackReference !== null)
        {
            this.references.set(options.blackReference, target);
        }

        this.payloadDepth++;
        try
        {
            let previousBlackName = null;
            while (!objectReader.AtEnd())
            {
                const blackName = objectReader.ReadStringRef();
                const fieldTarget = this.ResolveFieldTargetWithContext(kind, shape, blackName, previousBlackName);
                if (this.ShouldSkipPayloadField(fieldTarget))
                {
                    this.SkipFieldValue(objectReader, fieldTarget);
                    previousBlackName = blackName;
                    continue;
                }

                const value = this.ReadFieldValueWithContext(objectReader, kind, blackName, fieldTarget);
                this.AssignPayloadFieldValue(target, fieldTarget, value);
                previousBlackName = blackName;
            }
        }
        finally
        {
            this.payloadDepth--;
        }

        objectReader.ExpectEnd(`${kind} did not read to end`);
        return target;
    }

    /** Creates skipped payload target for the current Black object-graph reader. */
    CreateSkippedPayloadTarget()
    {
        return {};
    }

    /** Returns payload root fields from the current Black object-graph reader. */
    GetPayloadRootFields()
    {
        if (this.payloadRootFields !== null) return this.payloadRootFields;

        const fields = this.options.payloadRootFields ?? this.options.rootFields ?? null;
        if (!fields)
        {
            this.payloadRootFields = false;
            return this.payloadRootFields;
        }

        this.payloadRootFields = new Set((Array.isArray(fields) ? fields : [fields]).map(String));
        return this.payloadRootFields;
    }

    /**
     * Reports whether skip payload field is enabled by the current Black
     * object-graph reader.
     */
    ShouldSkipPayloadField(target)
    {
        if (this.readMode !== "payload" || this.payloadDepth !== 1) return false;
        const rootFields = this.GetPayloadRootFields();
        if (!rootFields) return false;
        const fieldName = target.unknown ? target.blackName : target.field.name;
        return !rootFields.has(fieldName);
    }

    /** Advances past field value in the current Black object-graph reader. */
    SkipFieldValue(reader, target)
    {
        if (target.unknown)
        {
            this.ReadUnknownFieldValue(reader, null, target.blackName);
            return;
        }

        CjsBlackPropertyReaders.skipValue(reader, target.field);
    }

    /** Advances past object in the current Black object-graph reader. */
    SkipObject(reader)
    {
        const blackReference = reader.ReadU32();
        if (blackReference === 0) return;

        if (this.references.has(blackReference)) return;

        this.references.set(blackReference, this.CreateSkippedPayloadTarget());
        this.SkipObjectPayload(reader);
    }

    /** Advances past embedded object in the current Black object-graph reader. */
    SkipEmbeddedObject(reader)
    {
        this.SkipObjectPayload(reader);
    }

    /** Advances past object payload in the current Black object-graph reader. */
    SkipObjectPayload(reader)
    {
        const payloadSize = reader.ReadU32();
        const objectReader = reader.ReadBinaryReader(payloadSize);
        const kind = objectReader.ReadStringRef();
        const shape = this.ResolveSourceShape(kind);

        while (!objectReader.AtEnd())
        {
            const blackName = objectReader.ReadStringRef();
            const fieldTarget = this.ResolveFieldTarget(kind, shape, blackName);
            this.SkipFieldValue(objectReader, fieldTarget);
        }

        objectReader.ExpectEnd(`${kind} did not read to end`);
    }

    /**
     * Reports whether include class metadata is enabled by the current Black
     * object-graph reader.
     */
    ShouldIncludeClassMetadata()
    {
        return Boolean(this.options.includeClassMetadata || this.options.trace || this.options.debug);
    }

    /**
     * Reports whether include field trace is enabled by the current Black
     * object-graph reader.
     */
    ShouldIncludeFieldTrace()
    {
        return Boolean(this.options.includeFieldTrace || this.options.trace || this.options.debug);
    }

    /**
     * Reports whether include document metadata is enabled by the current Black
     * object-graph reader.
     */
    ShouldIncludeDocumentMetadata()
    {
        return Boolean(this.options.includeMetadata || this.options.trace || this.options.debug || this.options.metadata);
    }

    /**
     * Reports whether include ref index is enabled by the current Black
     * object-graph reader.
     */
    ShouldIncludeRefIndex()
    {
        return Boolean(this.options.includeRefIndex || this.options.trace || this.options.debug);
    }

    /** Creates document metadata for the current Black object-graph reader. */
    CreateDocumentMetadata(info)
    {
        if (!this.ShouldIncludeDocumentMetadata()) return this.options.metadata || null;

        return {
            black: {
                stringCount: info.strings.length,
                wideStringCount: info.wideStrings.length,
                wideStrings: info.wideStrings.slice()
            },
            ...(this.options.metadata || {})
        };
    }

    /**
     * Resolves field target with context against the current Black object-graph
     * reader.
     */
    ResolveFieldTargetWithContext(kind, shape, blackName, previousBlackName = null)
    {
        try
        {
            return this.ResolveFieldTarget(kind, shape, blackName);
        }
        catch (error)
        {
            error.message = `${kind}.${blackName} after ${previousBlackName || "<start>"}: ${error.message}`;
            throw error;
        }
    }

    /** Reads field value with context from the current Black object-graph reader. */
    ReadFieldValueWithContext(reader, kind, blackName, target)
    {
        try
        {
            return target.unknown
                ? this.ReadUnknownFieldValue(reader, kind, blackName)
                : CjsBlackPropertyReaders.readValue(reader, target.field);
        }
        catch (error)
        {
            error.message = `${kind}.${blackName}: ${error.message}`;
            throw error;
        }
    }

    /**
     * Assigns field value while preserving the current Black object-graph reader
     * contract.
     */
    AssignFieldValue(node, target, value)
    {
        if (target.unknown)
        {
            node.raw = node.raw || {};
            node.raw[target.blackName] = value;
            this.AssignFieldTrace(node, target);
            return;
        }

        if (target.indexed)
        {
            let current = node.fields[target.field.name];
            if (!current || typeof current !== "object" || CjsCarbonDocument.isRef(current))
            {
                current = Number.isInteger(target.index) ? [] : {};
                node.fields[target.field.name] = current;
            }

            current[target.key] = value;
        }
        else
        {
            node.fields[target.field.name] = value;
        }

        this.AssignFieldTrace(node, target);
    }

    /**
     * Assigns field trace while preserving the current Black object-graph reader
     * contract.
     */
    AssignFieldTrace(node, target)
    {
        if (!this.ShouldIncludeFieldTrace()) return;

        node.meta.black.fields[target.blackName] = {
            field: target.field.name,
            cppName: target.field.cppName || null,
            member: target.member,
            indexed: target.indexed,
            indexToken: target.indexToken,
            key: target.key
        };
    }

    /** Resolves field target against the current Black object-graph reader. */
    ResolveFieldTarget(kind, shape, blackName)
    {
        if (!shape)
        {
            throw new TypeError(`No source shape registered for Black type ${kind}`);
        }

        const fields = shape.fields || [];
        const blackField = (shape.black?.fields || []).find(item => CjsBlackSchemaRegistry.matchesBlackFieldName(item, blackName));
        if (blackField)
        {
            return this.ResolveBlackFieldTarget(blackName, blackField, fields);
        }

        const field = fields.find(item => item.name === blackName || item.cppName === blackName);
        if (field)
        {
            return {
                blackName,
                wireName: blackName,
                field,
                member: blackName,
                indexed: false,
                indexToken: null,
                index: null,
                key: null
            };
        }

        const indexed = CjsBlackReader.parseIndexedMember(blackName);
        if (indexed)
        {
            const indexedField = fields.find(item => item.cppName === indexed.member || item.name === CjsBlackReader.toJsFieldName(indexed.member));
            if (indexedField)
            {
                const key = CjsBlackReader.normalizeIndexedKey(indexed.indexToken, indexedField);
                return {
                    blackName,
                    wireName: blackName,
                    field: indexedField,
                    member: blackName,
                    indexed: true,
                    indexToken: indexed.indexToken,
                    index: Number.isInteger(key) ? key : null,
                    key
                };
            }
        }

        if (this.ShouldCaptureUnknownField(blackName, kind, shape))
        {
            return this.ResolveUnknownFieldTarget(kind, shape, blackName);
        }

        throw new TypeError(`Unknown Black property ${blackName} for ${kind}`);
    }

    /** Reads unknown field value from the current Black object-graph reader. */
    ReadUnknownFieldValue(reader, kind, blackName)
    {
        const readers = this.GetUnknownFieldReaders(blackName);
        const errors = [];

        for (const readValue of readers)
        {
            const startOffset = reader.offset;
            try
            {
                return readValue(reader);
            }
            catch (error)
            {
                reader.offset = startOffset;
                errors.push(error);
            }
        }

        this.reports.push({
            level: "warning",
            code: "unknown-black-property-unreadable",
            kind,
            blackName
        });

        throw errors[0] || new TypeError(`Unable to read unknown Black field ${blackName} for ${kind}`);
    }

    /** Returns unknown field readers from the current Black object-graph reader. */
    GetUnknownFieldReaders(blackName)
    {
        const readers = [];
        const readByKind = (kind, options = null) =>
        {
            const field = options ? { ...options, kind } : { kind };
            readers.push((streamReader) => CjsBlackPropertyReaders.readValue(streamReader, field));
        };
        const readByDescriptor = (descriptor = {}) =>
        {
            readers.push((streamReader) => CjsBlackPropertyReaders.readValue(streamReader, descriptor));
        };

        if (this.options.allowUnknownStringFallback)
        {
            readByKind("string");
            readByKind("path");
        }

        const name = String(blackName || "");
        if (name.endsWith(".dds") || name.endsWith(".png") || name.endsWith(".jpg") || /^res:\//.test(name))
        {
            readers.unshift((streamReader) => CjsBlackPropertyReaders.readValue(streamReader, { kind: "path" }));
            readByKind("uint32");
            readByKind("float32");
        }

        if (!this.options.allowUnknownStringFallback)
        {
            readByKind("path");
            readByKind("string");
        }

        readByKind("objectRef");
        readByKind("boolean");
        readByKind("float32");
        readByKind("float64");
        readByKind("int32");
        readByKind("uint32");
        readByKind("int16");
        readByKind("uint16");
        readByKind("int8");
        readByKind("uint8");
        readByDescriptor({ kind: "vector3" });
        readByDescriptor({ kind: "vector4" });
        readByDescriptor({ kind: "array", elementType: { kind: "uint32" } });

        return readers;
    }

    /** Resolves black field target against the current Black object-graph reader. */
    ResolveBlackFieldTarget(blackName, blackField, fields)
    {
        const sourceField = fields.find(item =>
            item.name === blackField.fieldName ||
            item.name === blackField.name ||
            item.cppName === blackField.cppName ||
            item.cppName === blackField.memberPath ||
            item.cppName === blackField.memberRoot
        );
        const fieldName = blackField.fieldName || sourceField?.name || blackField.name || CjsBlackReader.toJsFieldName(blackName);
        const usesPayloadField = Boolean(blackField.name && blackField.name !== blackField.fieldName);
        const field = {
            ...(sourceField || {}),
            name: fieldName,
            cppName: blackField.cppName || sourceField?.cppName || null,
            cppType: blackField.cppType || sourceField?.cppType || null,
            black: blackField
        };
        const hasIndex = Boolean(blackField.indexToken || blackField.indexKey !== undefined);
        const storageKey = hasIndex
            ? blackField.indexKey ?? CjsBlackReader.normalizeIndexedKey(blackField.indexToken, field)
            : null;
        const indexed = Boolean(hasIndex);

        return {
            blackName,
            wireName: blackName,
            field,
            member: blackField.member || blackName,
            indexed,
            indexToken: blackField.indexToken || null,
            index: Number.isInteger(storageKey) ? storageKey : null,
            key: storageKey
        };
    }

    /**
     * Resolves unknown field target against the current Black object-graph
     * reader.
     */
    ResolveUnknownFieldTarget(_kind, _shape, blackName)
    {
        return {
            blackName,
            wireName: blackName,
            field: {
                name: "__blackUnknown",
                cppName: null,
                cppType: null,
                black: {
                    fieldName: "__blackUnknown",
                    name: blackName,
                    memberPath: blackName,
                    memberRoot: blackName,
                    beType: "UNKNOWN"
                }
            },
            member: blackName,
            indexed: false,
            indexToken: null,
            index: null,
            key: blackName,
            unknown: true
        };
    }

    /**
     * Reports whether capture unknown field is enabled by the current Black
     * object-graph reader.
     */
    ShouldCaptureUnknownField(blackName, _kind, shape)
    {
        if (this.options.captureUnknownBlackFields) return true;
        if (this.options.captureUnknownResourceFields && /^res:\//.test(String(blackName || ""))) return true;
        if (this.options.captureUnknownWhenNoBlackFields && (!shape?.black || !shape.black.fields || !shape.black.fields.length)) return true;
        return false;
    }

    /** Resolves class against the current Black object-graph reader. */
    ResolveClass(kind)
    {
        const classes = this.options.classes || {};
        const Schema = this.options.registry || CjsSchema;
        return classes[kind] || Schema.GetConstructor(kind);
    }

    /** Clears read state before reusing the current Black object-graph reader. */
    ResetReadState()
    {
        super.ResetBlueReadState();
        this.references = new Map();
        this.nodes = [];
        this.nextNodeId = this.options.firstId || 1;
        this.payloadDepth = 0;
        this.payloadRootFields = null;
    }

    /** Reads string table from the current Black object-graph reader. */
    static readStringTable(reader)
    {
        const stringsReader = reader.ReadBinaryReader(reader.ReadU32());
        const count = stringsReader.ReadU16();
        const strings = [];

        for (let i = 0; i < count; i++)
        {
            strings[i] = stringsReader.ReadCString();
        }

        stringsReader.ExpectEnd("Black string table did not read to end");
        return strings;
    }

    /** Reads wide string table from the current Black object-graph reader. */
    static readWideStringTable(reader)
    {
        const wideStringsReader = reader.ReadBinaryReader(reader.ReadU32());
        const count = wideStringsReader.ReadU16();
        const wideStrings = [];

        for (let i = 0; i < count; i++)
        {
            wideStrings[i] = wideStringsReader.ReadCWString();
        }

        wideStringsReader.ExpectEnd("Black wide string table did not read to end");
        return wideStrings;
    }

    /**
     * Converts indexed key into the canonical Black object-graph reader
     * representation.
     */
    static normalizeIndexedKey(indexToken, field)
    {
        const number = Number(indexToken);
        if (Number.isInteger(number) && String(indexToken).trim() === String(number)) return number;

        let text = String(indexToken || "").trim();
        text = text.replace(/^.*::/, "");
        text = text.replace(/^TYPE_/, "");

        const pascal = text
            .split(/[^A-Za-z0-9]+/)
            .filter(Boolean)
            .map(part => CJS_BLACK_INDEX_TOKEN_NAMES[part] || (part === "FX" ? "FX" : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
            .join("");

        if (field?.jsType?.kind === "objectRef")
        {
            return pascal ? pascal.charAt(0).toLowerCase() + pascal.slice(1) : text;
        }

        return pascal || text;
    }

    /** Parses indexed member from the current Black object-graph reader. */
    static parseIndexedMember(value)
    {
        const match = String(value || "").match(/^(.+)\[([^\]]+)\]$/);
        if (!match) return null;
        return {
            member: match[1],
            indexToken: match[2]
        };
    }

    /** Converts the current Black object-graph reader value to JS field name. */
    static toJsFieldName(value)
    {
        return String(value || "").replace(/^m_/, "");
    }

}

const CJS_BLACK_INDEX_TOKEN_NAMES = Object.freeze({
    SIMPLEPRIMARY: "SimplePrimary"
});
