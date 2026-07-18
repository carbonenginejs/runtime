import {
    DEFAULT_VALUES,
    OUTPUT_IMAGE,
    OUTPUT_JSON,
    OUTPUT_RAW,
    OUTPUT_RGBA,
    inspectWithValues,
    isGIF,
    isSupportedWithValues,
    normalizeValues,
    readWithValues,
    toBytes,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsGifFormat";

export class CjsGifFormat
{
    #values = DEFAULT_VALUES;

    constructor(options = {})
    {
        this.SetValues(options);
    }

    SetValues(options = {})
    {
        this.#values = normalizeValues(this.#values, { inputType: "gif", ...options }, FORMAT_NAME);
        return this;
    }

    GetValues(options = {})
    {
        return normalizeValues(this.#values, { inputType: "gif", ...options }, FORMAT_NAME);
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
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "gif", ...options }, FORMAT_NAME));
    }

    static async readAsync(input, options = {})
    {
        return CjsGifFormat.read(input, options);
    }

    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "gif", ...options }, FORMAT_NAME));
    }

    static isSupported(input, options = {})
    {
        return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "gif", ...options }, FORMAT_NAME));
    }

    static toJSON(value)
    {
        return toJsonValue(value);
    }

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
    static type = Object.freeze([ "image" ]);
    static mediaTypes = Object.freeze([ "image" ]);
    static inputTypes = Object.freeze([ "gif" ]);
    static outputTypes = Object.freeze([ OUTPUT_IMAGE, OUTPUT_RGBA ]);
    static debugOutputTypes = Object.freeze([ "gifJson", OUTPUT_RAW ]);
}

export default CjsGifFormat;
