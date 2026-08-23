import { CjsFormat } from "../../format/CjsFormat.js";
import {
    DEFAULT_VALUES,
    OUTPUT_IMAGE,
    OUTPUT_JSON,
    OUTPUT_RAW,
    OUTPUT_RGBA,
    inspectWithValues,
    isGIF,
    probeSupportWithValues,
    normalizeValues,
    readWithValues,
    toBytes,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsGifFormat";

/**
 * GIF format profile that inspects header and frame metadata and reads GIF
 * bytes into raw, debug JSON, or LZW-decoded RGBA frame payloads.
 */
export class CjsGifFormat extends CjsFormat
{
    #values = DEFAULT_VALUES;

    /** Creates a CjsGifFormat with caller-provided reader configuration. */
    constructor(options = {})
    {
        super();
        this.SetValues(options);
    }

    /**
     * Applies caller-provided options after normalizing supported fields for the
     * GIF format configuration.
     */
    SetValues(options = {})
    {
        this.#values = normalizeValues(this.#values, { inputType: "gif", ...options }, FORMAT_NAME);
        return this;
    }

    /**
     * Returns a snapshot of the normalized reader options for the GIF format
     * configuration.
     */
    GetValues(options = {})
    {
        return normalizeValues(this.#values, { inputType: "gif", ...options }, FORMAT_NAME);
    }

    /**
     * Reads the primary public payload representation from the supplied input
     * for the GIF format configuration.
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options));
    }

    /**
     * Reads the primary public payload representation asynchronously for the GIF
     * format configuration.
     */
    async ReadAsync(input, options = {})
    {
        return this.Read(input, options);
    }

    /**
     * Returns structural metadata without materializing the decoded payload for
     * the GIF format configuration.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options));
    }

    /**
     * Converts the current decoded payload into a JSON-safe representation for
     * the GIF format configuration.
     */
    ToJSON(value)
    {
        return toJsonValue(value);
    }

    /** Provides the one-shot GIF payload reader entry point. */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "gif", ...options }, FORMAT_NAME));
    }

    /** Provides the asynchronous one-shot GIF payload reader entry point. */
    static async readAsync(input, options = {})
    {
        return CjsGifFormat.read(input, options);
    }

    /** Provides the one-shot GIF metadata inspection entry point. */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "gif", ...options }, FORMAT_NAME));
    }

    /** Checks one input against the GIF decoder capability contract. */
    static probeSupport(input, options = {})
    {
        return probeSupportWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "gif", ...options }, FORMAT_NAME));
    }

    /** Provides the one-shot GIF JSON conversion entry point. */
    static toJSON(value)
    {
        return toJsonValue(value);
    }

    /** Checks whether caller-provided bytes carry the expected GIF signature. */
    static isGIF(input)
    {
        try
        {
            return isGIF(toBytes(input));
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
        IMAGE: OUTPUT_IMAGE,
        RGBA: OUTPUT_RGBA,
        RAW: OUTPUT_RAW,
        JSON: OUTPUT_JSON
    });
    static OUTPUT_GIF_JSON = "gifJson";
    static id = "gif";
    static mediaTypes = Object.freeze([ "image" ]);
    static outputs = CjsFormat.defineOutputs({
        image: { decoded: true, probes: [ "image", "rgba" ] },
        rgba: { decoded: true },
        gifJson: { role: "debug", probes: [ "gifJson", "raw" ] },
        raw: { role: "debug", default: true, passthrough: true }
    });
    static extensions = Object.freeze([ ".gif" ]);
}

export default CjsGifFormat;
