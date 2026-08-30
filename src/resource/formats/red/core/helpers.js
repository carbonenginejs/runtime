export const OUTPUT_JSON = "json";
export const OUTPUT_PAYLOAD = "payload";
export const OUTPUT_RUNTIME = "runtime";
export const OUTPUT_RAW = "raw";

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_JSON,
    schema: null,
    registry: null,
    firstId: 1,
    parse: null,
    adapter: null,
    adapters: null,
    payloadTypeField: "_type",
    payloadIdField: "_id",
    payloadReferenceField: "_reference",
    payloadValuesField: "_values",
    classes: Object.freeze({})
});

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
        adapters: values.adapters ?? null,
        payloadTypeField: values.payloadTypeField,
        payloadIdField: values.payloadIdField,
        payloadReferenceField: values.payloadReferenceField,
        payloadValuesField: values.payloadValuesField,
        classes: { ...classMap(values) }
    };
}

/** Validates a requested runtime class key for the RED object-graph reader. */
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
    if (Object.hasOwn(options, "adapters")) values.adapters = options.adapters ?? null;
    if (Object.hasOwn(options, "payloadTypeField")) values.payloadTypeField = options.payloadTypeField;
    if (Object.hasOwn(options, "payloadIdField")) values.payloadIdField = options.payloadIdField;
    if (Object.hasOwn(options, "payloadReferenceField")) values.payloadReferenceField = options.payloadReferenceField;
    if (Object.hasOwn(options, "payloadValuesField")) values.payloadValuesField = options.payloadValuesField;
    if (Object.hasOwn(options, "classes")) mergeClasses(values, options.classes, classKeys, readerName);
    return values;
}

/** Copies reader options accepted by the current RED object-graph reader. */
export function copyReaderOptions(values)
{
    const { emit: _emit, schema: _schema, classes: _classes, ...readerOptions } = values;
    return readerOptions;
}

/**
 * Converts a parsed payload into a JSON-safe value for the RED object-graph
 * reader.
 */
export function toJsonValue(value, seen = new WeakSet())
{
    if (value === null || typeof value !== "object") return value;
    if (ArrayBuffer.isView(value)) return Array.from(value, item => toJsonValue(item, seen));
    if (Array.isArray(value)) return value.map(item => toJsonValue(item, seen));

    if (seen.has(value))
    {
        throw new TypeError("Reader.toJSON cannot convert circular data");
    }

    if (typeof value.toJSON === "function")
    {
        seen.add(value);
        const json = toJsonValue(value.toJSON(), seen);
        seen.delete(value);
        return json;
    }

    seen.add(value);
    const out = {};
    for (const key of Object.keys(value))
    {
        out[key] = toJsonValue(value[key], seen);
    }
    seen.delete(value);
    return out;
}
