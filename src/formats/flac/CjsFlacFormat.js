import {
    DEFAULT_VALUES,
    OUTPUT_JSON,
    OUTPUT_PCM,
    OUTPUT_RAW,
    inspectWithValues,
    isFLAC,
    isSupportedWithValues,
    normalizeValues,
    readWithValues,
    toBytes,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsFlacFormat";

export class CjsFlacFormat
{
    #values = DEFAULT_VALUES;

    constructor(options = {})
    {
        this.SetValues(options);
    }

    SetValues(options = {})
    {
        this.#values = normalizeValues(this.#values, { inputType: "flac", ...options }, FORMAT_NAME);
        return this;
    }

    GetValues(options = {})
    {
        return normalizeValues(this.#values, { inputType: "flac", ...options }, FORMAT_NAME);
    }

    Read(input, options = {}) { return readWithValues(input, this.GetValues(options)); }
    async ReadAsync(input, options = {}) { return this.Read(input, options); }
    Inspect(input, options = {}) { return inspectWithValues(input, this.GetValues(options)); }
    IsSupported(input, options = {}) { return isSupportedWithValues(input, this.GetValues(options)); }
    ToJSON(value) { return toJsonValue(value); }

    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "flac", ...options }, FORMAT_NAME));
    }

    static async readAsync(input, options = {}) { return CjsFlacFormat.read(input, options); }
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "flac", ...options }, FORMAT_NAME));
    }

    static isSupported(input, options = {})
    {
        return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "flac", ...options }, FORMAT_NAME));
    }

    static toJSON(value) { return toJsonValue(value); }
    static isFLAC(input)
    {
        try { return isFLAC(toBytes(input)); }
        catch { return false; }
    }

    /**
     * Emit targets for this format (canonical frozen enum).
     */
    static Output = Object.freeze({
        RAW: OUTPUT_RAW,
        PCM: OUTPUT_PCM,
        JSON: OUTPUT_JSON
    });
    static OUTPUT_FLAC_JSON = "flacJson";
    static type = Object.freeze([ "audio" ]);
    static mediaTypes = Object.freeze([ "audio" ]);
    static inputTypes = Object.freeze([ "flac" ]);
    static outputTypes = Object.freeze([]);
    static debugOutputTypes = Object.freeze([ "flacJson", OUTPUT_RAW ]);
    static implementationStatus = "metadata-only";
}

export default CjsFlacFormat;
