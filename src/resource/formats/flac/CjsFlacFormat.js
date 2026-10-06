import { StreamType } from "#consts/media";
import { asUint8Array } from "#utils/bytes";
import { CjsFormat } from "../../format/CjsFormat.js";
import {
    DEFAULT_VALUES,
    OUTPUT_JSON,
    OUTPUT_PCM,
    OUTPUT_RAW,
    inspectWithValues,
    isFLAC,
    probeSupportWithValues,
    normalizeValues,
    readWithValues,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsFlacFormat";

/**
 * Metadata-only FLAC format profile that validates the stream signature,
 * inspects stream metadata, and emits raw container bytes or debug JSON
 * without decoding PCM.
 */
export class CjsFlacFormat extends CjsFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsFlacFormat";

    _values = DEFAULT_VALUES;

    /**
     * Creates a CjsFlacFormat with caller-provided reader configuration.
     *
     * @param {Partial<import("./core/helpers.js").FlacValues>} [options={}] Reader options.
     */
    constructor(options = {})
    {
        super();
        this.SetValues(options);
    }

    /**
     * Applies caller-provided options after normalizing supported fields for the
     * FLAC format configuration.
     *
     * @param {Partial<import("./core/helpers.js").FlacValues>} [options={}] Reader options.
     * @param {string} [options.emit] Output to emit.
     * @param {string} [options.inputType="flac"] Expected source type.
     * @returns {this} This format.
     */
    SetValues(options = {})
    {
        this._values = normalizeValues(this._values, { inputType: "flac", ...options }, FORMAT_NAME);
        return this;
    }

    /**
     * Returns a snapshot of the normalized reader options for the FLAC format
     * configuration.
     *
     * @param {Partial<import("./core/helpers.js").FlacValues>} [options={}] Per-call overrides.
     * @param {string} [options.emit] Output to emit.
     * @param {string} [options.inputType="flac"] Expected source type.
     * @returns {import("./core/helpers.js").FlacValues} The normalized values.
     */
    GetValues(options = {})
    {
        return normalizeValues(this._values, { inputType: "flac", ...options }, FORMAT_NAME);
    }

    /**
     * Reads the primary public payload representation from the supplied input
     * for the FLAC format configuration.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
     * @param {Partial<import("./core/helpers.js").FlacValues>} [options={}] Per-call overrides.
     * @returns {object} The inspection for "json"/"flacJson", otherwise
     *     `{ sourceFormat, mimeType, metadata, bytes }`.
     */
    Read(input, options = {}) { return readWithValues(input, this.GetValues(options)); }

    /**
     * Reads the primary public payload representation asynchronously for the
     * FLAC format configuration.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
     * @param {Partial<import("./core/helpers.js").FlacValues>} [options={}] Per-call overrides.
     * @returns {Promise<object>} The `Read` result.
     */
    async ReadAsync(input, options = {}) { return this.Read(input, options); }

    /**
     * Returns structural metadata without materializing the decoded payload for
     * the FLAC format configuration.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
     * @param {Partial<import("./core/helpers.js").FlacValues>} [options={}] Per-call overrides.
     * @returns {import("./core/helpers.js").FlacInspection} The stream metadata.
     */
    Inspect(input, options = {}) { return inspectWithValues(input, this.GetValues(options)); }

    /**
     * Converts the current decoded payload into a JSON-safe representation for
     * the FLAC format configuration.
     *
     * @param {*} value Decoded payload.
     * @returns {*} JSON-safe copy with byte arrays reported as `{ byteLength }`.
     */
    ToJSON(value) { return toJsonValue(value); }

    /**
     * Provides the one-shot FLAC payload reader entry point.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
     * @param {Partial<import("./core/helpers.js").FlacValues>} [options={}] Reader options.
     * @returns {object} The `Read` result.
     */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "flac", ...options }, FORMAT_NAME));
    }

    /**
     * Provides the asynchronous one-shot FLAC payload reader entry point.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
     * @param {Partial<import("./core/helpers.js").FlacValues>} [options={}] Reader options.
     * @returns {Promise<object>} The `read` result.
     */
    static async readAsync(input, options = {}) { return CjsFlacFormat.read(input, options); }

    /**
     * Provides the one-shot FLAC metadata inspection entry point.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
     * @param {Partial<import("./core/helpers.js").FlacValues>} [options={}] Reader options.
     * @returns {import("./core/helpers.js").FlacInspection} The stream metadata.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "flac", ...options }, FORMAT_NAME));
    }

    /**
     * Provides the one-shot FLAC JSON conversion entry point.
     *
     * @param {*} value Decoded payload.
     * @returns {*} JSON-safe copy with byte arrays reported as `{ byteLength }`.
     */
    static toJSON(value) { return toJsonValue(value); }

    /**
     * Checks whether caller-provided bytes carry the expected FLAC signature.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
     * @returns {boolean} True for a `fLaC` signature; false otherwise or for non-byte input.
     */
    static isFLAC(input)
    {
        try { return isFLAC(asUint8Array(input, "FLAC input")); }
        catch { return false; }
    }

    static id = "CjsFlacFormat";

    static outputs = CjsFormat.defineOutputs({
        flacJson: { role: "debug", probes: [ "flacJson", "raw" ] },
        raw: { outputStreams: StreamType.STREAM_AUDIO, role: "debug", default: true, passthrough: true }
    });

    static extensions = [ ".flac" ];
}

export default CjsFlacFormat;
