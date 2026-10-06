import { StreamType } from "#consts/media";
import { asUint8Array } from "#utils/bytes";
import { CjsFormat } from "../../format/CjsFormat.js";
import {
    DEFAULT_VALUES,
    OUTPUT_AUDIO,
    OUTPUT_JSON,
    OUTPUT_PCM,
    OUTPUT_RAW,
    inspectWithValues,
    isOGG,
    probeSupportWithValues,
    normalizeValues,
    readWithValues,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsOggFormat";

/**
 * Ogg container format profile that inspects page and stream metadata and
 * decodes Ogg Vorbis audio to PCM with the in-project pure-JS Vorbis
 * decoder, alongside raw and debug JSON output.
 */
export class CjsOggFormat extends CjsFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsOggFormat";

    _values = DEFAULT_VALUES;

    /**
     * Creates a CjsOggFormat with caller-provided reader configuration.
     *
     * @param {object} [options={}] Reader options; see normalizeValues for the accepted fields.
     */
    constructor(options = {})
    {
        super();
        this.SetValues(options);
    }

    /**
     * Applies caller-provided options after normalizing supported fields for the
     * Ogg format configuration.
     *
     * @param {object} [options={}] Reader options to merge.
     * @param {string} [options.emit] Output to produce.
     * @param {string} [options.inputType] Expected source format.
     * @param {string} [options.source] Source label.
     * @returns {CjsOggFormat} This format.
     */
    SetValues(options = {})
    {
        this._values = normalizeValues(this._values, { inputType: "ogg", ...options }, FORMAT_NAME);
        return this;
    }

    /**
     * Returns a snapshot of the normalized reader options for the Ogg format
     * configuration.
     *
     * @param {object} [options={}] Per-call overrides merged over the stored values.
     * @returns {import("./core/helpers.js").OggValues} The normalized values.
     */
    GetValues(options = {})
    {
        return normalizeValues(this._values, { inputType: "ogg", ...options }, FORMAT_NAME);
    }

    /**
     * Reads the primary public payload representation from the supplied input
     * for the Ogg format configuration.
     *
     * @param {import("./core/helpers.js").OggInput} input Ogg bytes.
     * @param {object} [options={}] Per-call option overrides.
     * @returns {object} The payload selected by the emit option.
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options));
    }

    /**
     * Reads the primary public payload representation asynchronously for the Ogg
     * format configuration.
     *
     * @param {import("./core/helpers.js").OggInput} input Ogg bytes.
     * @param {object} [options={}] Per-call option overrides.
     * @returns {Promise<object>} The payload selected by the emit option.
     */
    async ReadAsync(input, options = {})
    {
        return this.Read(input, options);
    }

    /**
     * Returns structural metadata without materializing the decoded payload for
     * the Ogg format configuration.
     *
     * @param {import("./core/helpers.js").OggInput} input Ogg bytes.
     * @param {object} [options={}] Per-call option overrides.
     * @returns {object} Page, stream and track metadata.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options));
    }

    /**
     * Converts the current decoded payload into a JSON-safe representation for
     * the Ogg format configuration.
     *
     * @param {*} value Payload to convert.
     * @returns {*} JSON-safe value with byte arrays summarized.
     */
    ToJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * Provides the one-shot Ogg payload reader entry point.
     *
     * @param {import("./core/helpers.js").OggInput} input Ogg bytes.
     * @param {object} [options={}] Reader options.
     * @returns {object} The payload selected by the emit option.
     */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "ogg", ...options }, FORMAT_NAME));
    }

    /**
     * Provides the asynchronous one-shot Ogg payload reader entry point.
     *
     * @param {import("./core/helpers.js").OggInput} input Ogg bytes.
     * @param {object} [options={}] Reader options.
     * @returns {Promise<object>} The payload selected by the emit option.
     */
    static async readAsync(input, options = {})
    {
        return CjsOggFormat.read(input, options);
    }

    /**
     * Provides the one-shot Ogg metadata inspection entry point.
     *
     * @param {import("./core/helpers.js").OggInput} input Ogg bytes.
     * @param {object} [options={}] Reader options.
     * @returns {object} Page, stream and track metadata.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "ogg", ...options }, FORMAT_NAME));
    }

    /**
     * Checks one input against the Ogg decoder capability contract.
     *
     * @param {import("./core/helpers.js").OggInput} input Ogg bytes.
     * @param {object} [options={}] Reader options.
     * @returns {object} Support report for the input.
     */
    static probeSupport(input, options = {})
    {
        return probeSupportWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "ogg", ...options }, FORMAT_NAME));
    }

    /**
     * Provides the one-shot Ogg JSON conversion entry point.
     *
     * @param {*} value Payload to convert.
     * @returns {*} JSON-safe value with byte arrays summarized.
     */
    static toJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * Checks whether caller-provided bytes carry the expected Ogg signature.
     *
     * @param {*} input Candidate byte input; unsupported values yield false.
     * @returns {boolean} True when the input starts with an Ogg page signature.
     */
    static isOGG(input)
    {
        try
        {
            return isOGG(asUint8Array(input, "OGG input"));
        }
        catch
        {
            return false;
        }
    }

    static id = "CjsOggFormat";

    static outputs = CjsFormat.defineOutputs({
        pcm: { outputStreams: StreamType.STREAM_AUDIO, decoded: true },
        audio: { outputStreams: StreamType.STREAM_AUDIO, decoded: true, probes: [ "audio", "pcm" ] },
        oggJson: { role: "debug", probes: [ "oggJson", "raw" ] },
        raw: { outputStreams: StreamType.STREAM_AUDIO_VIDEO, role: "debug", default: true, passthrough: true }
    });

    static extensions = [ ".ogg", ".oga", ".ogv" ];
}

export default CjsOggFormat;
