import { asUint8Array } from "#utils/bytes";
import { CjsFormat } from "../../format/CjsFormat.js";
import {
    DEFAULT_VALUES,
    canDecodeDdsBlockFormat,
    decodeDdsSlice,
    OUTPUT_IMAGE,
    OUTPUT_JSON,
    OUTPUT_RAW,
    OUTPUT_RGBA,
    OUTPUT_TEXTURE,
    inspectWithValues,
    isDDS,
    probeSupportWithValues,
    normalizeValues,
    readWithValues,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsDdsFormat";

/**
 * DDS texture format profile that inspects header metadata, probes output
 * support, and reads DDS bytes into raw, GPU-free texture, image, or
 * software-decoded RGBA and float payloads (BC1-BC5, BC7, and BC6H
 * included).
 */
export class CjsDdsFormat extends CjsFormat
{
    #values = DEFAULT_VALUES;

    /**
     * Create a reusable DDS format profile.
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
    static probeSupport(input, options = {})
    {
        return probeSupportWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "dds", ...options }, FORMAT_NAME), "dds");
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
            return isDDS(asUint8Array(input, "Image input"));
        }
        catch
        {
            return false;
        }
    }

    /**
     * Emit targets for this format (canonical frozen enum).
     */
    /**
     * Decodes one block-compressed 2D slice to RGBA8.
     *
     * The whole-file readers answer "give me this image"; a volume texture asks
     * a different question - "give me slice 7 of mip 2" - and no amount of
     * reading a file down to one subresource expresses it. This is that seam,
     * and it exists because WebGL cannot take the block data as it is:
     * `EXT_texture_compression_bptc` grants `compressedTexImage2D` only, so a
     * BC7 volume has to be decoded on the CPU and uploaded with `texImage3D`.
     * Carbon does not do this - it hands D3D11 the blocks verbatim, volumes
     * included (`trinity/trinity/Tr2ImageIOHelpers.cpp:48-88`) - so this is a
     * platform-forced divergence rather than a design choice.
     *
     * @param {Uint8Array} bytes - the slice's block data, and nothing else
     * @param {Object} values
     * @param {String} values.pixelFormat - e.g. "bc7-rgba-unorm"
     * @param {Number} values.width
     * @param {Number} values.height
     * @param {Number} [values.rowPitch] - bytes per block row; derived when absent
     * @returns {Uint8Array} width * height * 4, row-major, top-left origin
     */
    static decodeBlockSlice(bytes, values = {})
    {
        const { pixelFormat, width, height } = values;

        if (!canDecodeDdsBlockFormat(pixelFormat))
        {
            throw new Error(`CjsDdsFormat.decodeBlockSlice: "${pixelFormat}" is not a block-compressed format`);
        }

        const blockBytes = /^bc(1|4)/u.test(pixelFormat) ? 8 : 16;
        const rowPitch = values.rowPitch ?? Math.max(1, Math.ceil(width / 4)) * blockBytes;

        return decodeDdsSlice(bytes, { width, height, pixelFormat }, { rowPitch });
    }

    /**
     * Whether `decodeBlockSlice` can decode a pixel format
     * @param {String} pixelFormat
     * @returns {Boolean}
     */
    static canDecodeBlockSlice(pixelFormat)
    {
        return canDecodeDdsBlockFormat(pixelFormat);
    }

    static Output = Object.freeze({
        IMAGE: OUTPUT_IMAGE,
        TEXTURE: OUTPUT_TEXTURE,
        RGBA: OUTPUT_RGBA,
        RAW: OUTPUT_RAW,
        JSON: OUTPUT_JSON
    });
    static OUTPUT_DDS_JSON = "ddsJson";
    static id = "dds";
    static mediaTypes = Object.freeze([ "texture", "image" ]);
    static outputs = CjsFormat.defineOutputs({
        texture: { probes: [ "texture", "compressed" ] },
        image: { decoded: true, probes: [ "image", "rgba" ] },
        rgba: { decoded: true },
        ddsJson: { role: "debug", probes: [ "ddsJson", "raw" ] },
        raw: { role: "debug", default: true, passthrough: true }
    });
    static extensions = Object.freeze([ ".dds" ]);
}

export default CjsDdsFormat;
