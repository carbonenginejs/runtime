import { CjsFormat } from "../../format/CjsFormat.js";

const FORMAT_NAME = "CjsJsonFormat";
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

/**
 * JSON format profile: one JSON document, bytes or text in, parsed values out.
 *
 * Ours: Carbon reads no JSON resources. This is the plain read for `.json`
 * files that are data rather than objects, beside `CjsYamlFormat` and
 * `CjsJsonlFormat`.
 */
export class CjsJsonFormat extends CjsFormat
{
    /**
     * Creates a CjsJsonFormat; the reader takes no retained configuration.
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
     * Reads the parsed JSON value.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input JSON text or UTF-8 bytes.
     * @param {object} [options={}] Reader options.
     * @param {string} [options.source] Source name used in error messages.
     * @returns {unknown} The parsed value.
     */
    Read(input, options = {})
    {
        return CjsJsonFormat.read(input, options);
    }

    /**
     * Parses one JSON document: strict UTF-8, one leading BOM stripped.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input JSON text or UTF-8 bytes.
     * @param {object} [options={}] Reader options.
     * @param {string} [options.source] Source name used in error messages.
     * @returns {unknown} The parsed value.
     * @throws {TypeError} When the input is not text or bytes, or not valid UTF-8 or JSON.
     */
    static read(input, options = {})
    {
        const text = NormalizeText(input, options);

        try
        {
            return JSON.parse(text);
        }
        catch (error)
        {
            throw new TypeError(`${FORMAT_NAME}: ${SourceName(options)} is not valid JSON: ${error.message}`, { cause: error });
        }
    }

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsJsonFormat";

    static id = "CjsJsonFormat";

    static extensions = [ ".json" ];

    static outputs = CjsFormat.defineOutputs({
        json: { default: true, decoded: true }
    });
}

/**
 * Decodes bytes as strict UTF-8, strips one BOM, and passes strings through.
 *
 * @param {string|ArrayBuffer|ArrayBufferView} input JSON text or UTF-8 bytes.
 * @param {object} options Reader options, for the source name.
 * @returns {string} The text without a leading BOM.
 * @throws {TypeError} When input is not a string, ArrayBuffer or view, or not valid UTF-8.
 */
function NormalizeText(input, options)
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
        throw new TypeError(`${FORMAT_NAME} input must be a string, ArrayBuffer, or view`);
    }

    let text;
    try
    {
        text = TEXT_DECODER.decode(bytes);
    }
    catch (error)
    {
        throw new TypeError(`${FORMAT_NAME}: ${SourceName(options)} is not valid UTF-8`, { cause: error });
    }
    return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

/**
 * The input's name for error messages.
 *
 * @param {object} options Reader options.
 * @returns {string} `options.source`, or "input".
 */
function SourceName(options)
{
    return typeof options.source === "string" && options.source ? options.source : "input";
}

export default CjsJsonFormat;
