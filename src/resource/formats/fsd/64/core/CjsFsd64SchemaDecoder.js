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
 * Validates declarative binary schemas and decodes caller-supplied bytes.
 */
export class CjsFsd64SchemaDecoder
{
    /**
     * Validates and returns one inert JSON schema definition.
     */
    static defineSchema(schema)
    {
        ValidateSchema(schema);
        return schema;
    }

    /**
     * Decodes a schema-defined value using the established private reader
     * contract: Maps and numeric identifier values.
     */
    static read(bytes, schema)
    {
        return DecodeRoot(bytes, schema, false);
    }

    /**
     * Decodes a schema-defined value to plain JSON-compatible objects.
     * Identifier keys and values are emitted as lossless decimal strings.
     */
    static readJSON(bytes, schema)
    {
        return DecodeRoot(bytes, schema, true);
    }
}

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

function FormatIdentifier(value, json)
{
    return json ? value.toString(10) : value;
}

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

function DefineValue(target, property, value)
{
    Object.defineProperty(target, property, {
        configurable: true,
        enumerable: true,
        value,
        writable: true,
    });
}

function DuplicateKeyError(key, path)
{
    const error = new Error(`Duplicate FSD map key in ${path}: ${key}`);
    error.code = "CJS_FSD_DUPLICATE_KEY";
    error.key = key;
    error.path = path;
    return error;
}

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

function ResolveFsdType(type)
{
    if (typeof type !== "string" || !Object.hasOwn(CjsFsd64Binary.Type, type))
    {
        throw SchemaError(`Unknown FSD binary type: ${String(type)}`);
    }

    return CjsFsd64Binary.Type[type];
}

function AssertOffset(value, label)
{
    if (!Number.isSafeInteger(value) || value < 0)
    {
        throw SchemaError(`${label} must be a non-negative safe integer.`);
    }
}
function AssertSafeMask(value, label)
{
    if (!Number.isSafeInteger(value) || value < 0)
    {
        throw SchemaError(`${label} must be a non-negative safe-integer mask.`);
    }
}

function IsPlainObject(value)
{
    if (value === null || typeof value !== "object")
    {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function SchemaError(message)
{
    const error = new TypeError(message);
    error.code = "CJS_FSD_BINARY_SCHEMA_INVALID";
    return error;
}

export default CjsFsd64SchemaDecoder;
