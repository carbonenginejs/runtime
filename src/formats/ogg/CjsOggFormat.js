import {
    DEFAULT_VALUES,
    OUTPUT_JSON,
    OUTPUT_RAW,
    inspectWithValues,
    isOGG,
    isSupportedWithValues,
    normalizeValues,
    readWithValues,
    toBytes,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsOggFormat";

export class CjsOggFormat
{
    #values = DEFAULT_VALUES;

    constructor(options = {})
    {
        this.SetValues(options);
    }

    SetValues(options = {})
    {
        this.#values = normalizeValues(this.#values, { inputType: "ogg", ...options }, FORMAT_NAME);
        return this;
    }

    GetValues(options = {})
    {
        return normalizeValues(this.#values, { inputType: "ogg", ...options }, FORMAT_NAME);
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
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "ogg", ...options }, FORMAT_NAME));
    }

    static async readAsync(input, options = {})
    {
        return CjsOggFormat.read(input, options);
    }

    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "ogg", ...options }, FORMAT_NAME));
    }

    static isSupported(input, options = {})
    {
        return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "ogg", ...options }, FORMAT_NAME));
    }

    static toJSON(value)
    {
        return toJsonValue(value);
    }

    static isOGG(input)
    {
        try
        {
            return isOGG(toBytes(input));
        }
        catch
        {
            return false;
        }
    }

    static OUTPUT_RAW = OUTPUT_RAW;
    static OUTPUT_JSON = OUTPUT_JSON;
    static OUTPUT_OGG_JSON = "oggJson";
    static type = Object.freeze([ "audio", "video" ]);
    static mediaTypes = Object.freeze([ "audio", "video" ]);
    static inputTypes = Object.freeze([ "ogg", "oga", "ogv" ]);
    static outputTypes = Object.freeze([]);
    static debugOutputTypes = Object.freeze([ "oggJson", OUTPUT_RAW ]);
    static implementationStatus = "metadata-only";
}

export default CjsOggFormat;
