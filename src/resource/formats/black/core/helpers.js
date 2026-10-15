import { toJsonAcyclic } from "../../../format/jsonPolicies.js";

export const OUTPUT_JSON = "json";
export const OUTPUT_PAYLOAD = "payload";
export const OUTPUT_RUNTIME = "runtime";

export const DEFAULT_VALUES = {
    emit: OUTPUT_JSON,
    schema: null,
    registry: null,
    sourceShapes: null,
    metadata: null,
    includeMetadata: false,
    trace: false,
    debug: false,
    captureUnknownBlackFields: false,
    captureUnknownResourceFields: false,
    captureUnknownWhenNoBlackFields: false,
    allowUnknownStringFallback: false,
    rootFields: null,
    payloadRootFields: null,
    payloadTypeField: "_type",
    payloadIdField: "_id",
    payloadReferenceField: "_ref",
    pathHandler: null,
    adapter: null,
    classes: {}
};

/**
 * Black source accepted by the reader: raw bytes, a view over them, or an
 * existing bounded cursor.
 *
 * @typedef {ArrayBuffer|ArrayBufferView|import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} BlackInput
 */

/**
 * Normalized Black reader values, as `DEFAULT_VALUES` and `normalizeValues`
 * produce them.
 *
 * @typedef {object} BlackReaderValues
 * @property {string} emit Output to emit: "json", "payload" or "runtime".
 * @property {object|null} schema Source-shape schema, or null to use canonical class declarations.
 * @property {object|null} registry Class registry with `getConstructor`, and optionally `GetSourceShape`.
 * @property {Map<string, object>|object|null} sourceShapes Source shapes by class name, or a provider with `GetSourceShape`.
 * @property {object|null} metadata Caller metadata merged into payload metadata.
 * @property {boolean} includeMetadata Whether payload output carries Black metadata.
 * @property {boolean} trace Enables every include option.
 * @property {boolean} debug Enables every include option.
 * @property {boolean} captureUnknownBlackFields Whether unknown Black fields are captured instead of rejected.
 * @property {boolean} captureUnknownResourceFields Whether unknown fields named like `res:/` paths are captured.
 * @property {boolean} captureUnknownWhenNoBlackFields Whether unknown fields are captured for shapes without Black fields.
 * @property {boolean} allowUnknownStringFallback Whether unknown fields try string decoding first.
 * @property {string|string[]|null} rootFields Root fields kept by payload reads.
 * @property {string|string[]|null} payloadRootFields Root fields kept by payload reads; wins over `rootFields`.
 * @property {string} payloadTypeField Payload field that names the class.
 * @property {string} payloadIdField Payload field that carries a reference id.
 * @property {string} payloadReferenceField Payload field that refers to a reference id.
 * @property {Function|null} pathHandler Transform applied to decoded resource paths.
 * @property {object|null} adapter Legacy hydration adapter.
 * @property {Object<string, Function>} classes Runtime class constructors by Black class name.
 */

/**
 * Header and string tables returned by `CjsBlackReader.Inspect`.
 *
 * @typedef {object} BlackInspection
 * @property {{id: string, version: number}} format Format id and Black version.
 * @property {number} byteLength Total byte length of the source.
 * @property {number} dataOffset Byte offset of the root object, after the string tables.
 * @property {string[]} strings Narrow string table.
 * @property {string[]} wideStrings Wide string table.
 */

/**
 * Public payload returned by `CjsBlackReader.ReadPayload`.
 *
 * @typedef {object} BlackPayload
 * @property {object[]} comments Reader reports.
 * @property {object} object Root payload object.
 * @property {object|null} [metadata] Black metadata, when requested.
 */

/**
 * Runtime result returned by `CjsBlackReader.ReadRuntime`.
 *
 * @typedef {object} BlackRuntimeResult
 * @property {object} root Root runtime object.
 * @property {{id: string, version: number}} format Format id and Black version.
 * @property {object[]} reports Reader reports.
 */

/**
 * Native structure layout of a StructureList item class, with its class
 * defaults, as `structClassLayout` returns it.
 *
 * @typedef {object} BlackStructureLayout
 * @property {string} name Structure name.
 * @property {number} size Record byte size.
 * @property {Array<{name: string, offset: number, type: string}>} members Members with their byte offsets.
 * @property {number[]} [boundaries] Member end offsets accepted as earlier record sizes.
 */

/**
 * Black wire description of one field: its Black type and container plus the
 * names it is persisted under.
 *
 * @typedef {object} BlackWireField
 * @property {string|null} beType Black wire type, such as "IROOT", "FLOAT" or "BINARYBLOCK".
 * @property {string|null} [wireType] Short wire-type code.
 * @property {string} [container] "list", "set" or "dict" for IROOT containers.
 * @property {string|null} [cppType] C++ type name; "StructureList" marks raw structure lists.
 * @property {BlackStructureLayout} [structure] Item layout of a structure list.
 * @property {boolean} [signed] Whether BYTE and SHORT values are signed.
 * @property {number} [length] Float count of a FLOATARRAY.
 * @property {string|null} [name] Black field name.
 * @property {string|null} [fieldName] JS field the value stores into.
 * @property {string|null} [cppName] C++ member name.
 * @property {string} [member] Member name.
 * @property {string|null} [memberPath] Member path.
 * @property {string|null} [memberRoot] Member root.
 * @property {string|null} [indexToken] Index token of an indexed member.
 * @property {string|number} [indexKey] Explicit storage index.
 */

/**
 * One schema field of a source shape.
 *
 * @typedef {object} BlackSourceField
 * @property {string} name JS field name.
 * @property {string} [key] Stored key of a canonical declaration.
 * @property {string|null} [cppName] C++ member name.
 * @property {string|null} [cppType] C++ type name.
 * @property {object} [jsType] Carbon type descriptor of the value.
 * @property {BlackWireField} [black] Black wire description.
 * @property {object} [declaration] Canonical stored declaration.
 */

/**
 * Reader-local class shape that resolves Black field names.
 *
 * @typedef {object} BlackSourceShape
 * @property {string} className Black class name.
 * @property {boolean} [canonical] Whether the shape comes from canonical class declarations.
 * @property {string|null} [family] Schema family.
 * @property {BlackSourceField[]} fields Schema fields.
 * @property {{className: string, fields: BlackWireField[]}} [black] Black field descriptions.
 */

/**
 * Resolution of one Black field name against a source shape.
 *
 * @typedef {object} BlackFieldTarget
 * @property {string} blackName Field name read from the stream.
 * @property {string} wireName Field name read from the stream.
 * @property {BlackSourceField} field Schema field the value belongs to.
 * @property {string} member Member name.
 * @property {boolean} indexed Whether the value stores into one index of the field.
 * @property {string|null} indexToken Index token of an indexed member.
 * @property {number|null} index Integer storage index, when the key is an integer.
 * @property {string|number|null} key Storage key.
 * @property {boolean} [unknown] Whether the field is not in the shape.
 * @property {boolean} [discard] Whether the value is read and dropped.
 */

/**
 * Black type pair produced by the compact schema helpers.
 *
 * @typedef {object} BlackCompactType
 * @property {object} jsType Carbon type descriptor.
 * @property {BlackWireField} black Black wire description.
 */

const OPTION_KEYS = new Set(Object.keys(DEFAULT_VALUES));


/**
 * Validates an `emit` option value.
 *
 * @param {string|undefined} emit Requested output.
 * @param {string} readerName Reader name used in errors.
 * @returns {string} The output constant.
 * @throws {Error} When the value is not a known output.
 */
function normalizeEmit(emit, readerName)
{
    if (emit === undefined || emit === OUTPUT_JSON) return OUTPUT_JSON;
    if (emit === OUTPUT_PAYLOAD) return OUTPUT_PAYLOAD;
    if (emit === OUTPUT_RUNTIME) return OUTPUT_RUNTIME;
    throw new Error(`${readerName} unknown emit value "${emit}"`);
}

/**
 * Rejects any option key that `DEFAULT_VALUES` does not declare.
 *
 * @param {object} options Caller options.
 * @param {string} readerName Reader name used in errors.
 * @throws {TypeError} When an option key is unknown.
 */
function assertKnownOptions(options, readerName)
{
    for (const key of Object.keys(options))
    {
        if (!OPTION_KEYS.has(key))
        {
            throw new TypeError(`${readerName} unknown option "${key}"`);
        }
    }
}

/**
 * Returns the class map of a values record, or an empty map.
 *
 * @param {BlackReaderValues|null|undefined} values Reader values.
 * @returns {Object<string, Function>} Constructors by Black class name.
 */
function classMap(values)
{
    return values && values.classes ? values.classes : {};
}

/**
 * Copies a values record, filling absent entries with their defaults.
 *
 * @param {BlackReaderValues} values Reader values to copy.
 * @returns {BlackReaderValues} A new values record.
 */
function cloneValues(values)
{
    return {
        emit: values.emit,
        schema: values.schema ?? null,
        registry: values.registry ?? null,
        sourceShapes: values.sourceShapes ?? null,
        metadata: values.metadata ?? null,
        includeMetadata: Boolean(values.includeMetadata),
        trace: Boolean(values.trace),
        debug: Boolean(values.debug),
        captureUnknownBlackFields: Boolean(values.captureUnknownBlackFields),
        captureUnknownResourceFields: Boolean(values.captureUnknownResourceFields),
        captureUnknownWhenNoBlackFields: Boolean(values.captureUnknownWhenNoBlackFields),
        allowUnknownStringFallback: Boolean(values.allowUnknownStringFallback),
        rootFields: cloneListOrValue(values.rootFields),
        payloadRootFields: cloneListOrValue(values.payloadRootFields),
        payloadTypeField: values.payloadTypeField,
        payloadIdField: values.payloadIdField,
        payloadReferenceField: values.payloadReferenceField,
        pathHandler: values.pathHandler ?? null,
        adapter: values.adapter ?? null,
        classes: { ...classMap(values) }
    };
}

/**
 * Copies an array, or returns a single value or null unchanged.
 *
 * @param {string|string[]|null|undefined} value Field list option.
 * @returns {string|string[]|null} A copy of the array, the value, or null.
 */
function cloneListOrValue(value)
{
    return Array.isArray(value) ? value.slice() : value ?? null;
}

/**
 * Validates a requested runtime class key for the Black object-graph reader.
 *
 * @param {readonly string[]} classKeys Node class keys of the format; not read.
 * @param {string} key Black class name.
 * @param {string} readerName Reader name used in errors.
 * @throws {Error} When the key is not a non-empty string.
 */
export function validateClassKey(classKeys, key, readerName)
{
    if (typeof key !== "string" || !key)
    {
        throw new Error(`${readerName} class type must be a non-empty string`);
    }
}

/**
 * Validates a resolved runtime class constructor for the Black object-graph
 * reader.
 *
 * @param {readonly string[]} classKeys Node class keys of the format.
 * @param {string} type Black class name.
 * @param {Function} Class Constructor to register.
 * @param {string} readerName Reader name used in errors.
 * @throws {TypeError} When `Class` is not a function.
 */
export function validateClass(classKeys, type, Class, readerName)
{
    validateClassKey(classKeys, type, readerName);
    if (typeof Class !== "function")
    {
        throw new TypeError(`${readerName} class "${type}" must be a constructor`);
    }
}

/**
 * Merges validated class constructors into a values record's class map.
 *
 * @param {BlackReaderValues} values Values record to update.
 * @param {Object<string, Function>} classes Constructors by Black class name.
 * @param {readonly string[]} classKeys Node class keys of the format.
 * @param {string} readerName Reader name used in errors.
 * @throws {TypeError} When `classes` is not an object.
 */
function mergeClasses(values, classes, classKeys, readerName)
{
    if (!classes || typeof classes !== "object")
    {
        throw new TypeError(`${readerName} classes option must be an object`);
    }

    const next = { ...values.classes };
    for (const [ type, Class ] of Object.entries(classes))
    {
        validateClass(classKeys, type, Class, readerName);
        next[type] = Class;
    }
    values.classes = next;
}

/**
 * Normalizes reader options against their supported defaults for the Black
 * object-graph reader.
 *
 * @param {BlackReaderValues} base Values the options are applied over.
 * @param {Partial<BlackReaderValues>} options Option overrides; only known keys are accepted.
 * @param {readonly string[]} classKeys Node class keys of the format.
 * @param {string} readerName Reader name used in errors.
 * @returns {BlackReaderValues} A new values record.
 * @throws {TypeError} When `options` is not an object, or a `pathHandler` is not a function.
 */
export function normalizeValues(base, options, classKeys, readerName)
{
    if (!options || typeof options !== "object")
    {
        throw new TypeError(`${readerName} options must be an object`);
    }

    assertKnownOptions(options, readerName);

    const values = cloneValues(base);
    if (Object.hasOwn(options, "emit")) values.emit = normalizeEmit(options.emit, readerName);
    if (Object.hasOwn(options, "schema")) values.schema = options.schema ?? null;
    if (Object.hasOwn(options, "registry")) values.registry = options.registry ?? null;
    if (Object.hasOwn(options, "sourceShapes")) values.sourceShapes = options.sourceShapes ?? null;
    if (Object.hasOwn(options, "metadata")) values.metadata = options.metadata ?? null;
    if (Object.hasOwn(options, "includeMetadata")) values.includeMetadata = Boolean(options.includeMetadata);
    if (Object.hasOwn(options, "trace")) values.trace = Boolean(options.trace);
    if (Object.hasOwn(options, "debug")) values.debug = Boolean(options.debug);
    if (Object.hasOwn(options, "captureUnknownBlackFields")) values.captureUnknownBlackFields = Boolean(options.captureUnknownBlackFields);
    if (Object.hasOwn(options, "captureUnknownResourceFields")) values.captureUnknownResourceFields = Boolean(options.captureUnknownResourceFields);
    if (Object.hasOwn(options, "captureUnknownWhenNoBlackFields")) values.captureUnknownWhenNoBlackFields = Boolean(options.captureUnknownWhenNoBlackFields);
    if (Object.hasOwn(options, "allowUnknownStringFallback")) values.allowUnknownStringFallback = Boolean(options.allowUnknownStringFallback);
    if (Object.hasOwn(options, "rootFields")) values.rootFields = cloneListOrValue(options.rootFields);
    if (Object.hasOwn(options, "payloadRootFields")) values.payloadRootFields = cloneListOrValue(options.payloadRootFields);
    if (Object.hasOwn(options, "payloadTypeField")) values.payloadTypeField = options.payloadTypeField;
    if (Object.hasOwn(options, "payloadIdField")) values.payloadIdField = options.payloadIdField;
    if (Object.hasOwn(options, "payloadReferenceField")) values.payloadReferenceField = options.payloadReferenceField;
    if (Object.hasOwn(options, "adapter")) values.adapter = options.adapter ?? null;
    if (Object.hasOwn(options, "pathHandler"))
    {
        if (options.pathHandler !== null && options.pathHandler !== undefined && typeof options.pathHandler !== "function")
        {
            throw new TypeError(`${readerName} pathHandler option must be a function`);
        }
        values.pathHandler = options.pathHandler ?? null;
    }
    if (Object.hasOwn(options, "classes")) mergeClasses(values, options.classes, classKeys, readerName);
    return values;
}

/**
 * Throws a format error for a reader operation that is intentionally unavailable
 * for the Black object-graph reader.
 *
 * @param {string} readerName Reader name used in the message.
 * @param {string} methodName Unavailable method name.
 * @returns {Error} The error, for the caller to throw.
 */
export function notImplemented(readerName, methodName)
{
    return new Error(`${readerName}.${methodName} is not implemented yet`);
}

/**
 * Convert to JSON, refusing a cycle, naming this reader in the error.
 *
 * @param {*} value Any decoded value.
 * @returns {*} A JSON-safe value.
 */
export function toJsonValue(value)
{
    return toJsonAcyclic(value, "Reader");
}
