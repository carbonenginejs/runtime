export const OUTPUT_JSON = "json";
export const OUTPUT_PAYLOAD = "payload";
export const OUTPUT_RAW = "raw";
export const OUTPUT_DOCUMENT = "document";

export const TAG_PRESERVE = "preserve";
export const TAG_REJECT = "reject";
export const TAG_HANDLE = "handle";

export const DEFAULT_VALUES = {
    emit: OUTPUT_PAYLOAD,
    tagPolicy: TAG_PRESERVE,
    allowedTags: null,
    tagHandlers: {},
    sourceName: null,
    maxAliasCount: 100,
    uniqueKeys: true,
    intAsBigInt: false,
    idField: "$yamlId",
    refField: "$yamlRef",
    valuesField: "$yamlValues",
    tagField: "$yamlTag",
    valueField: "$yamlValue"
};

const OPTION_KEYS = new Set(Object.keys(DEFAULT_VALUES));

/**
 * Normalized YAML reader options.
 *
 * @typedef {object} CjsYamlValues
 * @property {string} emit Output to emit: "payload", "json", "raw" or "document".
 * @property {string} tagPolicy Custom-tag policy: "preserve", "reject" or "handle".
 * @property {Array<string>|null} allowedTags Custom tags allowed, or null for any.
 * @property {Object<string, Function>|Map<string, Function>} tagHandlers Handlers keyed by tag.
 * @property {string|null} sourceName Source name used in messages and metadata.
 * @property {number} maxAliasCount Maximum number of aliases accepted.
 * @property {boolean} uniqueKeys True to reject duplicate mapping keys.
 * @property {boolean} intAsBigInt True to keep integer scalars as bigint.
 * @property {string} idField Field marking a repeated node's identity.
 * @property {string} refField Field marking a reference to a repeated node.
 * @property {string} valuesField Field holding a repeated sequence's items.
 * @property {string} tagField Field holding a preserved custom tag.
 * @property {string} valueField Field holding a preserved custom tag's value.
 */

/**
 * Source location of a YAML node or tag.
 *
 * @typedef {object} CjsYamlLocation
 * @property {number} [offset] Character offset into the source.
 * @property {number} line One-based line.
 * @property {number} column One-based column.
 */

/**
 * Public description of a YAML parse or conversion error.
 *
 * @typedef {object} CjsYamlErrorDescription
 * @property {string} code Error code, or "YAML_ERROR".
 * @property {string} message Error message.
 * @property {CjsYamlLocation|null} location Error location, when known.
 */

/**
 * Structural metadata of one YAML source, as returned by Inspect.
 *
 * @typedef {object} CjsYamlInspection
 * @property {{id: string}} format Always { id: "yaml" }.
 * @property {{name: string|null, length: number}} source Source name and text length.
 * @property {{kind: string}} root Root node kind.
 * @property {Array<{tag: string, kind: string, location: CjsYamlLocation|null}>} tags Custom tags found.
 * @property {Array<{name: string, kind: string, location: CjsYamlLocation|null}>} anchors Anchors found.
 * @property {Array<{name: string, location: CjsYamlLocation|null}>} aliases Aliases found.
 * @property {Array<CjsYamlErrorDescription>} warnings Parser warnings.
 * @property {Array<CjsYamlErrorDescription>} errors Parser errors.
 */

/**
 * Document output: the inspection plus the converted raw value.
 *
 * @typedef {CjsYamlInspection & {value: *}} CjsYamlDocument
 */

/**
 * Returns true when a value can be decoded as YAML source text.
 *
 * @param {*} value Candidate input of any type.
 * @returns {boolean} True for a string, ArrayBuffer or ArrayBuffer view.
 */
export function isYamlSourceInput(value)
{
    return typeof value === "string"
        || value instanceof ArrayBuffer
        || ArrayBuffer.isView(value);
}

/**
 * Converts string or byte input into strict UTF-8 YAML source text while
 * respecting typed-array/DataView bounds.
 *
 * @param {string|ArrayBuffer|ArrayBufferView} value YAML text or bytes.
 * @param {string} [readerName="CjsYamlFormat"] Name used in error messages.
 * @returns {string} The YAML source text.
 * @throws {TypeError} When the input is not text or bytes, or is not valid UTF-8.
 */
export function toYamlSourceText(value, readerName = "CjsYamlFormat")
{
    if (typeof value === "string") return value;
    if (!isYamlSourceInput(value))
    {
        throw new TypeError(`${readerName} input must be a YAML string or byte buffer`);
    }
    const bytes = value instanceof ArrayBuffer
        ? new Uint8Array(value)
        : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    try
    {
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
    catch (error)
    {
        throw new TypeError(`${readerName} input must contain valid UTF-8 YAML`, { cause: error });
    }
}


function defineMappingValue(target, key, value)
{
    Object.defineProperty(target, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true
    });
}

function normalizeEmit(value, readerName)
{
    if (value === OUTPUT_JSON || value === OUTPUT_PAYLOAD) return value;
    if (value === OUTPUT_RAW || value === OUTPUT_DOCUMENT) return value;
    throw new TypeError(`${readerName} unknown emit value "${value}"`);
}

function normalizeTagPolicy(value, readerName)
{
    if (value === TAG_PRESERVE || value === TAG_REJECT || value === TAG_HANDLE) return value;
    throw new TypeError(`${readerName} unknown tagPolicy value "${value}"`);
}

function normalizeAllowedTags(value, readerName)
{
    if (value === null || value === undefined) return null;
    if (!Array.isArray(value) && !(value instanceof Set))
    {
        throw new TypeError(`${readerName} allowedTags must be an array, Set, or null`);
    }
    return [ ...value ];
}

function normalizeTagHandlers(value, readerName)
{
    if (value instanceof Map)
    {
        for (const [ tag, handler ] of value)
        {
            if (typeof handler !== "function")
            {
                throw new TypeError(`${readerName} tag handler "${tag}" must be a function`);
            }
        }
        return new Map(value);
    }
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError(`${readerName} tagHandlers must be an object or Map`);
    }
    for (const [ tag, handler ] of Object.entries(value))
    {
        if (typeof handler !== "function")
        {
            throw new TypeError(`${readerName} tag handler "${tag}" must be a function`);
        }
    }
    return { ...value };
}

function normalizeField(value, name, readerName)
{
    if (typeof value !== "string" || !value)
    {
        throw new TypeError(`${readerName} ${name} must be a non-empty string`);
    }
    return value;
}

function normalizeBoolean(value, name, readerName)
{
    if (typeof value !== "boolean") throw new TypeError(`${readerName} ${name} must be a boolean`);
    return value;
}

/**
 * Normalizes reader options against their supported defaults for the YAML
 * document reader.
 *
 * @param {CjsYamlValues} base Values to start from.
 * @param {object} [options={}] Overrides; only the CjsYamlValues fields are accepted.
 * @param {string} [readerName="CjsYamlFormat"] Name used in error messages.
 * @returns {CjsYamlValues} The normalized values.
 * @throws {TypeError} When options is not an object, has an unknown key, or a field is invalid.
 */
export function normalizeValues(base, options = {}, readerName = "CjsYamlFormat")
{
    if (!options || typeof options !== "object" || Array.isArray(options))
    {
        throw new TypeError(`${readerName} options must be an object`);
    }

    for (const key of Object.keys(options))
    {
        if (!OPTION_KEYS.has(key)) throw new TypeError(`${readerName} unknown option "${key}"`);
    }

    const values = {
        ...base,
        allowedTags: base.allowedTags ? [ ...base.allowedTags ] : null,
        tagHandlers: base.tagHandlers instanceof Map ? new Map(base.tagHandlers) : { ...base.tagHandlers }
    };

    if (Object.hasOwn(options, "emit")) values.emit = normalizeEmit(options.emit, readerName);
    if (Object.hasOwn(options, "tagPolicy")) values.tagPolicy = normalizeTagPolicy(options.tagPolicy, readerName);
    if (Object.hasOwn(options, "allowedTags")) values.allowedTags = normalizeAllowedTags(options.allowedTags, readerName);
    if (Object.hasOwn(options, "tagHandlers")) values.tagHandlers = normalizeTagHandlers(options.tagHandlers, readerName);
    if (Object.hasOwn(options, "sourceName")) values.sourceName = options.sourceName == null ? null : String(options.sourceName);
    if (Object.hasOwn(options, "maxAliasCount"))
    {
        if (!Number.isInteger(options.maxAliasCount) || options.maxAliasCount < 0)
        {
            throw new TypeError(`${readerName} maxAliasCount must be a non-negative integer`);
        }
        values.maxAliasCount = options.maxAliasCount;
    }
    if (Object.hasOwn(options, "intAsBigInt"))
    {
        values.intAsBigInt = normalizeBoolean(options.intAsBigInt, "intAsBigInt", readerName);
    }
    if (Object.hasOwn(options, "uniqueKeys"))
    {
        values.uniqueKeys = normalizeBoolean(options.uniqueKeys, "uniqueKeys", readerName);
    }

    for (const name of [ "idField", "refField", "valuesField", "tagField", "valueField" ])
    {
        if (Object.hasOwn(options, name)) values[name] = normalizeField(options[name], name, readerName);
    }

    return values;
}

/**
 * Converts a YAML node graph into JSON-safe values while preserving references
 * for the YAML document reader.
 *
 * @param {*} value Converted YAML value of any shape.
 * @param {CjsYamlValues} options Normalized options; idField, refField and valuesField are read.
 * @returns {*} The JSON-safe graph.
 * @throws {TypeError} When a repeated mapping already holds the identity field.
 */
export function toJsonGraph(value, options)
{
    const counts = new WeakMap();
    const traversed = new WeakSet();

    const count = (node) =>
    {
        if (!node || typeof node !== "object") return;
        counts.set(node, (counts.get(node) || 0) + 1);
        if (traversed.has(node)) return;
        traversed.add(node);
        if (Array.isArray(node)) node.forEach(count);
        else Object.keys(node).forEach(key => count(node[key]));
    };
    count(value);

    const ids = new WeakMap();
    let nextId = 1;

    const encode = (node) =>
    {
        if (typeof node === "bigint") return node.toString();
        if (node === null || typeof node !== "object") return node;
        if (ArrayBuffer.isView(node)) return Array.from(node, encode);
        if (node instanceof Date) return node.toISOString();

        const repeated = (counts.get(node) || 0) > 1;
        if (ids.has(node)) return { [options.refField]: ids.get(node) };

        let id = null;
        if (repeated)
        {
            id = nextId++;
            ids.set(node, id);
        }

        if (Array.isArray(node))
        {
            const values = node.map(encode);
            return repeated ? { [options.idField]: id, [options.valuesField]: values } : values;
        }

        if (repeated && Object.prototype.hasOwnProperty.call(node, options.idField))
        {
            throw new TypeError(`CjsYamlFormat cannot encode repeated mapping: reserved field "${options.idField}" already exists`);
        }

        const out = repeated ? { [options.idField]: id } : {};
        for (const key of Object.keys(node)) defineMappingValue(out, key, encode(node[key]));
        return out;
    };

    return encode(value);
}
