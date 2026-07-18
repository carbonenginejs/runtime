import {
    DEFAULT_VALUES,
    OUTPUT_IMAGE,
    OUTPUT_JSON,
    OUTPUT_RAW,
    OUTPUT_RGBA,
    inspectWithValues,
    isPNG,
    isSupportedWithValues,
    normalizeValues,
    readWithValues,
    readWithValuesAsync,
    toBytes,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsPngFormat";

export class CjsPngFormat
{
    #values = DEFAULT_VALUES;

    /**
     * Create a reusable PNG format profile.
     *
     * @param {object} [options] Default read/inspect options.
     */
    constructor(options = {})
    {
        this.SetValues(options);
    }

    /**
     * Merge options into this profile.
     *
     * @param {object} [options] Values to merge.
     * @returns {CjsPngFormat} This format profile.
     */
    SetValues(options = {})
    {
        this.#values = normalizeValues(this.#values, { inputType: "png", ...options }, FORMAT_NAME);
        return this;
    }

    /**
     * Get normalized profile values with optional per-call overrides.
     *
     * @param {object} [options] Per-call values.
     * @returns {object} Normalized read values.
     */
    GetValues(options = {})
    {
        return normalizeValues(this.#values, { inputType: "png", ...options }, FORMAT_NAME);
    }

    /**
     * Read PNG bytes with this profile.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input PNG bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} GPU-free raw/debug payload for the selected emit target.
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options), "png");
    }

    /**
     * Read PNG bytes asynchronously with this profile.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input PNG bytes.
     * @param {object} [options] Per-call values.
     * @returns {Promise<object>} GPU-free raw/debug payload for the selected emit target.
     */
    async ReadAsync(input, options = {})
    {
        return readWithValuesAsync(input, this.GetValues(options), "png");
    }

    /**
     * Inspect PNG bytes without decoding image data.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input PNG bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} PNG header metadata.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options), "png");
    }

    /**
     * Report whether PNG input and requested output variants are supported.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input PNG bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} Support/probe report.
     */
    IsSupported(input, options = {})
    {
        return isSupportedWithValues(input, this.GetValues(options), "png");
    }

    /**
     * Convert format output into JSON-compatible debug data.
     *
     * @param {any} value Format output.
     * @returns {any} JSON-compatible value.
     */
    ToJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * One-shot PNG read.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input PNG bytes.
     * @param {object} [options] Read options.
     * @returns {object} GPU-free raw/debug payload for the selected emit target.
     */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "png", ...options }, FORMAT_NAME), "png");
    }

    /**
     * One-shot asynchronous PNG read.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input PNG bytes.
     * @param {object} [options] Read options.
     * @returns {Promise<object>} GPU-free raw/debug payload for the selected emit target.
     */
    static async readAsync(input, options = {})
    {
        return readWithValuesAsync(input, normalizeValues(DEFAULT_VALUES, { inputType: "png", ...options }, FORMAT_NAME), "png");
    }

    /**
     * One-shot PNG inspection.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input PNG bytes.
     * @param {object} [options] Inspect options.
     * @returns {object} PNG header metadata.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "png", ...options }, FORMAT_NAME), "png");
    }

    /**
     * One-shot PNG support probe.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input PNG bytes.
     * @param {object} [options] Probe options.
     * @returns {object} Support/probe report.
     */
    static isSupported(input, options = {})
    {
        return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "png", ...options }, FORMAT_NAME), "png");
    }

    /**
     * Convert format output into JSON-compatible debug data.
     *
     * @param {any} value Format output.
     * @returns {any} JSON-compatible value.
     */
    static toJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * Test whether bytes look like a PNG file.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Candidate PNG bytes.
     * @returns {boolean} True when the PNG signature is present.
     */
    static isPNG(input)
    {
        try
        {
            return isPNG(toBytes(input));
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
    static OUTPUT_PNG_JSON = "pngJson";
    static type = Object.freeze([ "image" ]);
    static mediaTypes = Object.freeze([ "image" ]);
    static inputTypes = Object.freeze([ "png" ]);
    static outputTypes = Object.freeze([ OUTPUT_IMAGE, OUTPUT_RGBA ]);
    static debugOutputTypes = Object.freeze([ "pngJson", OUTPUT_RAW ]);
}

export default CjsPngFormat;
