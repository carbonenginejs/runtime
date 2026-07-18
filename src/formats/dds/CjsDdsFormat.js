import {
    DEFAULT_VALUES,
    OUTPUT_IMAGE,
    OUTPUT_JSON,
    OUTPUT_RAW,
    OUTPUT_RGBA,
    OUTPUT_TEXTURE,
    inspectWithValues,
    isDDS,
    isSupportedWithValues,
    normalizeValues,
    readWithValues,
    toBytes,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsDdsFormat";

export class CjsDdsFormat
{
    #values = DEFAULT_VALUES;

    /**
     * Create a reusable DDS format profile.
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
     * @returns {CjsDdsFormat} This format profile.
     */
    SetValues(options = {})
    {
        this.#values = normalizeValues(this.#values, { inputType: "dds", ...options }, FORMAT_NAME);
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
        return normalizeValues(this.#values, { inputType: "dds", ...options }, FORMAT_NAME);
    }

    /**
     * Read DDS bytes with this profile.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input DDS bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} GPU-free raw/debug/texture payload for the selected emit target.
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options), "dds");
    }

    /**
     * Read DDS bytes asynchronously with this profile.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input DDS bytes.
     * @param {object} [options] Per-call values.
     * @returns {Promise<object>} GPU-free raw/debug/texture payload for the selected emit target.
     */
    async ReadAsync(input, options = {})
    {
        return this.Read(input, options);
    }

    /**
     * Inspect DDS bytes without decoding texture data.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input DDS bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} DDS header metadata.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options), "dds");
    }

    /**
     * Report whether DDS input and requested output variants are supported.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input DDS bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} Support/probe report.
     */
    IsSupported(input, options = {})
    {
        return isSupportedWithValues(input, this.GetValues(options), "dds");
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
     * One-shot DDS read.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input DDS bytes.
     * @param {object} [options] Read options.
     * @returns {object} GPU-free raw/debug/texture payload for the selected emit target.
     */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "dds", ...options }, FORMAT_NAME), "dds");
    }

    /**
     * One-shot asynchronous DDS read.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input DDS bytes.
     * @param {object} [options] Read options.
     * @returns {Promise<object>} GPU-free raw/debug/texture payload for the selected emit target.
     */
    static async readAsync(input, options = {})
    {
        return CjsDdsFormat.read(input, options);
    }

    /**
     * One-shot DDS inspection.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input DDS bytes.
     * @param {object} [options] Inspect options.
     * @returns {object} DDS header metadata.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "dds", ...options }, FORMAT_NAME), "dds");
    }

    /**
     * One-shot DDS support probe.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input DDS bytes.
     * @param {object} [options] Probe options.
     * @returns {object} Support/probe report.
     */
    static isSupported(input, options = {})
    {
        return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "dds", ...options }, FORMAT_NAME), "dds");
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
     * Test whether bytes look like a DDS file.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Candidate DDS bytes.
     * @returns {boolean} True when the DDS header is present and sized correctly.
     */
    static isDDS(input)
    {
        try
        {
            return isDDS(toBytes(input));
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
        TEXTURE: OUTPUT_TEXTURE,
        RGBA: OUTPUT_RGBA,
        RAW: OUTPUT_RAW,
        JSON: OUTPUT_JSON
    });
    static OUTPUT_DDS_JSON = "ddsJson";
    static type = Object.freeze([ "texture", "image" ]);
    static mediaTypes = Object.freeze([ "texture", "image" ]);
    static inputTypes = Object.freeze([ "dds" ]);
    static outputTypes = Object.freeze([ OUTPUT_TEXTURE, OUTPUT_IMAGE, OUTPUT_RGBA ]);
    static debugOutputTypes = Object.freeze([ "ddsJson", OUTPUT_RAW ]);
}

export default CjsDdsFormat;
