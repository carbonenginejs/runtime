const OUTPUT_JSON = "json";
const OUTPUT_PAYLOAD = "payload";
const OUTPUT_RAW = "raw";
const OUTPUT_DOCUMENT = "document";
const TAG_PRESERVE = "preserve";
const TAG_REJECT = "reject";
const TAG_HANDLE = "handle";
const DEFAULT_VALUES = Object.freeze({
  emit: OUTPUT_PAYLOAD,
  tagPolicy: TAG_PRESERVE,
  allowedTags: null,
  tagHandlers: Object.freeze({}),
  sourceName: null,
  maxAliasCount: 100,
  uniqueKeys: true,
  idField: "$yamlId",
  refField: "$yamlRef",
  valuesField: "$yamlValues",
  tagField: "$yamlTag",
  valueField: "$yamlValue"
});
const OPTION_KEYS = new Set(Object.keys(DEFAULT_VALUES));

/** Returns true when a value can be decoded as YAML source text. */
function isYamlSourceInput(value) {
  return typeof value === "string" || value instanceof ArrayBuffer || ArrayBuffer.isView(value);
}

/**
 * Converts string or byte input into strict UTF-8 YAML source text while
 * respecting typed-array/DataView bounds.
 */
function toYamlSourceText(value, readerName = "CjsYamlFormat") {
  if (typeof value === "string") return value;
  if (!isYamlSourceInput(value)) {
    throw new TypeError(`${readerName} input must be a YAML string or byte buffer`);
  }
  const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  try {
    return new TextDecoder("utf-8", {
      fatal: true
    }).decode(bytes);
  } catch (error) {
    throw new TypeError(`${readerName} input must contain valid UTF-8 YAML`, {
      cause: error
    });
  }
}
function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}
function defineMappingValue(target, key, value) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  });
}
function normalizeEmit(value, readerName) {
  if (value === OUTPUT_JSON || value === OUTPUT_PAYLOAD) return value;
  if (value === OUTPUT_RAW || value === OUTPUT_DOCUMENT) return value;
  throw new TypeError(`${readerName} unknown emit value "${value}"`);
}
function normalizeTagPolicy(value, readerName) {
  if (value === TAG_PRESERVE || value === TAG_REJECT || value === TAG_HANDLE) return value;
  throw new TypeError(`${readerName} unknown tagPolicy value "${value}"`);
}
function normalizeAllowedTags(value, readerName) {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value) && !(value instanceof Set)) {
    throw new TypeError(`${readerName} allowedTags must be an array, Set, or null`);
  }
  return [...value];
}
function normalizeTagHandlers(value, readerName) {
  if (value instanceof Map) {
    for (const [tag, handler] of value) {
      if (typeof handler !== "function") {
        throw new TypeError(`${readerName} tag handler "${tag}" must be a function`);
      }
    }
    return new Map(value);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${readerName} tagHandlers must be an object or Map`);
  }
  for (const [tag, handler] of Object.entries(value)) {
    if (typeof handler !== "function") {
      throw new TypeError(`${readerName} tag handler "${tag}" must be a function`);
    }
  }
  return {
    ...value
  };
}
function normalizeField(value, name, readerName) {
  if (typeof value !== "string" || !value) {
    throw new TypeError(`${readerName} ${name} must be a non-empty string`);
  }
  return value;
}
function normalizeBoolean(value, name, readerName) {
  if (typeof value !== "boolean") throw new TypeError(`${readerName} ${name} must be a boolean`);
  return value;
}

/**
 * Normalizes reader options against their supported defaults for the YAML
 * document reader.
 */
function normalizeValues(base, options = {}, readerName = "CjsYamlFormat") {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError(`${readerName} options must be an object`);
  }
  for (const key of Object.keys(options)) {
    if (!OPTION_KEYS.has(key)) throw new TypeError(`${readerName} unknown option "${key}"`);
  }
  const values = {
    ...base,
    allowedTags: base.allowedTags ? [...base.allowedTags] : null,
    tagHandlers: base.tagHandlers instanceof Map ? new Map(base.tagHandlers) : {
      ...base.tagHandlers
    }
  };
  if (hasOwn(options, "emit")) values.emit = normalizeEmit(options.emit, readerName);
  if (hasOwn(options, "tagPolicy")) values.tagPolicy = normalizeTagPolicy(options.tagPolicy, readerName);
  if (hasOwn(options, "allowedTags")) values.allowedTags = normalizeAllowedTags(options.allowedTags, readerName);
  if (hasOwn(options, "tagHandlers")) values.tagHandlers = normalizeTagHandlers(options.tagHandlers, readerName);
  if (hasOwn(options, "sourceName")) values.sourceName = options.sourceName == null ? null : String(options.sourceName);
  if (hasOwn(options, "maxAliasCount")) {
    if (!Number.isInteger(options.maxAliasCount) || options.maxAliasCount < 0) {
      throw new TypeError(`${readerName} maxAliasCount must be a non-negative integer`);
    }
    values.maxAliasCount = options.maxAliasCount;
  }
  if (hasOwn(options, "uniqueKeys")) {
    values.uniqueKeys = normalizeBoolean(options.uniqueKeys, "uniqueKeys", readerName);
  }
  for (const name of ["idField", "refField", "valuesField", "tagField", "valueField"]) {
    if (hasOwn(options, name)) values[name] = normalizeField(options[name], name, readerName);
  }
  return values;
}

/**
 * Converts a YAML node graph into JSON-safe values while preserving references
 * for the YAML document reader.
 */
function toJsonGraph(value, options) {
  const counts = new WeakMap();
  const traversed = new WeakSet();
  const count = node => {
    if (!node || typeof node !== "object") return;
    counts.set(node, (counts.get(node) || 0) + 1);
    if (traversed.has(node)) return;
    traversed.add(node);
    if (Array.isArray(node)) node.forEach(count);else Object.keys(node).forEach(key => count(node[key]));
  };
  count(value);
  const ids = new WeakMap();
  let nextId = 1;
  const encode = node => {
    if (node === null || typeof node !== "object") return node;
    if (ArrayBuffer.isView(node)) return Array.from(node, encode);
    if (node instanceof Date) return node.toISOString();
    const repeated = (counts.get(node) || 0) > 1;
    if (ids.has(node)) return {
      [options.refField]: ids.get(node)
    };
    let id = null;
    if (repeated) {
      id = nextId++;
      ids.set(node, id);
    }
    if (Array.isArray(node)) {
      const values = node.map(encode);
      return repeated ? {
        [options.idField]: id,
        [options.valuesField]: values
      } : values;
    }
    if (repeated && Object.prototype.hasOwnProperty.call(node, options.idField)) {
      throw new TypeError(`CjsYamlFormat cannot encode repeated mapping: reserved field "${options.idField}" already exists`);
    }
    const out = repeated ? {
      [options.idField]: id
    } : {};
    for (const key of Object.keys(node)) defineMappingValue(out, key, encode(node[key]));
    return out;
  };
  return encode(value);
}

export { DEFAULT_VALUES, OUTPUT_DOCUMENT, OUTPUT_JSON, OUTPUT_PAYLOAD, OUTPUT_RAW, TAG_HANDLE, TAG_PRESERVE, TAG_REJECT, isYamlSourceInput, normalizeValues, toJsonGraph, toYamlSourceText };
//# sourceMappingURL=helpers.js.map
