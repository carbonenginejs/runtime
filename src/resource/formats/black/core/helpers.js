import blackDefinitions from "./blackSchema.js";

export const OUTPUT_JSON = "json";
export const OUTPUT_RAW = "raw";
export const OUTPUT_DOCUMENT = "document";
export const OUTPUT_PAYLOAD = "payload";
export const OUTPUT_RUNTIME = "runtime";

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_JSON,
    schema: blackDefinitions,
    registry: null,
    sourceShapes: null,
    rootName: "default",
    firstId: 1,
    metadata: null,
    includeMetadata: false,
    includeClassMetadata: false,
    includeFieldTrace: false,
    includeRefIndex: false,
    trace: false,
    debug: false,
    decodeBinaryBlocks: false,
    captureUnknownBlackFields: false,
    captureUnknownResourceFields: false,
    captureUnknownWhenNoBlackFields: false,
    allowUnknownStringFallback: false,
    rootFields: null,
    payloadRootFields: null,
    payloadTypeField: "_type",
    payloadIdField: "_id",
    payloadReferenceField: "_reference",
    pathHandler: null,
    adapter: null,    classes: Object.freeze({})
});

const OPTION_KEYS = new Set(Object.keys(DEFAULT_VALUES));


function normalizeEmit(emit, readerName)
{
    if (emit === undefined || emit === OUTPUT_JSON) return OUTPUT_JSON;
    if (emit === OUTPUT_RAW) return OUTPUT_RAW;
    if (emit === OUTPUT_DOCUMENT) return OUTPUT_DOCUMENT;
    if (emit === OUTPUT_PAYLOAD) return OUTPUT_PAYLOAD;
    if (emit === OUTPUT_RUNTIME) return OUTPUT_RUNTIME;
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
        sourceShapes: values.sourceShapes ?? null,
        rootName: values.rootName ?? "default",
        firstId: values.firstId ?? 1,
        metadata: values.metadata ?? null,
        includeMetadata: Boolean(values.includeMetadata),
        includeClassMetadata: Boolean(values.includeClassMetadata),
        includeFieldTrace: Boolean(values.includeFieldTrace),
        includeRefIndex: Boolean(values.includeRefIndex),
        trace: Boolean(values.trace),
        debug: Boolean(values.debug),
        decodeBinaryBlocks: Boolean(values.decodeBinaryBlocks),
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
        adapter: values.adapter ?? null,        classes: { ...classMap(values) }
    };
}

function cloneListOrValue(value)
{
    return Array.isArray(value) ? value.slice() : value ?? null;
}

/** Validates a requested runtime class key for the Black object-graph reader. */
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
 * Normalizes reader options against their supported defaults for the Black
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
    if (Object.hasOwn(options, "sourceShapes")) values.sourceShapes = options.sourceShapes ?? null;
    if (Object.hasOwn(options, "rootName")) values.rootName = options.rootName ?? "default";
    if (Object.hasOwn(options, "firstId")) values.firstId = options.firstId ?? 1;
    if (Object.hasOwn(options, "metadata")) values.metadata = options.metadata ?? null;
    if (Object.hasOwn(options, "includeMetadata")) values.includeMetadata = Boolean(options.includeMetadata);
    if (Object.hasOwn(options, "includeClassMetadata")) values.includeClassMetadata = Boolean(options.includeClassMetadata);
    if (Object.hasOwn(options, "includeFieldTrace")) values.includeFieldTrace = Boolean(options.includeFieldTrace);
    if (Object.hasOwn(options, "includeRefIndex")) values.includeRefIndex = Boolean(options.includeRefIndex);
    if (Object.hasOwn(options, "trace")) values.trace = Boolean(options.trace);
    if (Object.hasOwn(options, "debug")) values.debug = Boolean(options.debug);
    if (Object.hasOwn(options, "decodeBinaryBlocks")) values.decodeBinaryBlocks = Boolean(options.decodeBinaryBlocks);
    if (Object.hasOwn(options, "captureUnknownBlackFields")) values.captureUnknownBlackFields = Boolean(options.captureUnknownBlackFields);
    if (Object.hasOwn(options, "captureUnknownResourceFields")) values.captureUnknownResourceFields = Boolean(options.captureUnknownResourceFields);
    if (Object.hasOwn(options, "captureUnknownWhenNoBlackFields")) values.captureUnknownWhenNoBlackFields = Boolean(options.captureUnknownWhenNoBlackFields);
    if (Object.hasOwn(options, "allowUnknownStringFallback")) values.allowUnknownStringFallback = Boolean(options.allowUnknownStringFallback);
    if (Object.hasOwn(options, "rootFields")) values.rootFields = cloneListOrValue(options.rootFields);
    if (Object.hasOwn(options, "payloadRootFields")) values.payloadRootFields = cloneListOrValue(options.payloadRootFields);
    if (Object.hasOwn(options, "payloadTypeField")) values.payloadTypeField = options.payloadTypeField;
    if (Object.hasOwn(options, "payloadIdField")) values.payloadIdField = options.payloadIdField;
    if (Object.hasOwn(options, "payloadReferenceField")) values.payloadReferenceField = options.payloadReferenceField;
    if (Object.hasOwn(options, "adapter")) values.adapter = options.adapter ?? null;    if (Object.hasOwn(options, "pathHandler"))
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
 */
export function notImplemented(readerName, methodName)
{
    return new Error(`${readerName}.${methodName} is not implemented yet`);
}

/**
 * Converts a parsed payload into a JSON-safe value for the Black object-graph
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
