import { toJsonAcyclic } from "../../../format/jsonPolicies.js";

export const OUTPUT_JSON = "json";
export const OUTPUT_PAYLOAD = "payload";
export const OUTPUT_RUNTIME = "runtime";
export const OUTPUT_RAW = "raw";

/**
 * Normalized RED reader options.
 *
 * @typedef {object} RedValues
 * @property {string} emit Output to produce: "json", "payload", "runtime" or "raw".
 * @property {object|null} schema Schema definitions, or null.
 * @property {object|null} registry Runtime class registry, or null.
 * @property {number} firstId First payload reference id.
 * @property {Function|null} parse Custom YAML text parser, or null.
 * @property {object|null} adapter Runtime adapter, or null.
 * @property {string} payloadTypeField Payload field holding the type name.
 * @property {string} payloadIdField Payload field holding the reference id.
 * @property {string} payloadReferenceField Payload field holding a reference.
 * @property {string} payloadValuesField Payload field wrapping repeated sequence values.
 * @property {Object<string, Function>} classes Map of Red type names to constructors.
 */

/** @type {RedValues} */
export const DEFAULT_VALUES = {
    emit: OUTPUT_JSON,
    schema: null,
    registry: null,
    firstId: 1,
    parse: null,
    adapter: null,
    payloadTypeField: "_type",
    payloadIdField: "_id",
    payloadReferenceField: "_ref",
    payloadValuesField: "_values",
    classes: {}
};

const OPTION_KEYS = new Set(Object.keys(DEFAULT_VALUES));


function normalizeEmit(emit, readerName)
{
    if (emit === undefined || emit === OUTPUT_JSON) return OUTPUT_JSON;
    if (emit === OUTPUT_PAYLOAD) return OUTPUT_PAYLOAD;
    if (emit === OUTPUT_RUNTIME) return OUTPUT_RUNTIME;
    if (emit === OUTPUT_RAW) return OUTPUT_RAW;
    throw new Error(`${readerName} unknown emit value "${emit}"`);
}

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

function classMap(values)
{
    return values && values.classes ? values.classes : {};
}

function cloneValues(values)
{
    return {
        emit: values.emit,
        schema: values.schema ?? null,
        registry: values.registry ?? null,
        firstId: values.firstId ?? 1,
        parse: values.parse ?? null,
        adapter: values.adapter ?? null,
        payloadTypeField: values.payloadTypeField,
        payloadIdField: values.payloadIdField,
        payloadReferenceField: values.payloadReferenceField,
        payloadValuesField: values.payloadValuesField,
        classes: { ...classMap(values) }
    };
}

/**
 * Validates a requested runtime class key for the RED object-graph reader.
 *
 * @param {ReadonlyArray<string>} classKeys Known class keys; currently unread.
 * @param {string} key Red type name to validate.
 * @param {string} readerName Name used in error messages.
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
 * Validates a resolved runtime class constructor for the RED object-graph
 * reader.
 *
 * @param {ReadonlyArray<string>} classKeys Known class keys, passed to validateClassKey.
 * @param {string} type Red type name the constructor is registered under.
 * @param {Function} Class Constructor to validate.
 * @param {string} readerName Name used in error messages.
 * @throws {TypeError} When Class is not a function.
 */
export function validateClass(classKeys, type, Class, readerName)
{
    validateClassKey(classKeys, type, readerName);
    if (typeof Class !== "function")
    {
        throw new TypeError(`${readerName} class "${type}" must be a constructor`);
    }
}

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
 * Normalizes reader options against their supported defaults for the RED
 * object-graph reader.
 *
 * @param {RedValues} base Values the options are layered over.
 * @param {object} options Caller options; each key must be a RedValues field.
 * @param {string} [options.emit] Output to produce.
 * @param {object|null} [options.schema] Schema definitions.
 * @param {object|null} [options.registry] Runtime class registry.
 * @param {number} [options.firstId] First payload reference id.
 * @param {Function|null} [options.parse] Custom YAML text parser.
 * @param {object|null} [options.adapter] Runtime adapter.
 * @param {string} [options.payloadTypeField] Payload type field name.
 * @param {string} [options.payloadIdField] Payload id field name.
 * @param {string} [options.payloadReferenceField] Payload reference field name.
 * @param {string} [options.payloadValuesField] Payload values field name.
 * @param {Object<string, Function>} [options.classes] Constructors merged into the class map.
 * @param {ReadonlyArray<string>} classKeys Known class keys.
 * @param {string} readerName Name used in error messages.
 * @returns {RedValues} A new normalized values object.
 * @throws {TypeError} When options is not an object, holds an unknown key, or carries an invalid parse or classes value.
 * @throws {Error} When emit names an unknown output.
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
    if (Object.hasOwn(options, "firstId")) values.firstId = options.firstId ?? 1;
    if (Object.hasOwn(options, "parse"))
    {
        if (options.parse !== null && options.parse !== undefined && typeof options.parse !== "function")
        {
            throw new TypeError(`${readerName} parse option must be a function`);
        }
        values.parse = options.parse ?? null;
    }
    if (Object.hasOwn(options, "adapter")) values.adapter = options.adapter ?? null;
    if (Object.hasOwn(options, "payloadTypeField")) values.payloadTypeField = options.payloadTypeField;
    if (Object.hasOwn(options, "payloadIdField")) values.payloadIdField = options.payloadIdField;
    if (Object.hasOwn(options, "payloadReferenceField")) values.payloadReferenceField = options.payloadReferenceField;
    if (Object.hasOwn(options, "payloadValuesField")) values.payloadValuesField = options.payloadValuesField;
    if (Object.hasOwn(options, "classes")) mergeClasses(values, options.classes, classKeys, readerName);
    return values;
}

/**
 * Copies reader options accepted by the current RED object-graph reader.
 *
 * @param {RedValues} values Normalized values.
 * @returns {object} The values without emit, schema and classes.
 */
export function copyReaderOptions(values)
{
    const { emit: _emit, schema: _schema, classes: _classes, ...readerOptions } = values;
    return readerOptions;
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
