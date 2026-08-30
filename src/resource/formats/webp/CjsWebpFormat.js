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
    #values = DEFAULT_VALUES;

    /** Creates a CjsWebpFormat with caller-provided reader configuration. */
    constructor(options = {})
    {
        super();
        this.SetValues(options);
    }

    /**
     * Applies caller-provided options after normalizing supported fields for the
     * WebP format configuration.
     */
    SetValues(options = {})
    {
        this.#values = normalizeValues(this.#values, { inputType: "webp", ...options }, FORMAT_NAME);
        return this;
    }

    /**
     * Returns a snapshot of the normalized reader options for the WebP format
     * configuration.
     */
    GetValues(options = {})
    {
        return normalizeValues(this.#values, { inputType: "webp", ...options }, FORMAT_NAME);
    }

    /**
     * Reads the primary public payload representation from the supplied input
     * for the WebP format configuration.
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options));
    }

    /**
     * Reads the primary public payload representation asynchronously for the
     * WebP format configuration.
     */
    async ReadAsync(input, options = {})
    {
        return this.Read(input, options);
    }

    /**
     * Returns structural metadata without materializing the decoded payload for
     * the WebP format configuration.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options));
    }

    /**
     * Converts the current decoded payload into a JSON-safe representation for
     * the WebP format configuration.
     */
    ToJSON(value)
    {
        return toJsonValue(value);
    }

    /** Provides the one-shot WebP payload reader entry point. */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "webp", ...options }, FORMAT_NAME));
    }

    /** Provides the asynchronous one-shot WebP payload reader entry point. */
    static async readAsync(input, options = {})
    {
        return CjsWebpFormat.read(input, options);
    }

    /** Provides the one-shot WebP metadata inspection entry point. */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "webp", ...options }, FORMAT_NAME));
    }

    /** Checks one input against the WebP decoder capability contract. */
    static probeSupport(input, options = {})
    {
        return probeSupportWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "webp", ...options }, FORMAT_NAME));
    }

    /** Provides the one-shot WebP JSON conversion entry point. */
    static toJSON(value)
    {
        return toJsonValue(value);
    }

    /** Checks whether caller-provided bytes carry the expected WebP signature. */
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

    /**
     * Emit targets for this format (canonical frozen enum).
     */
    static Output = Object.freeze({
        RAW: OUTPUT_RAW,
        JSON: OUTPUT_JSON
    });

    static OUTPUT_WEBP_JSON = "webpJson";

    static id = "webp";

    static mediaTypes = Object.freeze([ "image" ]);

    static outputs = CjsFormat.defineOutputs({

        webpJson: { role: "debug", probes: [ "webpJson", "raw" ] },

        raw: { role: "debug", default: true, passthrough: true }

    });

    static extensions = Object.freeze([ ".webp" ]);
}

export default CjsWebpFormat;
