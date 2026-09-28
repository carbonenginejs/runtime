import { parseUint64Prefix } from "#utils/text";
// Source: resources/src/ResourceGroupImpl.cpp (ImportFromCSV).
// Source: resources/src/ResourceInfo/ResourceInfo.cpp (ExportToCsv).
import { CjsFormat } from "../../format/CjsFormat.js";
import { document, text } from "../resourcegroup/core/document.js";

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

/** Carbon resfileindex wire records to plain JSON-safe resource-group documents. */
export class CjsResFileIndexFormat extends CjsFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsResFileIndexFormat";

    /**
     * Reads CSV text or UTF-8 bytes.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input Source text or UTF-8 bytes; no file access is performed.
     * @returns {ResourceGroupDocument} Plain JSON-safe document; uint64 fields are decimal strings.
     * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
     */
    Read(input)
    {
        return CjsResFileIndexFormat.read(input);
    }

    /**
     * Writes CSV from a plain resource-group document.
     *
     * @param {ResourceGroupDocument} value Caller-owned document; writing does not mutate or sort it.
     * @returns {string} Serialized document text.
     * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
     */
    Write(value)
    {
        return CjsResFileIndexFormat.write(value);
    }

    /**
     * Native numeric-prefix conversion and duplicate/order retention, without model mutation.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input Source text or UTF-8 bytes; no file access is performed.
     * @returns {ResourceGroupDocument} Plain JSON-safe document; uint64 fields are decimal strings.
     * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
     */
    static read(input)
    {
        const resources = [];
        for (const line of text(input).split("\n"))
        {
            if (line === "") continue;
            const columns = CjsResFileIndexFormat.readRow(line);
            const row = {
                relativePath: columns.relativePath,
                prefix: columns.prefix,
                type: "Resource", location: columns.location, checksum: columns.checksum,
                uncompressedSize: columns.uncompressedSize.toString(), compressedSize: columns.compressedSize.toString()
            };
            if (columns.binaryOperation !== undefined) row.binaryOperation = columns.binaryOperation;
            resources.push(row);
        }
        // Wire decoding retains an explicit zero size. ResourceInfo constructor's
        // zero-to-unset behavior belongs to model hydration, not to the format.
        return document({ schemaVersion: 1, type: "ResourceGroup", documentVersion: "0.1.0", resources });
    }

    /**
     * One CSV row, split as Carbon's `ImportFromCSV` does (ResourceGroupImpl.cpp:1337-1442):
     * `std::getline` one comma at a time, so columns past the sixth are
     * ignored, and an empty column is read as an empty string. This is the one
     * spelling of Carbon's column rules. The resources library's
     * `ResourceGroupImpl.ImportFromCSV` reads through it and applies its own
     * model rules on top.
     *
     * Reproduced exactly:
     * - The prefix split uses `find(":/") + 2`, and without `:/` that is
     *   `npos + 2`, which wraps to 1. The relative path then drops only its
     *   first character, and the prefix is the whole column.
     * - Sizes are read with `std::stoull`: leading whitespace, an optional sign,
     *   then digits, and a negative wraps modulo 2^64.
     * - A sixth column that is present reaches `stoull` even when it is
     *   empty, so `...,2,,7` is malformed. A trailing comma with nothing after
     *   it gives no sixth column (`getline` fails at the end of the stream), so
     *   there is no operation.
     *
     * @param {string} line One non-empty line, without its `\n`; a `\r` stays in the last column read, as in Carbon.
     * @returns {{relativePath: string, prefix: string, location: string, checksum: string, uncompressedSize: bigint, compressedSize: bigint, binaryOperation?: number}} The row's columns.
     * @throws {SyntaxError|RangeError} Where Carbon returns `MALFORMED_RESOURCE_INPUT`.
     */
    static readRow(line)
    {
        const columns = line.split(",");
        if (columns.length < 5) throw new SyntaxError("Expected five resfileindex columns");
        const separator = columns[0].indexOf(":/");
        const colon = columns[0].indexOf(":");
        const row = {
            relativePath: columns[0].slice(separator < 0 ? 1 : separator + 2),
            prefix: colon < 0 ? columns[0] : columns[0].slice(0, colon),
            location: columns[1],
            checksum: columns[2],
            uncompressedSize: parseUint64Prefix(columns[3]),
            compressedSize: parseUint64Prefix(columns[4])
        };
        // "a,b,c,1,2," splits to six columns with an empty last one; Carbon's
        // getline finds nothing there, so a sixth column exists only when text,
        // or a seventh column, follows its comma.
        if (columns.length > 6 || (columns.length === 6 && columns[5] !== ""))
        {
            const operation = parseUint64Prefix(columns[5]);
            if (operation > 4294967295n) throw new RangeError("binaryOperation exceeds uint32");
            row.binaryOperation = Number(operation);
        }
        return row;
    }

    /**
     * Writes rows in document order; native group sorting remains a model operation.
     *
     * @param {ResourceGroupDocument} input Caller-owned document; writing does not mutate or sort it.
     * @returns {string} Serialized document text.
     * @throws {TypeError|RangeError|SyntaxError} If the input cannot be represented by the supported document schema.
     */
    static write(input)
    {
        const value = document(input);
        return value.resources.map(row =>
        {
            if (row.compressedSize === undefined) throw new TypeError("CSV requires compressedSize");
            const path = (row.prefix === undefined ? "" : row.prefix + ":/") + row.relativePath.replaceAll("\\", "/");
            const columns = [path, row.location, row.checksum, row.uncompressedSize, row.compressedSize];
            if (row.binaryOperation !== undefined) columns.push(row.binaryOperation);
            if (columns.some(cell => /[,\r\n]/u.test(String(cell)))) throw new TypeError("Carbon CSV has no quoting; fields cannot contain delimiters");
            return columns.join(",") + "\n";
        }).join("");
    }

    static id = "CjsResFileIndexFormat";
    static extensions = [];
    static mediaTypes = ["data"];
    static outputs = CjsFormat.defineOutputs({ json: { default: true, decoded: true } });
    static inputs = CjsFormat.defineInputs({ json: { default: true } });
}

