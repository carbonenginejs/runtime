import { classes } from './blackDefinitions.js';

const OUTPUT_JSON = "json";
const OUTPUT_RAW = "raw";
const OUTPUT_DOCUMENT = "document";
const OUTPUT_PAYLOAD = "payload";
const OUTPUT_RUNTIME = "runtime";
const DEFAULT_VALUES = Object.freeze({
  emit: OUTPUT_JSON,
  schema: classes,
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
  adapter: null,
  adapters: null,
  classes: Object.freeze({})
});
const OPTION_KEYS = new Set(Object.keys(DEFAULT_VALUES));
function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}
function normalizeEmit(emit, readerName) {
  if (emit === undefined || emit === OUTPUT_JSON) return OUTPUT_JSON;
  if (emit === OUTPUT_RAW) return OUTPUT_RAW;
  if (emit === OUTPUT_DOCUMENT) return OUTPUT_DOCUMENT;
  if (emit === OUTPUT_PAYLOAD) return OUTPUT_PAYLOAD;
  if (emit === OUTPUT_RUNTIME) return OUTPUT_RUNTIME;
  throw new Error(`${readerName} unknown emit value "${emit}"`);
}
function assertKnownOptions(options, readerName) {
  for (const key of Object.keys(options)) {
    if (!OPTION_KEYS.has(key)) {
      throw new TypeError(`${readerName} unknown option "${key}"`);
    }
  }
}
function classMap(values) {
  return values && values.classes ? values.classes : {};
}
function cloneValues(values) {
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
    adapter: values.adapter ?? null,
    adapters: values.adapters ?? null,
    classes: {
      ...classMap(values)
    }
  };
}
function cloneListOrValue(value) {
  return Array.isArray(value) ? value.slice() : value ?? null;
}
function validateClassKey(classKeys, key, readerName) {
  if (typeof key !== "string" || !key) {
    throw new Error(`${readerName} class type must be a non-empty string`);
  }
}
function validateClass(classKeys, type, Class, readerName) {
  validateClassKey(classKeys, type, readerName);
  if (typeof Class !== "function") {
    throw new TypeError(`${readerName} class "${type}" must be a constructor`);
  }
}
function mergeClasses(values, classes, classKeys, readerName) {
  if (!classes || typeof classes !== "object") {
    throw new TypeError(`${readerName} classes option must be an object`);
  }
  const next = {
    ...values.classes
  };
  for (const [type, Class] of Object.entries(classes)) {
    validateClass(classKeys, type, Class, readerName);
    next[type] = Class;
  }
  values.classes = next;
}
function normalizeValues(base, options, classKeys, readerName) {
  if (!options || typeof options !== "object") {
    throw new TypeError(`${readerName} options must be an object`);
  }
  assertKnownOptions(options, readerName);
  const values = cloneValues(base);
  if (hasOwn(options, "emit")) values.emit = normalizeEmit(options.emit, readerName);
  if (hasOwn(options, "schema")) values.schema = options.schema ?? null;
  if (hasOwn(options, "registry")) values.registry = options.registry ?? null;
  if (hasOwn(options, "sourceShapes")) values.sourceShapes = options.sourceShapes ?? null;
  if (hasOwn(options, "rootName")) values.rootName = options.rootName ?? "default";
  if (hasOwn(options, "firstId")) values.firstId = options.firstId ?? 1;
  if (hasOwn(options, "metadata")) values.metadata = options.metadata ?? null;
  if (hasOwn(options, "includeMetadata")) values.includeMetadata = Boolean(options.includeMetadata);
  if (hasOwn(options, "includeClassMetadata")) values.includeClassMetadata = Boolean(options.includeClassMetadata);
  if (hasOwn(options, "includeFieldTrace")) values.includeFieldTrace = Boolean(options.includeFieldTrace);
  if (hasOwn(options, "includeRefIndex")) values.includeRefIndex = Boolean(options.includeRefIndex);
  if (hasOwn(options, "trace")) values.trace = Boolean(options.trace);
  if (hasOwn(options, "debug")) values.debug = Boolean(options.debug);
  if (hasOwn(options, "decodeBinaryBlocks")) values.decodeBinaryBlocks = Boolean(options.decodeBinaryBlocks);
  if (hasOwn(options, "captureUnknownBlackFields")) values.captureUnknownBlackFields = Boolean(options.captureUnknownBlackFields);
  if (hasOwn(options, "captureUnknownResourceFields")) values.captureUnknownResourceFields = Boolean(options.captureUnknownResourceFields);
  if (hasOwn(options, "captureUnknownWhenNoBlackFields")) values.captureUnknownWhenNoBlackFields = Boolean(options.captureUnknownWhenNoBlackFields);
  if (hasOwn(options, "allowUnknownStringFallback")) values.allowUnknownStringFallback = Boolean(options.allowUnknownStringFallback);
  if (hasOwn(options, "rootFields")) values.rootFields = cloneListOrValue(options.rootFields);
  if (hasOwn(options, "payloadRootFields")) values.payloadRootFields = cloneListOrValue(options.payloadRootFields);
  if (hasOwn(options, "payloadTypeField")) values.payloadTypeField = options.payloadTypeField;
  if (hasOwn(options, "payloadIdField")) values.payloadIdField = options.payloadIdField;
  if (hasOwn(options, "payloadReferenceField")) values.payloadReferenceField = options.payloadReferenceField;
  if (hasOwn(options, "adapter")) values.adapter = options.adapter ?? null;
  if (hasOwn(options, "adapters")) values.adapters = options.adapters ?? null;
  if (hasOwn(options, "pathHandler")) {
    if (options.pathHandler !== null && options.pathHandler !== undefined && typeof options.pathHandler !== "function") {
      throw new TypeError(`${readerName} pathHandler option must be a function`);
    }
    values.pathHandler = options.pathHandler ?? null;
  }
  if (hasOwn(options, "classes")) mergeClasses(values, options.classes, classKeys, readerName);
  return values;
}
function toJsonValue(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (ArrayBuffer.isView(value)) return Array.from(value, item => toJsonValue(item, seen));
  if (Array.isArray(value)) return value.map(item => toJsonValue(item, seen));
  if (seen.has(value)) {
    throw new TypeError("Reader.toJSON cannot convert circular data");
  }
  if (typeof value.toJSON === "function") {
    seen.add(value);
    const json = toJsonValue(value.toJSON(), seen);
    seen.delete(value);
    return json;
  }
  seen.add(value);
  const out = {};
  for (const key of Object.keys(value)) {
    out[key] = toJsonValue(value[key], seen);
  }
  seen.delete(value);
  return out;
}

export { DEFAULT_VALUES, OUTPUT_DOCUMENT, OUTPUT_JSON, OUTPUT_PAYLOAD, OUTPUT_RAW, OUTPUT_RUNTIME, normalizeValues, toJsonValue, validateClass, validateClassKey };
//# sourceMappingURL=helpers.js.map
