import {
    DEFAULT_VALUES,
    OUTPUT_IMAGE,
    OUTPUT_JSON,
    OUTPUT_RAW,
    OUTPUT_RGBA,
    inspectWithValues,
    isJPEG,
    isJPG,
    isSupportedWithValues,
    normalizeValues,
    readWithValues,
    toBytes,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsJpegFormat";

export class CjsJpegFormat
{
    #values = DEFAULT_VALUES;

    /**
     * Create a reusable JPEG format profile.
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
     * @returns {CjsJpegFormat} This format profile.
     */
    SetValues(options = {})
    {
        this.#values = normalizeValues(this.#values, { inputType: "jpeg", ...options }, FORMAT_NAME);
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
        return normalizeValues(this.#values, { inputType: "jpeg", ...options }, FORMAT_NAME);
    }

    /**
     * Read JPEG bytes with this profile.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input JPEG bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} GPU-free raw/debug payload for the selected emit target.
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options), "jpeg");
    }

    /**
     * Read JPEG bytes asynchronously with this profile.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input JPEG bytes.
     * @param {object} [options] Per-call values.
     * @returns {Promise<object>} GPU-free raw/debug payload for the selected emit target.
     */
    async ReadAsync(input, options = {})
    {
        return this.Read(input, options);
    }

    /**
     * Inspect JPEG bytes without decoding image data.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input JPEG bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} JPEG marker/header metadata.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options), "jpeg");
    }

    /**
     * Report whether JPEG input and requested output variants are supported.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input JPEG bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} Support/probe report.
     */
    IsSupported(input, options = {})
    {
        return isSupportedWithValues(input, this.GetValues(options), "jpeg");
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
     * One-shot JPEG read.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input JPEG bytes.
     * @param {object} [options] Read options.
     * @returns {object} GPU-free raw/debug payload for the selected emit target.
     */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "jpeg", ...options }, FORMAT_NAME), "jpeg");
    }

    /**
     * One-shot asynchronous JPEG read.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input JPEG bytes.
     * @param {object} [options] Read options.
     * @returns {Promise<object>} GPU-free raw/debug payload for the selected emit target.
     */
    static async readAsync(input, options = {})
    {
        return CjsJpegFormat.read(input, options);
    }

    /**
     * One-shot JPEG inspection.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input JPEG bytes.
     * @param {object} [options] Inspect options.
     * @returns {object} JPEG marker/header metadata.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "jpeg", ...options }, FORMAT_NAME), "jpeg");
    }

    /**
     * One-shot JPEG support probe.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input JPEG bytes.
     * @param {object} [options] Probe options.
     * @returns {object} Support/probe report.
     */
    static isSupported(input, options = {})
    {
        return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "jpeg", ...options }, FORMAT_NAME), "jpeg");
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
     * Test whether bytes look like a JPEG file.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Candidate JPEG bytes.
     * @returns {boolean} True when a JPEG SOI marker is present.
     */
    static isJPEG(input)
    {
        try
        {
            return isJPEG(toBytes(input));
        }
        catch
        {
            return false;
        }
    }

    /**
     * Test whether bytes look like a JPG/JPEG file.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Candidate JPG bytes.
     * @returns {boolean} True when a JPEG SOI marker is present.
     */
    static isJPG(input)
    {
        try
        {
            return isJPG(toBytes(input));
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
    static OUTPUT_JPEG_JSON = "jpegJson";
    static type = Object.freeze([ "image" ]);
    static mediaTypes = Object.freeze([ "image" ]);
    static inputTypes = Object.freeze([ "jpg", "jpeg" ]);
    static outputTypes = Object.freeze([ OUTPUT_IMAGE, OUTPUT_RGBA ]);
    static debugOutputTypes = Object.freeze([ "jpegJson", OUTPUT_RAW ]);
}

export default CjsJpegFormat;
