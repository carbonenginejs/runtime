import { asUint8Array } from "#utils/bytes";
import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsImageFormat } from "../../format/CjsImageFormat.js";
import {
    DEFAULT_VALUES,
    OUTPUT_IMAGE,
    OUTPUT_JSON,
    OUTPUT_RAW,
    OUTPUT_RGBA,
    inspectWithValues,
    probeSupportWithValues,
    isTGA,
    normalizeValues,
    readWithValues,
    toJsonValue
} from "./core/helpers.js";
import { encodeTga } from "./core/writer.js";

const FORMAT_NAME = "CjsTgaFormat";

/**
 * TGA format profile that inspects header metadata and reads TGA bytes into
 * raw, debug JSON, or decoded RGBA image payloads.
 */
export class CjsTgaFormat extends CjsImageFormat
{
    _values = DEFAULT_VALUES;

    /**
     * One-shot TGA write from a normalized RGBA payload.
     *
     * @param {object} payload As emitted for `rgba`.
     * @param {object} [options] `compress` for run-length encoding.
     * @returns {Uint8Array} TGA bytes.
     */
    static write(payload, options = {})
    {
        return encodeTga(payload, options);
    }

    /**
     * Write a normalized RGBA payload as TGA bytes.
     *
     * @param {object} payload As emitted for `rgba`.
     * @param {object} [options] `compress` for run-length encoding.
     * @returns {Uint8Array} TGA bytes.
     */
    Write(payload, options = {})
    {
        return encodeTga(payload, options);
    }

    /**
     * Create a reusable TGA format profile.
     *
     * @param {object} [options] Default read/inspect options.
     */
    constructor(options = {})
    {
        super();
        this.SetValues(options);
    }

    /**
     * Merge options into this profile.
     *
     * @param {object} [options] Values to merge.
     * @returns {CjsTgaFormat} This format profile.
     */
    SetValues(options = {})
    {
        this._values = normalizeValues(this._values, { inputType: "tga", ...options }, FORMAT_NAME);
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
        return normalizeValues(this._values, { inputType: "tga", ...options }, FORMAT_NAME);
    }

    /**
     * Read TGA bytes with this profile.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input TGA bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} GPU-free raw/debug/RGBA payload for the selected emit target.
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options), "tga");
    }

    /**
     * Read TGA bytes asynchronously with this profile.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input TGA bytes.
     * @param {object} [options] Per-call values.
     * @returns {Promise<object>} GPU-free raw/debug/RGBA payload for the selected emit target.
     */
    async ReadAsync(input, options = {})
    {
        return this.Read(input, options);
    }

    /**
     * Inspect TGA bytes without decoding full image data.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input TGA bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} TGA header metadata.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options), "tga");
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
     * One-shot TGA read.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input TGA bytes.
     * @param {object} [options] Read options.
     * @returns {object} GPU-free raw/debug/RGBA payload for the selected emit target.
     */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "tga", ...options }, FORMAT_NAME), "tga");
    }

    /**
     * One-shot asynchronous TGA read.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input TGA bytes.
     * @param {object} [options] Read options.
     * @returns {Promise<object>} GPU-free raw/debug/RGBA payload for the selected emit target.
     */
    static async readAsync(input, options = {})
    {
        return CjsTgaFormat.read(input, options);
    }

    /**
     * One-shot TGA inspection.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input TGA bytes.
     * @param {object} [options] Inspect options.
     * @returns {object} TGA header metadata.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "tga", ...options }, FORMAT_NAME), "tga");
    }

    /**
     * One-shot TGA support probe.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input TGA bytes.
     * @param {object} [options] Probe options.
     * @returns {object} Support/probe report.
     */
    static probeSupport(input, options = {})
    {
        return probeSupportWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "tga", ...options }, FORMAT_NAME), "tga");
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
     * Test whether bytes look like a TGA file.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Candidate TGA bytes.
     * @returns {boolean} True when the TGA header looks valid.
     */
    static isTGA(input)
    {
        try
        {
            return isTGA(asUint8Array(input, "Image input"));
        }
        catch
        {
            return false;
        }
    }

    /**
     * Emit targets for this format (canonical frozen enum).
     */


    static id = "CjsTgaFormat";

    static mediaTypes = [ "image" ];

    static inputs = CjsFormat.defineInputs({
        rgba: { default: true, options: [ "compress" ] }
    });

    static outputs = CjsFormat.defineOutputs({

        image: { decoded: true, probes: [ "image", "rgba" ] },

        rgba: { decoded: true },

        tgaJson: { role: "debug", probes: [ "tgaJson", "raw" ] },

        raw: { role: "debug", default: true, passthrough: true }

    });

    /**
     * Fill a HostBitmap through this format's RGBA8 output, for Carbon's ImageIO
     * registry (`CjsTgaFormat.carbon`). See CjsImageFormat.readImageFromRgbaPayload.
     *
     * @param {Uint8Array|ArrayBuffer} input Image bytes.
     * @param {object} _loadParameters Load parameters; a single-mip image skips nothing.
     * @param {object} bitmap Destination HostBitmap.
     * @param {object|null} [metadata] Optional Metadata out.
     * @returns {object} ImageIOResult.
     */
    static readImageNative(input, _loadParameters, bitmap, metadata = null)
    {
        return this.readImageFromRgbaPayload(this.read(input, { emit: "rgba" }), bitmap, metadata);
    }

    static extensions = [ ".tga" ];
}

export default CjsTgaFormat;
