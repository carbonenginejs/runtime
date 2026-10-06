import { assertPositiveInteger } from "#utils/validation";
import { AssertFlags, ReadRequiredString } from "./fsd64Records.js";
import { CjsFsd64Binary } from "./CjsFsd64Binary.js";

const SCHEMA_NAME = "carbonenginejs.fsdBinarySchema";
const SCHEMA_VERSION = 1;
const TYPE_SIZES = {
    [CjsFsd64Binary.Type.BOOLEAN]: 1,
    [CjsFsd64Binary.Type.FLOAT_32]: 4,
    [CjsFsd64Binary.Type.FLOAT_64]: 8,
    [CjsFsd64Binary.Type.INT_32]: 4,
    [CjsFsd64Binary.Type.INT_32_IDENTIFIER]: 4,
    [CjsFsd64Binary.Type.LIST]: 8,
    [CjsFsd64Binary.Type.MAP]: 16,
    [CjsFsd64Binary.Type.STRING]: 8,
    [CjsFsd64Binary.Type.UINT_8]: 1,
    [CjsFsd64Binary.Type.UINT_32]: 4,
    [CjsFsd64Binary.Type.UINT_32_IDENTIFIER]: 4,
    [CjsFsd64Binary.Type.UINT_64]: 8,
    [CjsFsd64Binary.Type.UINT_64_IDENTIFIER]: 8,
};

/**
 * One value in a binary schema: a field, a map key or value, a list item or a presence word. The fields
 * beyond `type` and `offset` apply to the types that read them.
 *
 * @typedef {object} CjsFsdValueDescriptor
 * @property {string} type A `CjsFsd64Binary.Type` name.
 * @property {number} [offset] Byte offset inside the containing record.
 * @property {string} [name] Decoded field name, for object fields.
 * @property {string} [sourceName] The client's name for the field.
 * @property {boolean} [renamed] True when `name` deliberately departs from `sourceName`.
 * @property {number} [bit] Bit index, for BOOLEAN.
 * @property {number} [presenceMask] Presence bit that gates the field.
 * @property {number} [allowedMask] Allowed presence bits, for a presence word.
 * @property {number} [itemSize] Element byte size, for LIST.
 * @property {number} [maximumCount] Largest accepted element count, for LIST.
 * @property {CjsFsdValueDescriptor} [item] Element descriptor, for LIST.
 * @property {number} [recordSize] Record byte size, for MAP.
 * @property {number} [recordOffset] Object offset inside each record, for MAP without `value`.
 * @property {CjsFsdValueDescriptor} [key] Key descriptor, for MAP.
 * @property {CjsFsdValueDescriptor} [value] Value descriptor, for MAP of scalars.
 * @property {number} [headerSize] Header byte size, for a root OBJECT.
 * @property {CjsFsdValueDescriptor} [presence] Presence word, for OBJECT records.
 * @property {Array<CjsFsdValueDescriptor>} [fields] Object fields ordered by offset.
 */

/**
 * An inert, JSON-shaped binary layout schema for one FSD dataset.
 *
 * @typedef {object} CjsFsdSchema
 * @property {string} schema Always "carbonenginejs.fsdBinarySchema".
 * @property {number} schemaVersion Always 1.
 * @property {string} path Logical resource path.
 * @property {string} name Dataset name.
 * @property {string} schemaID 32- or 48-character hexadecimal identity.
 * @property {Array<string>} [acceptedSchemaIDs] Further identities measured to share the layout.
 * @property {CjsFsdValueDescriptor} container Root MAP or OBJECT descriptor.
 */

/**
 * Validates declarative binary schemas and decodes caller-supplied bytes.
 */
export class CjsFsd64SchemaDecoder
{
    /**
     * Validates and returns one inert JSON schema definition.
     *
     * @param {CjsFsdSchema} schema Schema to validate.
     * @returns {CjsFsdSchema} The same schema.
     * @throws {TypeError} When the schema is invalid.
     */
    static defineSchema(schema)
    {
        ValidateSchema(schema);
        return schema;
    }

    /**
     * Decodes a schema-defined value using the established private reader
     * contract: Maps and numeric identifier values.
     *
     * @param {ArrayBuffer|ArrayBufferView} bytes Container bytes.
     * @param {CjsFsdSchema} schema Dataset schema.
     * @returns {Map<(number|string), unknown>|Object<string, unknown>} A Map for a root MAP, a plain object for a root OBJECT.
     */
    static read(bytes, schema)
    {
        return DecodeRoot(bytes, schema, false);
    }

    /**
     * Decodes a schema-defined value to plain JSON-compatible objects.
     * Identifier keys and values are emitted as lossless decimal strings.
     *
     * @param {ArrayBuffer|ArrayBufferView} bytes Container bytes.
     * @param {CjsFsdSchema} schema Dataset schema.
     * @returns {Object<string, unknown>} The plain decoded value.
     */
    static readJSON(bytes, schema)
    {
        return DecodeRoot(bytes, schema, true);
    }
}

/**
 * Validates the schema, opens the container and decodes its root MAP or OBJECT.
 *
 * @param {ArrayBuffer|ArrayBufferView} bytes Container bytes.
 * @param {CjsFsdSchema} schema Dataset schema.
 * @param {boolean} json True for plain objects and decimal-string identifiers.
 * @returns {Map<(number|string), unknown>|Object<string, unknown>} The decoded root.
 */
function DecodeRoot(bytes, schema, json)
{
    ValidateSchema(schema);

    const binary = new CjsFsd64Binary(bytes, {
        path: schema.path,
        schemaID: [ schema.schemaID, ...(schema.acceptedSchemaIDs ?? []) ],
    });
    const containerOffset = binary.RootOffset + (schema.container.offset ?? 0);

    // A root OBJECT is how a dataset that publishes several independent maps is
    // described, such as audio metadata's events, sound banks and WEM files.
    return ResolveFsdType(schema.container.type) === CjsFsd64Binary.Type.OBJECT
        ? DecodeObject(binary, containerOffset, schema.container, json, schema.path)
        : DecodeMap(binary, containerOffset, schema.container, json, schema.path);
}

/**
 * Decodes one schema value at a record offset.
 *
 * @param {import("./CjsFsd64Binary.js").CjsFsd64Binary} binary Container view.
 * @param {number} baseOffset Absolute offset of the containing record.
 * @param {CjsFsdValueDescriptor} descriptor Value descriptor.
 * @param {boolean} json True for plain objects and decimal-string identifiers.
 * @param {string} path Logical resource path, for errors.
 * @param {string} field Field label, for errors.
 * @returns {unknown} The decoded value.
 * @throws {TypeError} When the descriptor type is unsupported.
 */
function DecodeValue(binary, baseOffset, descriptor, json, path, field)
{
    const type = ResolveFsdType(descriptor.type);
    const offset = baseOffset + (descriptor.offset ?? 0);

    switch (type)
    {
        case CjsFsd64Binary.Type.BOOLEAN:
            return (binary.Byte(offset) & (1 << (descriptor.bit ?? 0))) !== 0;

        case CjsFsd64Binary.Type.FLOAT_32:
            return binary.Float32(offset);

        case CjsFsd64Binary.Type.FLOAT_64:
            return binary.Float64(offset);

        case CjsFsd64Binary.Type.INT_32:
            return binary.Int32(offset);

        case CjsFsd64Binary.Type.INT_32_IDENTIFIER:
            return FormatIdentifier(binary.Int32(offset), json);

        case CjsFsd64Binary.Type.LIST:
            return DecodeList(binary, offset, descriptor, json, path, field);

        case CjsFsd64Binary.Type.MAP:
            return DecodeMap(binary, offset, descriptor, json, path);

        case CjsFsd64Binary.Type.OBJECT:
            return DecodeObject(binary, offset, descriptor, json, path);

        case CjsFsd64Binary.Type.STRING:
            return ReadRequiredString(binary, offset, path, field);

        case CjsFsd64Binary.Type.UINT_8:
            return binary.Byte(offset);

        case CjsFsd64Binary.Type.UINT_32:
            return binary.Uint32(offset);

        case CjsFsd64Binary.Type.UINT_32_IDENTIFIER:
            return FormatIdentifier(binary.Uint32(offset), json);

        case CjsFsd64Binary.Type.UINT_64:
            return binary.Uint64(offset);

        case CjsFsd64Binary.Type.UINT_64_IDENTIFIER:
            return json ? binary.Uint64Identity(offset) : binary.Uint64(offset);

        default:
            throw SchemaError(`Unsupported FSD binary type: ${descriptor.type}`);
    }
}

/**
 * Decodes the present fields of one object record.
 *
 * @param {import("./CjsFsd64Binary.js").CjsFsd64Binary} binary Container view.
 * @param {number} baseOffset Absolute offset of the record.
 * @param {CjsFsdValueDescriptor} descriptor Object descriptor.
 * @param {boolean} json True for plain objects and decimal-string identifiers.
 * @param {string} path Logical resource path, for errors.
 * @returns {Object<string, unknown>} The decoded fields.
 */
function DecodeObject(binary, baseOffset, descriptor, json, path)
{
    const flags = descriptor.presence
        ? DecodeValue(binary, baseOffset, descriptor.presence, false, path, "<presence>")
        : 0;

    if (descriptor.presence)
    {
        AssertFlags(flags, descriptor.presence.allowedMask, path);
    }

    const value = {};

    for (const field of descriptor.fields)
    {
        if (field.presenceMask !== undefined && (flags & field.presenceMask) === 0)
        {
            continue;
        }

        DefineValue(value, field.name, DecodeValue(
            binary,
            baseOffset,
            field,
            json,
            path,
            field.name,
        ));
    }

    return value;
}

/**
 * Decodes a count-prefixed list through its pointer.
 *
 * @param {import("./CjsFsd64Binary.js").CjsFsd64Binary} binary Container view.
 * @param {number} pointerOffset Absolute offset of the list pointer.
 * @param {CjsFsdValueDescriptor} descriptor LIST descriptor.
 * @param {boolean} json True for plain objects and decimal-string identifiers.
 * @param {string} path Logical resource path, for errors.
 * @param {string} field Field label, for errors.
 * @returns {Array<unknown>} The decoded items.
 */
function DecodeList(binary, pointerOffset, descriptor, json, path, field)
{
    const relativeOffset = binary.Uint64(pointerOffset);
    const offsets = binary.ListEntries(
        relativeOffset,
        descriptor.itemSize,
        descriptor.maximumCount ?? Number.MAX_SAFE_INTEGER,
    );

    return offsets.map(offset => DecodeValue(
        binary,
        offset,
        descriptor.item,
        json,
        path,
        `${field}[]`,
    ));
}

/**
 * Decodes every record of a hash-map.
 *
 * @param {import("./CjsFsd64Binary.js").CjsFsd64Binary} binary Container view.
 * @param {number} headerOffset Absolute offset of the map header.
 * @param {CjsFsdValueDescriptor} descriptor MAP descriptor.
 * @param {boolean} json True for a key-sorted plain object, false for a Map.
 * @param {string} path Logical resource path, for errors.
 * @returns {Map<(number|string), unknown>|Object<string, unknown>} The decoded entries.
 */
function DecodeMap(binary, headerOffset, descriptor, json, path)
{
    const entries = [];

    for (const recordOffset of binary.MapEntries(descriptor.recordSize, headerOffset))
    {
        const key = DecodeValue(binary, recordOffset, descriptor.key, json, path, "<key>");
        const value = descriptor.value
            ? DecodeValue(binary, recordOffset, descriptor.value, json, path, "<value>")
            : DecodeObject(
                binary,
                recordOffset + (descriptor.recordOffset ?? 0),
                descriptor,
                json,
                path,
            );
        entries.push([ key, value ]);
    }

    return json
        ? CreateJSONObject(entries, path, descriptor.key.type)
        : CreateMap(entries, path);
}

/**
 * Returns an identifier as a decimal string in JSON mode.
 *
 * @param {number} value Identifier value.
 * @param {boolean} json True for a decimal string.
 * @returns {number|string} The identifier.
 */
function FormatIdentifier(value, json)
{
    return json ? value.toString(10) : value;
}

/**
 * Builds a Map, rejecting duplicate keys.
 *
 * @param {Array<[unknown, unknown]>} entries Key/value pairs.
 * @param {string} path Logical resource path, for errors.
 * @returns {Map<unknown, unknown>} The map.
 * @throws {Error} When a key repeats.
 */
function CreateMap(entries, path)
{
    const result = new Map();

    for (const [ key, value ] of entries)
    {
        if (result.has(key))
        {
            throw DuplicateKeyError(key, path);
        }

        result.set(key, value);
    }

    return result;
}

/**
 * Builds a key-sorted plain object, rejecting duplicate keys.
 *
 * @param {Array<[unknown, unknown]>} entries Key/value pairs; sorted in place.
 * @param {string} path Logical resource path, for errors.
 * @param {string} keyType Key descriptor type, which selects integer or string ordering.
 * @returns {Object<string, unknown>} The object.
 * @throws {Error} When a key repeats.
 */
function CreateJSONObject(entries, path, keyType)
{
    entries.sort(([ left ], [ right ]) => CompareKeys(left, right, keyType));
    const result = {};

    for (const [ key, value ] of entries)
    {
        const property = String(key);

        if (Object.hasOwn(result, property))
        {
            throw DuplicateKeyError(property, path);
        }

        DefineValue(result, property, value);
    }

    return result;
}

/**
 * Orders two map keys numerically for integer key types and as strings otherwise.
 *
 * @param {number|string} left First key.
 * @param {number|string} right Second key.
 * @param {string} type Key descriptor type.
 * @returns {number} -1, 0 or 1.
 */
function CompareKeys(left, right, type)
{
    if (IsIntegerType(type))
    {
        const leftValue = BigInt(left);
        const rightValue = BigInt(right);
        return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
    }

    const leftValue = String(left);
    const rightValue = String(right);
    return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
}

/**
 * Reports whether a binary type decodes to an integer.
 *
 * @param {string} type Binary type name.
 * @returns {boolean} True for integer and identifier types.
 */
function IsIntegerType(type)
{
    return type === CjsFsd64Binary.Type.INT_32 ||
        type === CjsFsd64Binary.Type.INT_32_IDENTIFIER ||
        type === CjsFsd64Binary.Type.UINT_8 ||
        type === CjsFsd64Binary.Type.UINT_32 ||
        type === CjsFsd64Binary.Type.UINT_32_IDENTIFIER ||
        type === CjsFsd64Binary.Type.UINT_64 ||
        type === CjsFsd64Binary.Type.UINT_64_IDENTIFIER;
}

/**
 * Defines an enumerable data property, including names such as __proto__.
 *
 * @param {object} target Object to write.
 * @param {string} property Property name.
 * @param {unknown} value Value to store.
 */
function DefineValue(target, property, value)
{
    Object.defineProperty(target, property, {
        configurable: true,
        enumerable: true,
        value,
        writable: true,
    });
}

/**
 * Creates the duplicate-map-key error.
 *
 * @param {unknown} key Repeated key.
 * @param {string} path Logical resource path.
 * @returns {Error} The error, with `code` "CJS_FSD_DUPLICATE_KEY".
 */
function DuplicateKeyError(key, path)
{
    const error = new Error(`Duplicate FSD map key in ${path}: ${key}`);
    error.code = "CJS_FSD_DUPLICATE_KEY";
    error.key = key;
    error.path = path;
    return error;
}

/**
 * Validates a schema's header, identities and root descriptor.
 *
 * @param {CjsFsdSchema} schema Schema to validate.
 * @throws {TypeError} When the schema is invalid.
 */
function ValidateSchema(schema)
{
    if (!IsPlainObject(schema) || schema.schema !== SCHEMA_NAME ||
        schema.schemaVersion !== SCHEMA_VERSION)
    {
        throw SchemaError(
            `FSD binary schema must be ${SCHEMA_NAME} version ${SCHEMA_VERSION}.`,
        );
    }

    if (typeof schema.path !== "string" || schema.path.trim() === "")
    {
        throw SchemaError("FSD binary schema path must be a non-empty string.");
    }

    if (typeof schema.name !== "string" || schema.name.trim() === "")
    {
        throw SchemaError("FSD binary schema name must be a non-empty string.");
    }

    // 32 characters pin the layout alone, which survives a content change and
    // another publisher's build; 48 additionally pin one build's content digest.
    if (typeof schema.schemaID !== "string" || !/^(?:[0-9a-f]{32}|[0-9a-f]{48})$/iu.test(schema.schemaID))
    {
        throw SchemaError("FSD binary schema identity must contain 32 or 48 hexadecimal characters.");
    }

    // A schema identity is not a hash of the byte layout alone, so one layout
    // can carry two of them across publishers. Additional identities are
    // accepted only where the layout was measured to be the same.
    if (schema.acceptedSchemaIDs !== undefined)
    {
        if (!Array.isArray(schema.acceptedSchemaIDs) ||
            schema.acceptedSchemaIDs.some(value =>
                typeof value !== "string" || !/^(?:[0-9a-f]{32}|[0-9a-f]{48})$/iu.test(value)))
        {
            throw SchemaError(
                "FSD binary accepted schema identities must be 32 or 48 hexadecimal characters each.",
            );
        }
    }

    if (!IsPlainObject(schema.container))
    {
        throw SchemaError("FSD binary schema root must be a MAP or an OBJECT.");
    }

    const rootType = ResolveFsdType(schema.container.type);

    if (rootType !== CjsFsd64Binary.Type.MAP && rootType !== CjsFsd64Binary.Type.OBJECT)
    {
        throw SchemaError("FSD binary schema root must be a MAP or an OBJECT.");
    }

    AssertOffset(schema.container.offset ?? 0, "container.offset");

    if (rootType === CjsFsd64Binary.Type.OBJECT)
    {
        assertPositiveInteger(schema.container.headerSize, "container.headerSize");
        ValidateObjectDescriptor(schema.container, schema.container.headerSize, "container");

        return;
    }

    ValidateMapDescriptor(schema.container, "container");
}

/**
 * Validates a MAP descriptor's record size, key and value or object record.
 *
 * @param {CjsFsdValueDescriptor} descriptor MAP descriptor.
 * @param {string} label Schema location, for errors.
 * @throws {TypeError} When the descriptor is invalid.
 */
function ValidateMapDescriptor(descriptor, label)
{
    assertPositiveInteger(descriptor.recordSize, `${label}.recordSize`);
    ValidateValueDescriptor(descriptor.key, descriptor.recordSize, `${label}.key`);

    if (descriptor.value !== undefined)
    {
        if (descriptor.fields !== undefined || descriptor.presence !== undefined ||
            descriptor.recordOffset !== undefined)
        {
            throw SchemaError(`${label} cannot combine value with object record metadata.`);
        }

        ValidateValueDescriptor(descriptor.value, descriptor.recordSize, `${label}.value`);
        return;
    }

    const recordOffset = descriptor.recordOffset ?? 0;
    AssertOffset(recordOffset, `${label}.recordOffset`);

    if (recordOffset > descriptor.recordSize)
    {
        throw SchemaError(`${label}.recordOffset exceeds the record size.`);
    }

    ValidateObjectDescriptor(
        descriptor,
        descriptor.recordSize - recordOffset,
        label,
    );
}

/**
 * Validates an object descriptor's presence word and ordered, unique fields.
 *
 * @param {CjsFsdValueDescriptor} descriptor Object descriptor.
 * @param {number} availableSize Bytes available to the object.
 * @param {string} label Schema location, for errors.
 * @throws {TypeError} When the descriptor is invalid.
 */
function ValidateObjectDescriptor(descriptor, availableSize, label)
{
    if (!Array.isArray(descriptor.fields))
    {
        throw SchemaError(`${label}.fields must be an array.`);
    }

    if (descriptor.presence !== undefined)
    {
        ValidateValueDescriptor(descriptor.presence, availableSize, `${label}.presence`);
        const presenceType = ResolveFsdType(descriptor.presence.type);

        if (presenceType !== CjsFsd64Binary.Type.UINT_32 &&
            presenceType !== CjsFsd64Binary.Type.UINT_64)
        {
            throw SchemaError(`${label}.presence must use UINT_32 or UINT_64.`);
        }

        AssertSafeMask(descriptor.presence.allowedMask, `${label}.presence.allowedMask`);
    }

    const names = new Set();
    let previousOffset = -1;

    for (let index = 0; index < descriptor.fields.length; index++)
    {
        const field = descriptor.fields[index];
        const fieldLabel = `${label}.fields[${index}]`;
        ValidateValueDescriptor(field, availableSize, fieldLabel);

        const offset = field.offset ?? 0;

        if (offset < previousOffset)
        {
            throw SchemaError(`${label}.fields must be ordered by byte offset.`);
        }

        previousOffset = offset;

        if (typeof field.name !== "string" || field.name === "")
        {
            throw SchemaError(`${fieldLabel}.name must be a non-empty string.`);
        }

        if (names.has(field.name))
        {
            throw SchemaError(`FSD binary schema field is duplicated: ${field.name}`);
        }

        names.add(field.name);
        ValidateSourceName(field, fieldLabel);
        ValidatePresenceMask(field, descriptor.presence, fieldLabel);
    }
}

/**
 * Converts a client field name to the name the export publishes.
 *
 * The newer datasets name fields in snake_case and CCP's exporter camelCases
 * them, with one wrinkle worth writing down rather than remembering: a trailing
 * `id` segment becomes `ID`, so `type_id` is published as `typeID` and not
 * `typeId`. That rule was applied by hand across the SKINR schemas before it
 * was written anywhere, and by hand it was applied inconsistently.
 *
 * @param {string} sourceName Field name as the client stores it.
 * @returns {string} Field name as the export publishes it.
 */
export function CamelizeFieldName(sourceName)
{
    return String(sourceName)
        .split("_")
        .map((segment, index) =>
        {
            if (segment.toLowerCase() === "id") return "ID";

            return index === 0 ? segment : segment.charAt(0).toUpperCase() + segment.slice(1);
        })
        .join("");
}

/**
 * Checks a field's name against the client's own name for it.
 *
 * A schema may record `sourceName`, the name the loader gives the field. When
 * it does, the decoded name must be the mechanical conversion of it - which is
 * what makes the conversion checkable rather than a transcription nobody can
 * audit. A field that departs deliberately, such as a label identifier the
 * export republishes as resolved text, declares `renamed: true` and says why in
 * the reader.
 *
 * @param {CjsFsdValueDescriptor} descriptor Field descriptor.
 * @param {string} label Schema location, for errors.
 * @throws {TypeError} When sourceName is invalid or does not convert to the field name.
 */
function ValidateSourceName(descriptor, label)
{
    if (descriptor.sourceName === undefined) return;

    if (typeof descriptor.sourceName !== "string" || descriptor.sourceName === "")
    {
        throw SchemaError(`${label}.sourceName must be a non-empty string.`);
    }

    if (descriptor.renamed === true) return;

    const expected = CamelizeFieldName(descriptor.sourceName);

    if (descriptor.name !== expected)
    {
        throw SchemaError(
            `${label} is named ${descriptor.name} but its source ${descriptor.sourceName} `
            + `converts to ${expected}. Set renamed: true if the departure is deliberate.`,
        );
    }
}

/**
 * Validates one value descriptor against the bytes available to it.
 *
 * @param {CjsFsdValueDescriptor} descriptor Value descriptor.
 * @param {number} availableSize Bytes available in the containing record.
 * @param {string} label Schema location, for errors.
 * @throws {TypeError} When the descriptor is invalid.
 */
function ValidateValueDescriptor(descriptor, availableSize, label)
{
    if (!IsPlainObject(descriptor))
    {
        throw SchemaError(`${label} must be an object.`);
    }

    const type = ResolveFsdType(descriptor.type);

    if (type === CjsFsd64Binary.Type.OBJECT)
    {
        const offset = descriptor.offset ?? 0;
        AssertOffset(offset, `${label}.offset`);

        if (offset > availableSize)
        {
            throw SchemaError(`${label}.offset exceeds its containing record.`);
        }

        ValidateObjectDescriptor(descriptor, availableSize - offset, label);
        return;
    }

    AssertOffset(descriptor.offset, `${label}.offset`);

    if (descriptor.offset + TYPE_SIZES[type] > availableSize)
    {
        throw SchemaError(`${label} exceeds its ${availableSize}-byte record.`);
    }

    if (type === CjsFsd64Binary.Type.LIST)
    {
        assertPositiveInteger(descriptor.itemSize, `${label}.itemSize`);

        if (descriptor.maximumCount !== undefined)
        {
            assertPositiveInteger(descriptor.maximumCount, `${label}.maximumCount`);
        }

        ValidateValueDescriptor(descriptor.item, descriptor.itemSize, `${label}.item`);
    }
    else if (type === CjsFsd64Binary.Type.MAP)
    {
        ValidateMapDescriptor(descriptor, label);
    }
}

/**
 * Validates a field's single-bit presence mask against the record's allowed mask.
 *
 * @param {CjsFsdValueDescriptor} field Field descriptor.
 * @param {CjsFsdValueDescriptor|undefined} presence Record presence word.
 * @param {string} label Schema location, for errors.
 * @throws {TypeError} When the mask is invalid.
 */
function ValidatePresenceMask(field, presence, label)
{
    if (field.presenceMask === undefined)
    {
        return;
    }

    if (!presence)
    {
        throw SchemaError(`${label}.presenceMask requires record presence metadata.`);
    }

    AssertSafeMask(field.presenceMask, `${label}.presenceMask`);

    if (field.presenceMask === 0 ||
        !Number.isInteger(Math.log2(field.presenceMask)))
    {
        throw SchemaError(`${label}.presenceMask must contain exactly one bit.`);
    }

    if ((field.presenceMask & presence.allowedMask) === 0)
    {
        throw SchemaError(`${label}.presenceMask is outside the allowed presence mask.`);
    }
}

/**
 * Resolves a schema type name through `CjsFsd64Binary.Type`.
 *
 * @param {unknown} type Type name.
 * @returns {string} The binary type.
 * @throws {TypeError} When the name is unknown.
 */
function ResolveFsdType(type)
{
    if (typeof type !== "string" || !Object.hasOwn(CjsFsd64Binary.Type, type))
    {
        throw SchemaError(`Unknown FSD binary type: ${String(type)}`);
    }

    return CjsFsd64Binary.Type[type];
}

/**
 * Rejects an offset that is not a non-negative safe integer.
 *
 * @param {unknown} value Offset.
 * @param {string} label Schema location, for errors.
 * @throws {TypeError} When the offset is invalid.
 */
function AssertOffset(value, label)
{
    if (!Number.isSafeInteger(value) || value < 0)
    {
        throw SchemaError(`${label} must be a non-negative safe integer.`);
    }
}
/**
 * Rejects a mask that is not a non-negative safe integer.
 *
 * @param {unknown} value Mask.
 * @param {string} label Schema location, for errors.
 * @throws {TypeError} When the mask is invalid.
 */
function AssertSafeMask(value, label)
{
    if (!Number.isSafeInteger(value) || value < 0)
    {
        throw SchemaError(`${label} must be a non-negative safe-integer mask.`);
    }
}

/**
 * Reports whether a value is a plain object.
 *
 * @param {unknown} value Value to test.
 * @returns {boolean} True when the prototype is Object.prototype or null.
 */
function IsPlainObject(value)
{
    if (value === null || typeof value !== "object")
    {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

/**
 * Creates a schema validation error.
 *
 * @param {string} message Error message.
 * @returns {TypeError} The error, with `code` "CJS_FSD_BINARY_SCHEMA_INVALID".
 */
function SchemaError(message)
{
    const error = new TypeError(message);
    error.code = "CJS_FSD_BINARY_SCHEMA_INVALID";
    return error;
}

export default CjsFsd64SchemaDecoder;
