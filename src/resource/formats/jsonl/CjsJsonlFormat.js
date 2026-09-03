import { CjsFormat } from "../../format/CjsFormat.js";

const FORMAT_NAME = "CjsJsonlFormat";
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

/**
 * JSON Lines format profile: one standalone JSON value per non-blank line.
 *
 * Its canonical instances are CCP's official static-data export
 * (`latest.jsonl` and the per-table `.jsonl` files inside its ZIP).
 */
export class CjsJsonlFormat extends CjsFormat
{

    /** Creates a CjsJsonlFormat; the reader takes no retained configuration. */
    constructor(options = {})
    {
        super();

        if (options === null || typeof options !== "object" || Array.isArray(options))
        {
            throw new TypeError(`${FORMAT_NAME} options must be an object`);
        }
    }

    /** Reads every record into one array for the JSON Lines reader. */
    Read(input, options = {})
    {
        return CjsJsonlFormat.read(input, options);
    }

    /** Returns structural metadata without parsing every record. */
    Inspect(input, options = {})
    {
        return CjsJsonlFormat.inspect(input, options);
    }

    /** Provides the one-shot JSON Lines reader entry point. */
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

    /** Serializes an iterable of JSON-compatible values to JSON Lines text. */
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

    static id = "jsonl";
    static extensions = Object.freeze([ ".jsonl" ]);
    static mediaTypes = Object.freeze([ "data" ]);
    static outputs = CjsFormat.defineOutputs({
        json: { default: true, decoded: true },
    });
}

/** Yields [value, lineNumber] for each non-blank line, in order. */
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

/** Decodes bytes as strict UTF-8, strips one BOM, and passes strings through. */
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

function FormatMessage(claim, options)
{
    const source = typeof options?.source === "string" && options.source
        ? ` ${options.source}`
        : " input";

    return `${FORMAT_NAME}${source} ${claim}`;
}

export default CjsJsonlFormat;
