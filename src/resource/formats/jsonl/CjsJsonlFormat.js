import { CjsFormat } from "../../format/CjsFormat.js";

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
     * @returns {Array<unknown>} The parsed record values, in line order.
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
     * Provides the one-shot JSON Lines reader entry point.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input JSON Lines text or UTF-8 bytes.
     * @param {object} [options={}] Reader options.
     * @param {string} [options.source] Source name used in error messages.
     * @returns {Array<unknown>} The parsed record values, in line order.
     * @throws {TypeError} When a record is not valid JSON or the bytes are not UTF-8.
     */
    static read(input, options = {})
    {
        const records = [];

        for (const [ value ] of ParseRecords(input, options))
        {
            records.push(value);
        }

        return records;
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

    static id = "CjsJsonlFormat";

    static extensions = [ ".jsonl" ];

    static outputs = CjsFormat.defineOutputs({
        json: { default: true, decoded: true },
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
    const lines = NormalizeText(input).split(/\r?\n/u);

    for (let index = 0; index < lines.length; index++)
    {
        if (!lines[index].trim())
        {
            continue;
        }

        yield [ ParseRecord(lines[index], index + 1, options), index + 1 ];
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

export default CjsJsonlFormat;
