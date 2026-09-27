/**
 * Plain resource-index record used for JSON persistence.
 *
 * @typedef {object} ResourceRecord
 * @property {string} relativePath Logical path with original case retained.
 * @property {string} location Stored content location.
 * @property {string} type Supported native resource type: Resource.
 * @property {string} checksum Content checksum text.
 * @property {string} uncompressedSize Unsigned 64-bit byte count as a decimal string.
 * @property {string} [compressedSize] Optional compressed byte count as a decimal string.
 * @property {number} [binaryOperation] Optional unsigned 32-bit operation code.
 * @property {string} [prefix] Logical path prefix without the colon delimiter.
 */

/**
 * Internal JSON document; schemaVersion is independent of Carbon's documentVersion.
 *
 * @typedef {object} ResourceGroupDocument
 * @property {number} schemaVersion Internal schema version, currently 1.
 * @property {string} type Native group identity: ResourceGroup.
 * @property {string} documentVersion Carbon document version, 0.0.0 or 0.1.0.
 * @property {ResourceRecord[]} resources Ordered records; duplicate paths are retained.
 * @property {string} [numberOfResources] Declared count as an unsigned decimal string.
 * @property {string} [totalResourcesSizeCompressed] Declared compressed bytes as a decimal string.
 * @property {string} [totalResourcesSizeUncompressed] Declared uncompressed bytes as a decimal string.
 */

// Runtime JSON persistence adaptation of resources/src/ResourceInfo/ResourceInfo.cpp.
// Pure document codecs; no Carbon object construction or acquisition takes place here.
const maximum = 18446744073709551615n;
const textDecoder = new TextDecoder("utf-8", { fatal: true });
// In Carbon's YAML emit order (ResourceInfo.cpp:1164-1266): writeYaml walks it.
export const fields = {
    relativePath: "RelativePath", type: "Type", location: "Location", checksum: "Checksum",
    uncompressedSize: "UncompressedSize", compressedSize: "CompressedSize",
    binaryOperation: "BinaryOperation", prefix: "Prefix"
};

/**
 * Decodes browser-standard UTF-8 input without silently replacing malformed bytes.
 *
 * @param {string|ArrayBuffer|ArrayBufferView} input Supplied document bytes or decimal field text.
 * @returns {string} Validated JSON-safe result.
 * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
 */
export function text(input)
{
    if (typeof input === "string") return input;
    if (input instanceof ArrayBuffer) return textDecoder.decode(input);
    if (ArrayBuffer.isView(input)) return textDecoder.decode(new Uint8Array(input.buffer, input.byteOffset, input.byteLength));
    throw new TypeError("Resource group input must be text or bytes");
}

/**
 * Canonical JSON uses decimal strings for uint64 values, never rounded JS numbers.
 *
 * @param {string|number|bigint} value Unsigned integer; unsafe numeric values are rejected.
 * @param {string} name Field name used in validation errors.
 * @returns {string} Validated JSON-safe result.
 * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
 */
export function uint64(value, name)
{
    if (typeof value === "number" && !Number.isSafeInteger(value)) throw new RangeError(name + " is not a safe integer");
    if (!["string", "number", "bigint"].includes(typeof value) || !/^\d+$/u.test(String(value))) throw new TypeError(name + " must be an unsigned decimal integer");
    const integer = BigInt(value);
    if (integer > maximum) throw new RangeError(name + " exceeds uint64");
    return integer.toString();
}

/**
 * Validates and copies one plain resource record; missing optional fields stay missing.
 *
 * @param {unknown} value Plain value to validate and copy into canonical JSON fields.
 * @returns {ResourceRecord} Validated JSON-safe result.
 * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
 */
function record(value)
{
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Expected a resource record");
    const result = {};
    for (const key of ["relativePath", "location", "type", "checksum"])
    {
        if (typeof value[key] !== "string") throw new TypeError("Missing resource string: " + key);
        result[key] = value[key];
    }
    if (result.type !== "Resource") throw new TypeError("Unsupported resource subtype: " + result.type);
    result.uncompressedSize = uint64(value.uncompressedSize, "uncompressedSize");
    if (value.compressedSize !== undefined) result.compressedSize = uint64(value.compressedSize, "compressedSize");
    if (value.binaryOperation !== undefined)
    {
        const operation = BigInt(uint64(value.binaryOperation, "binaryOperation"));
        if (operation > 4294967295n) throw new RangeError("binaryOperation exceeds uint32");
        result.binaryOperation = Number(operation);
    }
    if (value.prefix !== undefined)
    {
        if (typeof value.prefix !== "string") throw new TypeError("prefix must be a string");
        result.prefix = value.prefix;
    }
    for (const key of Object.keys(value)) if (!(Object.hasOwn(fields, key))) throw new TypeError("Unknown resource field: " + key);
    return result;
}

/**
 * Versioned internal JSON document, deliberately distinct from Carbon's file version.
 *
 * @param {unknown} value Plain value to validate and copy into canonical JSON fields.
 * @returns {ResourceGroupDocument} Validated JSON-safe result.
 * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
 */
export function document(value)
{
    if (!value || value.schemaVersion !== 1 || value.type !== "ResourceGroup") throw new TypeError("Expected ResourceGroup schemaVersion 1");
    if (!["0.0.0", "0.1.0"].includes(value.documentVersion)) throw new RangeError("Unsupported Carbon documentVersion");
    if (!Array.isArray(value.resources)) throw new TypeError("resources must be an array");
    const result = {
        schemaVersion: 1, type: "ResourceGroup", documentVersion: value.documentVersion,
        resources: value.resources.map(record)
    };
    for (const key of ["numberOfResources", "totalResourcesSizeCompressed", "totalResourcesSizeUncompressed"])
    {
        if (value[key] !== undefined) result[key] = uint64(value[key], key);
    }
    const allowed = new Set(["schemaVersion", "type", "documentVersion", "resources", "numberOfResources", "totalResourcesSizeCompressed", "totalResourcesSizeUncompressed"]);
    for (const key of Object.keys(value)) if (!allowed.has(key)) throw new TypeError("Unknown resource group field: " + key);
    return result;
}

/**
 * Packs resource records into positional rows keyed by their full logical path.
 *
 * @param {ResourceGroupDocument} input Plain caller-owned document.
 * @returns {object} JSON-safe document with shared columns and a path-keyed values dictionary.
 * @throws {TypeError} If paths are duplicate or cannot be represented without ambiguity.
 */
export function pack(input)
{
    const { resources, ...metadata } = document(input);
    const required = ["location", "type", "checksum", "uncompressedSize"];
    const columns = Object.keys(fields).filter(key => key !== "relativePath" && key !== "prefix"
        && (required.includes(key) || resources.some(row => Object.hasOwn(row, key))));
    const values = Object.create(null);
    for (const row of resources)
    {
        if (row.relativePath.includes(":/") || (row.prefix !== undefined && /[:/\\]/u.test(row.prefix)))
        {
            throw new TypeError("Resource path cannot be represented as an unambiguous lookup key");
        }
        const path = row.prefix === undefined ? row.relativePath : row.prefix + ":/" + row.relativePath;
        if (Object.hasOwn(values, path)) throw new TypeError("Duplicate resource path: " + path);
        values[path] = columns.map(key => row[key] === undefined ? null : row[key]);
    }
    return { ...metadata, columns, values };
}

/**
 * Expands path-keyed positional rows; null means an absent optional field.
 *
 * @param {object} input Compact document, or an existing plain-record document.
 * @returns {ResourceGroupDocument} Validated records reconstructed from dictionary keys and column values.
 * @throws {TypeError} If columns, row widths or required cells are invalid or ambiguous.
 * @throws {RangeError} If the document version or an integer is unsupported.
 */
export function unpack(input)
{
    if (!input || typeof input !== "object" || (!Object.hasOwn(input, "columns") && !Object.hasOwn(input, "values")))
    {
        return document(input);
    }
    if (Object.hasOwn(input, "resources")) throw new TypeError("Use columns/values or resources, not both");
    const { columns, values, ...metadata } = input;
    if (!Array.isArray(columns) || !values || typeof values !== "object" || Array.isArray(values)) throw new TypeError("Expected columns array and path-keyed values object");
    const required = ["location", "type", "checksum", "uncompressedSize"];
    const seen = new Set();
    for (const column of columns)
    {
        if (typeof column !== "string" || !Object.hasOwn(fields, column) || column === "relativePath" || column === "prefix") throw new TypeError("Unknown resource column: " + column);
        if (seen.has(column)) throw new TypeError("Duplicate resource column: " + column);
        seen.add(column);
    }
    if (required.some(column => !seen.has(column))) throw new TypeError("Missing required resource column");
    const resources = Object.entries(values).map(([path, row]) =>
    {
        if (!Array.isArray(row) || row.length !== columns.length) throw new TypeError("Resource row width must match columns");
        const separator = path.indexOf(":/");
        const result = separator < 0
            ? { relativePath: path }
            : { relativePath: path.slice(separator + 2), prefix: path.slice(0, separator) };
        for (let index = 0; index < columns.length; index++)
        {
            const key = columns[index], value = row[index];
            if (value === null)
            {
                if (required.includes(key)) throw new TypeError("Required resource cell cannot be null: " + key);
                continue;
            }
            result[key] = value;
        }
        return result;
    });
    return document({ ...metadata, resources });
}
