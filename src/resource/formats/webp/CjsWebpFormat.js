import { CjsSchema } from "#schema/CjsSchema";

import { asUint8Array } from "#utils/bytes";
import { CjsFormat } from "../../format/CjsFormat.js";
import {
    DEFAULT_VALUES,
    OUTPUT_JSON,
    OUTPUT_RAW,
    inspectWithValues,
    probeSupportWithValues,
    isWebP,
    normalizeValues,
    readWithValues,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsWebpFormat";

/**
 * Metadata-only WebP format profile that inspects RIFF chunk headers and
 * emits raw container bytes or debug JSON without decoding pixels.
 */
export class CjsWebpFormat extends CjsFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsWebpFormat";

    _values = DEFAULT_VALUES;

    /**
     * Creates a CjsWebpFormat with caller-provided reader configuration.
     *
     * @param {object} [options={}] Option overrides.
     * @param {string} [options.emit] Output to emit: "raw", "json" or "webpJson".
     * @param {string} [options.inputType] Expected source format.
     * @param {string} [options.source] Source label for metadata.
     */
    constructor(options = {})
    {
        super();
        this.SetValues(options);
    }

    /**
     * Applies caller-provided options after normalizing supported fields for the
     * WebP format configuration.
     *
     * @param {object} [options={}] Option overrides.
     * @param {string} [options.emit] Output to emit: "raw", "json" or "webpJson".
     * @param {string} [options.inputType] Expected source format.
     * @param {string} [options.source] Source label for metadata.
     * @returns {CjsWebpFormat} This format.
     */
    SetValues(options = {})
    {
        this._values = normalizeValues(this._values, { inputType: "webp", ...options }, FORMAT_NAME);
        return this;
    }

    /**
     * Returns a snapshot of the normalized reader options for the WebP format
     * configuration.
     *
     * @param {object} [options={}] Option overrides.
     * @param {string} [options.emit] Output to emit: "raw", "json" or "webpJson".
     * @param {string} [options.inputType] Expected source format.
     * @param {string} [options.source] Source label for metadata.
     * @returns {import("./core/helpers.js").CjsWebpValues} The normalized values.
     */
    GetValues(options = {})
    {
        return normalizeValues(this._values, { inputType: "webp", ...options }, FORMAT_NAME);
    }

    /**
     * Reads the primary public payload representation from the supplied input
     * for the WebP format configuration.
     *
     * @param {Uint8Array|ArrayBuffer} input WebP file bytes.
     * @param {object} [options={}] Option overrides.
     * @param {string} [options.emit] Output to emit: "raw", "json" or "webpJson".
     * @param {string} [options.inputType] Expected source format.
     * @param {string} [options.source] Source label for metadata.
     * @returns {import("./core/helpers.js").CjsWebpInspection|{sourceFormat: string, mimeType: string, metadata: import("./core/helpers.js").CjsWebpInspection, bytes: Uint8Array}} The raw record, or the metadata for JSON output.
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options));
    }

    /**
     * Reads the primary public payload representation asynchronously for the
     * WebP format configuration.
     *
     * @param {Uint8Array|ArrayBuffer} input WebP file bytes.
     * @param {object} [options={}] Option overrides.
     * @param {string} [options.emit] Output to emit: "raw", "json" or "webpJson".
     * @param {string} [options.inputType] Expected source format.
     * @param {string} [options.source] Source label for metadata.
     * @returns {Promise<import("./core/helpers.js").CjsWebpInspection|{sourceFormat: string, mimeType: string, metadata: import("./core/helpers.js").CjsWebpInspection, bytes: Uint8Array}>} The raw record, or the metadata for JSON output.
     */
    async ReadAsync(input, options = {})
    {
        return this.Read(input, options);
    }

    /**
     * Returns structural metadata without materializing the decoded payload for
     * the WebP format configuration.
     *
     * @param {Uint8Array|ArrayBuffer} input WebP file bytes.
     * @param {object} [options={}] Option overrides.
     * @param {string} [options.emit] Output to emit: "raw", "json" or "webpJson".
     * @param {string} [options.inputType] Expected source format.
     * @param {string} [options.source] Source label for metadata.
     * @returns {import("./core/helpers.js").CjsWebpInspection} The container metadata.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options));
    }

    /**
     * Converts the current decoded payload into a JSON-safe representation for
     * the WebP format configuration.
     *
     * @param {*} value Value to convert; any payload or record.
     * @returns {*} The value with byte arrays replaced by byte-length summaries.
     */
    ToJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * Provides the one-shot WebP payload reader entry point.
     *
     * @param {Uint8Array|ArrayBuffer} input WebP file bytes.
     * @param {object} [options={}] Option overrides.
     * @param {string} [options.emit] Output to emit: "raw", "json" or "webpJson".
     * @param {string} [options.inputType] Expected source format.
     * @param {string} [options.source] Source label for metadata.
     * @returns {import("./core/helpers.js").CjsWebpInspection|{sourceFormat: string, mimeType: string, metadata: import("./core/helpers.js").CjsWebpInspection, bytes: Uint8Array}} The raw record, or the metadata for JSON output.
     */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "webp", ...options }, FORMAT_NAME));
    }

    /**
     * Provides the asynchronous one-shot WebP payload reader entry point.
     *
     * @param {Uint8Array|ArrayBuffer} input WebP file bytes.
     * @param {object} [options={}] Option overrides.
     * @param {string} [options.emit] Output to emit: "raw", "json" or "webpJson".
     * @param {string} [options.inputType] Expected source format.
     * @param {string} [options.source] Source label for metadata.
     * @returns {Promise<import("./core/helpers.js").CjsWebpInspection|{sourceFormat: string, mimeType: string, metadata: import("./core/helpers.js").CjsWebpInspection, bytes: Uint8Array}>} The raw record, or the metadata for JSON output.
     */
    static async readAsync(input, options = {})
    {
        return CjsWebpFormat.read(input, options);
    }

    /**
     * Provides the one-shot WebP metadata inspection entry point.
     *
     * @param {Uint8Array|ArrayBuffer} input WebP file bytes.
     * @param {object} [options={}] Option overrides.
     * @param {string} [options.emit] Output to emit: "raw", "json" or "webpJson".
     * @param {string} [options.inputType] Expected source format.
     * @param {string} [options.source] Source label for metadata.
     * @returns {import("./core/helpers.js").CjsWebpInspection} The container metadata.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "webp", ...options }, FORMAT_NAME));
    }

    /**
     * Provides the one-shot WebP JSON conversion entry point.
     *
     * @param {*} value Value to convert; any payload or record.
     * @returns {*} The value with byte arrays replaced by byte-length summaries.
     */
    static toJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * Checks whether caller-provided bytes carry the expected WebP signature.
     *
     * @param {Uint8Array|ArrayBuffer} input Candidate bytes.
     * @returns {boolean} True when the RIFF/WEBP signature is present.
     */
    static isWebP(input)
    {
        try
        {
            return isWebP(asUint8Array(input, "WebP input"));
        }
        catch
        {
            return false;
        }
    }

    static id = "CjsWebpFormat";


    static outputs = CjsFormat.defineOutputs({

        webpJson: { role: "debug", probes: [ "webpJson", "raw" ] },

        raw: { role: "debug", default: true, passthrough: true }

    });

    static extensions = [ ".webp" ];
}

export default CjsWebpFormat;

CjsSchema.meta.define("CjsWebpFormat")(CjsWebpFormat);
