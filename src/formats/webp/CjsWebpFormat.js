import {
    DEFAULT_VALUES,
    OUTPUT_JSON,
    OUTPUT_RAW,
    inspectWithValues,
    isSupportedWithValues,
    isWebP,
    normalizeValues,
    readWithValues,
    toBytes,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsWebpFormat";

/**
 * Metadata-only WebP format profile that inspects RIFF chunk headers and
 * emits raw container bytes or debug JSON without decoding pixels.
 */
export class CjsWebpFormat
{
    #values = DEFAULT_VALUES;

    constructor(options = {})
    {
        this.SetValues(options);
    }

    SetValues(options = {})
    {
        this.#values = normalizeValues(this.#values, { inputType: "webp", ...options }, FORMAT_NAME);
        return this;
    }

    GetValues(options = {})
    {
        return normalizeValues(this.#values, { inputType: "webp", ...options }, FORMAT_NAME);
    }

    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options));
    }

    async ReadAsync(input, options = {})
    {
        return this.Read(input, options);
    }

    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options));
    }

    IsSupported(input, options = {})
    {
        return isSupportedWithValues(input, this.GetValues(options));
    }

    ToJSON(value)
    {
        return toJsonValue(value);
    }

    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "webp", ...options }, FORMAT_NAME));
    }

    static async readAsync(input, options = {})
    {
        return CjsWebpFormat.read(input, options);
    }

    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "webp", ...options }, FORMAT_NAME));
    }

    static isSupported(input, options = {})
    {
        return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "webp", ...options }, FORMAT_NAME));
    }

    static toJSON(value)
    {
        return toJsonValue(value);
    }

    static isWebP(input)
    {
        try
        {
            return isWebP(toBytes(input));
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

    static type = Object.freeze([ "image" ]);

    static mediaTypes = Object.freeze([ "image" ]);

    static inputTypes = Object.freeze([ "webp" ]);

    static outputTypes = Object.freeze([]);

    static debugOutputTypes = Object.freeze([ "webpJson", OUTPUT_RAW ]);

    static implementationStatus = "metadata-only";
}

export default CjsWebpFormat;
