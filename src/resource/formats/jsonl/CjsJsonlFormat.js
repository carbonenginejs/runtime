import { CjsSchema } from "#schema/CjsSchema";

import { CjsFormat } from "../../format/CjsFormat.js";

import { CjsTableData } from "../../format/CjsTableData.js";
import { asUint8Array } from "#utils/bytes";

const FORMAT_NAME = "CjsJsonlFormat";
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

/**
 * Structural metadata returned by `CjsJsonlFormat.inspect`.
 *
 * @typedef {object} CjsJsonlInspection
 * @property {number} lines Line count, blank lines included.
 * @property {number} records Non-blank line count.
 * @property {number} firstRecordLine One-based line number of the first record.
 */

/**
 * JSON Lines format profile: one standalone JSON value per non-blank line.
 *
 * Its canonical instances are CCP's official static-data export
 * (`latest.jsonl` and the per-table `.jsonl` files inside its ZIP).
 */
export class CjsJsonlFormat extends CjsFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsJsonlFormat";

    /**
     * Creates a CjsJsonlFormat; the reader takes no retained configuration.
     *
     * @param {object} [options={}] Format options; must be a plain object.
     * @throws {TypeError} When options is not a plain object.
     */
    constructor(options = {})
    {
        super();

        if (options === null || typeof options !== "object" || Array.isArray(options))
        {
            throw new TypeError(`${FORMAT_NAME} options must be an object`);
        }
    }

    /**
     * Reads every record into one array for the JSON Lines reader.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input JSON Lines text or UTF-8 bytes.
     * @param {object} [options={}] Reader options.
     * @param {string} [options.source] Source name used in error messages.
     * @returns {Array<unknown>|object} Record values, or a plain document when emit is cjstables.
     */
    Read(input, options = {})
    {
        return CjsJsonlFormat.read(input, options);
    }

    /**
     * Returns structural metadata without parsing every record.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input JSON Lines text or UTF-8 bytes.
     * @param {object} [options={}] Reader options.
     * @param {string} [options.source] Source name used in error messages.
     * @returns {CjsJsonlInspection} The line and record counts.
     */
    Inspect(input, options = {})
    {
        return CjsJsonlFormat.inspect(input, options);
    }

    /**
     * Provides the one-shot JSON Lines reader entry point. Set emit to cjstables
     * and supply name/keyPath/metadata to select shared table output.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input JSON Lines text or UTF-8 bytes.
     * @param {object} [options={}] Reader options.
     * @param {string} [options.source] Source name used in error messages.
     * @returns {Array<unknown>|object} Record values, or a plain document when emit is cjstables.
     * @throws {TypeError} When a record is not valid JSON or the bytes are not UTF-8.
     */
    static read(input, options = {})
    {
        const records = [];

        for (const [ value ] of ParseRecords(input, options))
        {
            records.push(value);
        }

        return (options.emit ?? options.output) === "cjstables"
            ? CjsTableData.fromRecords(records, options).GetValues()
            : records;
    }

    /**
     * Provides the one-shot JSON Lines metadata inspection entry point.
     *
     * The first record is parsed to identify the format; the rest are only
     * counted, so inspection stays cheap on large tables.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input JSON Lines text or UTF-8 bytes.
     * @param {object} [options={}] Reader options.
     * @param {string} [options.source] Source name used in error messages.
     * @returns {CjsJsonlInspection} The line and record counts.
     * @throws {TypeError} When the input contains no records or the first record is invalid.
     */
    static inspect(input, options = {})
    {
        const lines = NormalizeText(input).split(/\r?\n/u);
        let records = 0;
        let firstRecordLine = 0;

        for (let index = 0; index < lines.length; index++)
        {
            if (!lines[index].trim())
            {
                continue;
            }
            if (records === 0)
            {
                firstRecordLine = index + 1;
                ParseRecord(lines[index], index + 1, options);
            }
            records += 1;
        }

        if (records === 0)
        {
            throw new TypeError(FormatMessage(
                "contains no JSON Lines records",
                options,
            ));
        }

        return {
            lines: lines.length,
            records,
            firstRecordLine,
        };
    }

    /**
     * Serializes an iterable of JSON-compatible values to JSON Lines text.
     *
     * @param {Iterable<unknown>} values Records to serialize; none may be undefined.
     * @returns {string} One JSON value per line, newline-terminated when non-empty.
     * @throws {TypeError} When values is not iterable or holds an undefined record.
     */
    static toText(values)
    {
        if (!values || typeof values[Symbol.iterator] !== "function")
        {
            throw new TypeError(`${FORMAT_NAME}.toText requires an iterable`);
        }

        const lines = [];

        for (const value of values)
        {
            if (value === undefined)
            {
                throw new TypeError(
                    `${FORMAT_NAME}.toText cannot serialize undefined records`,
                );
            }

            lines.push(JSON.stringify(value));
        }

        return lines.join("\n") + (lines.length ? "\n" : "");
    }


    /**
     * Parse a byte or text stream without retaining earlier records. Node streams
     * and browser ReadableStreams both supply async iterables. A stream must use
     * either text chunks or byte chunks consistently; UTF-8 may span byte chunks.
     * @param {AsyncIterable<*>|Iterable<*>} chunks Text or byte chunks.
     * @param {object} [options={}] Source name for diagnostics.
     * @returns {AsyncGenerator<Array<*>>} Pairs of parsed value and physical line number.
     */
    static async *iterate(chunks, options = {})
    {
        const decoder = new TextDecoder("utf-8", { fatal: true });
        let pending = "";
        let lineNumber = 0;
        let mode = null;
        let first = true;
        for await (const chunk of chunks)
        {
            const nextMode = typeof chunk === "string" ? "text" : "bytes";
            if (mode !== null && mode !== nextMode) throw new TypeError("JSONL streams cannot mix text and byte chunks");
            mode = nextMode;
            pending += mode === "text" ? chunk : decoder.decode(asUint8Array(chunk), { stream: true });
            if (first && pending.length)
            {
                if (pending.charCodeAt(0) === 0xFEFF) pending = pending.slice(1);
                first = false;
            }
            let start = 0;
            let end;
            while ((end = pending.indexOf("\n", start)) !== -1)
            {
                const line = pending.slice(start, end);
                lineNumber++;
                if (line.trim()) yield [ ParseRecord(line, lineNumber, options), lineNumber ];
                start = end + 1;
            }
            pending = pending.slice(start);
        }
        if (mode === "bytes") pending += decoder.decode();
        if (pending.trim()) yield [ ParseRecord(pending, lineNumber + 1, options), lineNumber + 1 ];
    }

    /**
     * Decode bounded plain table documents, suitable for postMessage or storage.
     * External keys are explicit fields or source ordinals, never inferred names.
     * Duplicate keys across batches are checked by the receiving table/storage policy.
     * @param {AsyncIterable<*>|Iterable<*>} chunks Text or byte chunks.
     * @param {object} [options={}] Source, name, keyPath, metadata and batchSize.
     * @returns {AsyncGenerator<object>} Version-one cjstables documents.
     */
    static async *readBatches(chunks, options = {})
    {
        const { name = "records", keyPath = null, metadata = {}, batchSize = 256 } = options;
        if (!Number.isSafeInteger(batchSize) || batchSize < 1) throw new RangeError("Batch size must be positive");
        let batch = new CjsTableData(metadata).AddTable(name, { keyPath });
        let count = 0;
        let ordinal = 0;
        for await (const [value] of this.iterate(chunks, options))
        {
            batch.Add(name, keyPath === null ? ordinal : value[keyPath], value);
            ordinal++;
            if (++count === batchSize)
            {
                yield batch.GetValues();
                batch = new CjsTableData(metadata).AddTable(name, { keyPath });
                count = 0;
            }
        }
        if (count || ordinal === 0) yield batch.GetValues();
    }

    /**
     * Write one explicitly selected table's values as ordinary JSON Lines.
     * External identities and metadata are not representable in JSONL: reject
     * external keys unless they are the zero-based ordinals a reader recreates.
     * @param {object} document A cjstables document.
     * @param {object} options Writer options.
     * @param {string} options.table Table to write.
     * @returns {string} Newline-terminated JSON Lines.
     */
    static writeTables(document, { table })
    {
        const data = CjsTableData.from(document);
        const selected = data.tables.get(table);
        if (!selected) throw new Error(`Unknown table ${table}`);
        let ordinal = 0;
        const values = [];
        for (const [key, value] of data.Entries(table))
        {
            if (selected.keyPath === null && key !== ordinal) throw new TypeError("JSONL cannot preserve external record keys");
            AssertJSONValue(value);
            values.push(value);
            ordinal++;
        }
        return this.toText(values);
    }

    static worker = { module: import.meta.url, exportName: "CjsJsonlFormat", outputTypes: [ "json", "cjstables" ], defaultOutput: "json" };

    static id = "CjsJsonlFormat";

    static extensions = [ ".jsonl" ];

    static outputs = CjsFormat.defineOutputs({
        json: { default: true, decoded: true },
        cjstables: { decoded: true },
    });
}

/**
 * Yields [value, lineNumber] for each non-blank line, in order.
 *
 * @param {string|ArrayBuffer|ArrayBufferView} input JSON Lines text or UTF-8 bytes.
 * @param {object} [options] Reader options.
 * @param {string} [options.source] Source name used in error messages.
 * @returns {Generator<[unknown, number]>} The parsed value and its one-based line number.
 */
function* ParseRecords(input, options)
{
    const text = NormalizeText(input);
    let start = 0;
    let lineNumber = 0;
    while (start <= text.length)
    {
        const newline = text.indexOf("\n", start);
        const end = newline === -1 ? text.length : newline;
        const line = text.slice(start, end);
        lineNumber++;
        if (line.trim()) yield [ ParseRecord(line, lineNumber, options), lineNumber ];
        if (newline === -1) break;
        start = end + 1;
    }
}

/**
 * Parses one JSON Lines record.
 *
 * @param {string} line Record text.
 * @param {number} lineNumber One-based line number, for the error message.
 * @param {object} [options] Reader options.
 * @param {string} [options.source] Source name used in error messages.
 * @returns {unknown} The parsed JSON value.
 * @throws {TypeError} When the line is not valid JSON.
 */
function ParseRecord(line, lineNumber, options)
{
    try
    {
        return JSON.parse(line);
    }
    catch (error)
    {
        throw new TypeError(
            FormatMessage(`has an invalid record at line ${lineNumber}`, options)
            + `: ${error.message}`,
            { cause: error },
        );
    }
}

/**
 * Decodes bytes as strict UTF-8, strips one BOM, and passes strings through.
 *
 * @param {string|ArrayBuffer|ArrayBufferView} input JSON Lines text or UTF-8 bytes.
 * @returns {string} The text without a leading BOM.
 * @throws {TypeError} When input is not a string, ArrayBuffer or view.
 */
function NormalizeText(input)
{
    if (typeof input === "string")
    {
        return input.charCodeAt(0) === 0xFEFF ? input.slice(1) : input;
    }

    let bytes;

    if (input instanceof ArrayBuffer)
    {
        bytes = new Uint8Array(input);
    }
    else if (ArrayBuffer.isView(input))
    {
        bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }
    else
    {
        throw new TypeError(
            `${FORMAT_NAME} input must be a string, ArrayBuffer, or view`,
        );
    }

    const text = TEXT_DECODER.decode(bytes);
    return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

/**
 * Builds an error message naming the format and the input source.
 *
 * @param {string} claim What is wrong with the input.
 * @param {object} [options] Reader options.
 * @param {string} [options.source] Source name; "input" when absent.
 * @returns {string} The full message.
 */
function FormatMessage(claim, options)
{
    const source = typeof options?.source === "string" && options.source
        ? ` ${options.source}`
        : " input";

    return `${FORMAT_NAME}${source} ${claim}`;
}

/**
 * Refuse values whose native representation JSON would silently discard.
 * @param {*} value Decoded table value.
 * @param {Set<object>} [active=new Set()] Ancestors for cycle detection.
 * @returns {void}
 */
function AssertJSONValue(value, active = new Set())
{
    if (value === null || typeof value === "string" || typeof value === "boolean") return;
    if (typeof value === "number" && Number.isFinite(value)) return;
    if (typeof value !== "object") throw new TypeError("Table contains a non-JSON value");
    if (active.has(value)) throw new TypeError("JSONL cannot preserve graph references");
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
        throw new TypeError("JSONL cannot preserve native objects or bytes");
    active.add(value);
    for (const item of Array.isArray(value) ? value : Object.values(value)) AssertJSONValue(item, active);
    active.delete(value);
}

export default CjsJsonlFormat;

CjsSchema.meta.define(CjsJsonlFormat, { className: "CjsJsonlFormat" });
