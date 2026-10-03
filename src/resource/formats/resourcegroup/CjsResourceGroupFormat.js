// Source: resources/src/ResourceGroupImpl.cpp (YAML document fields).
// JS extension: canonical JSON persistence; this facade does not replace ResourceGroup.
import { stringify } from "yaml";
import { CjsYamlFormat } from "../yaml/CjsYamlFormat.js";
import { CjsFormat } from "../../format/CjsFormat.js";
import { document, fields, text, pack, unpack } from "./core/document.js";

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

/**
 * Compact internal JSON storage; cells correspond to columns by position.
 *
 * @typedef {object} CompactResourceGroupDocument
 * @property {number} schemaVersion Internal JSON schema version, currently 1.
 * @property {string} type Native group identity, ResourceGroup.
 * @property {string} documentVersion Carbon document version.
 * @property {string[]} columns Resource field names, declared once for all rows.
 * @property {Object<string, Array<string|number|null>>} values Rows keyed by full logical path; null marks an absent optional field.
 * @property {string} [numberOfResources] Declared count as unsigned decimal text.
 * @property {string} [totalResourcesSizeCompressed] Declared compressed bytes as decimal text.
 * @property {string} [totalResourcesSizeUncompressed] Declared uncompressed bytes as decimal text.
 */

/** ResourceGroup JSON persistence and native YAML interchange, with lossless integer fields. */
export class CjsResourceGroupFormat extends CjsFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsResourceGroupFormat";

    /**
     * Reads canonical internal JSON.
     *
     * @param {string|ArrayBuffer|ArrayBufferView|ResourceGroupDocument|CompactResourceGroupDocument} input JSON text, UTF-8 bytes or a plain document to validate.
     * @returns {ResourceGroupDocument} Plain JSON-safe document; uint64 fields are decimal strings.
     * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
     */
    Read(input)
    {
        return CjsResourceGroupFormat.read(input);
    }

    /**
     * Writes canonical internal JSON.
     *
     * @param {ResourceGroupDocument} value Caller-owned document; writing does not mutate or sort it.
     * @returns {string} Serialized document text; JSON uses shared columns and path-keyed rows.
     * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
     */
    Write(value)
    {
        return CjsResourceGroupFormat.write(value);
    }

    /**
     * Imports native Carbon YAML without constructing runtime objects.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input Source text or UTF-8 bytes; no file access is performed.
     * @returns {ResourceGroupDocument} Plain JSON-safe document; uint64 fields are decimal strings.
     * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
     */
    ReadYaml(input)
    {
        return CjsResourceGroupFormat.readYaml(input);
    }

    /**
     * Exports native Carbon YAML without acquiring or saving a file.
     *
     * @param {ResourceGroupDocument} value Caller-owned document; writing does not mutate or sort it.
     * @returns {string} Serialized document text; JSON uses shared columns and path-keyed rows.
     * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
     */
    WriteYaml(value)
    {
        return CjsResourceGroupFormat.writeYaml(value);
    }

    /**
     * Parses a JSON document or validates a caller-supplied plain document.
     *
     * @param {string|ArrayBuffer|ArrayBufferView|ResourceGroupDocument|CompactResourceGroupDocument} input JSON text, UTF-8 bytes or a plain document to validate.
     * @returns {ResourceGroupDocument} Plain JSON-safe document; uint64 fields are decimal strings.
     * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
     */
    static read(input)
    {
        return unpack(typeof input === "string" || input instanceof ArrayBuffer || ArrayBuffer.isView(input) ? JSON.parse(text(input)) : input);
    }

    /**
     * Serializes validated records as a compact path-keyed columns/values JSON document, rejecting duplicate paths.
     *
     * @param {ResourceGroupDocument} value Caller-owned document; writing does not mutate or sort it.
     * @returns {string} Serialized document text; JSON uses shared columns and path-keyed rows.
     * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
     */
    static write(value)
    {
        return JSON.stringify(pack(value)) + "\n";
    }

    /**
     * Native schema adapter; intAsBigInt is required before any numeric conversion.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input Source text or UTF-8 bytes; no file access is performed.
     * @returns {ResourceGroupDocument} Plain JSON-safe document; uint64 fields are decimal strings.
     * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
     */
    static readYaml(input)
    {
        const source = CjsYamlFormat.readRaw(input, { intAsBigInt: true, tagPolicy: "reject" });
        if (!source || source.Type !== "ResourceGroup" || !Array.isArray(source.Resources)) throw new TypeError("Expected Carbon ResourceGroup YAML");
        if (source.NumberOfResources === undefined || source.TotalResourcesSizeUnCompressed === undefined) throw new TypeError("Missing Carbon ResourceGroup totals");
        const value = {
            schemaVersion: 1,
            type: source.Type,
            documentVersion: source.Version,
            numberOfResources: source.NumberOfResources,
            totalResourcesSizeUncompressed: source.TotalResourcesSizeUnCompressed,
            resources: source.Resources.map(row =>
            {
                const result = {};
                for (const [key, native] of Object.entries(fields)) if (row[native] !== undefined) result[key] = row[native];
                for (const key of Object.keys(row)) if (!Object.values(fields).includes(key)) throw new TypeError("Unsupported Carbon resource field: " + key);
                return result;
            })
        };
        if (source.TotalResourcesSizeCompressed !== undefined) value.totalResourcesSizeCompressed = source.TotalResourcesSizeCompressed;
        for (const key of Object.keys(source)) if (!["Type", "Version", "NumberOfResources", "TotalResourcesSizeCompressed", "TotalResourcesSizeUnCompressed", "Resources"].includes(key)) throw new TypeError("Unsupported Carbon group field: " + key);
        return document(value);
    }

    /**
     * Native wire spelling is preserved; JSON decimal strings become YAML integer scalars.
     *
     * @param {ResourceGroupDocument} input Caller-owned document; writing does not mutate or sort it.
     * @returns {string} Serialized document text; JSON uses shared columns and path-keyed rows.
     * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
     */
    static writeYaml(input)
    {
        const value = document(input);
        // Carbon's header order (ResourceGroupImpl.cpp:1736-1764): the compressed
        // total, when present, comes before the uncompressed one.
        const source = {
            Version: value.documentVersion,
            Type: value.type,
            NumberOfResources: BigInt(value.numberOfResources ?? value.resources.length)
        };
        if (value.totalResourcesSizeCompressed !== undefined) source.TotalResourcesSizeCompressed = BigInt(value.totalResourcesSizeCompressed);
        Object.assign(source, {
            TotalResourcesSizeUnCompressed: BigInt(value.totalResourcesSizeUncompressed ?? value.resources.reduce((sum, row) => sum + BigInt(row.uncompressedSize), 0n)),
            Resources: value.resources.map(row =>
            {
                const result = {};
                for (const [key, native] of Object.entries(fields))
                {
                    if (row[key] === undefined || (key === "type" && value.documentVersion === "0.0.0")) continue;
                    result[native] = key.endsWith("Size") ? BigInt(row[key]) : row[key];
                }
                return result;
            })
        });
        return stringify(source);
    }

    static id = "CjsResourceGroupFormat";
    static extensions = [];
    static outputs = CjsFormat.defineOutputs({ json: { default: true, decoded: true } });
    static inputs = CjsFormat.defineInputs({ json: { default: true } });
}
