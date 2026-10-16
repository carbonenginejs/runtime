import { CjsSchema } from "#schema/CjsSchema";

import { asUint8Array } from "#utils/bytes";
import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsImageFormat } from "../../format/CjsImageFormat.js";
import { TextureType } from "#consts/render-context";
import {
    DEFAULT_VALUES,
    OUTPUT_IMAGE,
    OUTPUT_RAW,
    OUTPUT_RGBA,
    inspectWithValues,
    probeSupportWithValues,
    isTGA,
    normalizeValues,
    readWithValues
} from "./core/helpers.js";
import { encodeTga } from "./core/writer.js";

const FORMAT_NAME = "CjsTgaFormat";

/**
 * TGA format profile that inspects header metadata and reads TGA bytes into
 * raw, debug JSON, or decoded RGBA image payloads.
 */
export class CjsTgaFormat extends CjsImageFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsTgaFormat";

    /**
     * Fast sniff: TGA has no magic bytes, so it needs its extension on the filename,
     * plus, when bytes are given, a plausible header. With no bytes it is Carbon's
     * extension check alone. Never throws.
     *
     * @param {string|null} filename Resource path, or null.
     * @param {*} bytes Candidate bytes, or null.
     * @param {object|null} [_options] Probe options; unused.
     * @returns {boolean} Whether this is a TGA.
     */
    static is(filename, bytes, _options = null)
    {
        if (!this.filenameMatches(filename)) return false;
        if (bytes === null || bytes === undefined) return true;

        const view = CjsImageFormat.sniffBytes(bytes);

        return view !== null && isTGA(view);
    }

    /**
     * Carbon IsSaveSupported (Tr2TgaHandler.cpp:672-674): a 2D image with one array element.

     * Carbon bug, kept by design here: its per-format check, IsSaveSupported(PixelFormat)
     * (Tr2TgaHandler.cpp:685-690), reads `== B8G8R8X8 || != B8G8R8A8 || != R8`, which is
     * true for every format, so Carbon answers OK and only SaveHeader then refuses.
     * Ours converts, so OK is the right answer for every convertible format.
     *
     * Adapted: converts where Carbon refuses. Any pixel format `convertImage`
     * can take to 8-bit RGBA is accepted, where Carbon accepts only the formats
     * its handler stores.
     *
     * @param {object} dimensions BitmapDimensions or HostBitmap.
     * @returns {ImageIOResult} OK, or SAVE_NOT_SUPPORTED.
     */
    static isSaveSupported(dimensions)
    {
        return CjsImageFormat._isConvertibleSave(dimensions, [ TextureType.TEX_TYPE_2D ]);
    }

    /**
     * Carbon Save (Tr2TgaHandler.cpp:841-856), writing an uncompressed TGA.

     * Beyond the conversion, Carbon writes 24-bit BGR for B8G8R8X8, 32-bit BGRA
     * for B8G8R8A8 and 8-bit greyscale for R8, bottom-up; this writes 32-bit
     * top-down through the existing encoder. Metadata is not written; Carbon
     * appends CCP metadata in a TGA 2.0 developer area (Tr2TgaHandler.cpp:544-579).
     *
     * Adapted: converts where Carbon refuses - an unsupported pixel format is
     * converted to 8-bit RGBA before encoding - and returns `{result, bytes}`
     * where Carbon writes to a stream.
     *
     * @param {object} bitmap HostBitmap.
     * @param {object|null} _metadata Metadata (not written; see above).
     * @returns {{result: ImageIOResult, bytes: Uint8Array|null}} The outcome.
     */
    static save(bitmap, _metadata = null)
    {
        const { result, payload } = this._convertForSave(bitmap);

        if (!payload) return { result, bytes: null };

        return { result, bytes: encodeTga(payload) };
    }

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


    static id = "CjsTgaFormat";


    static inputs = CjsFormat.defineInputs({
        rgba: { default: true, options: [ "compress" ] }
    });

    static outputs = CjsFormat.defineOutputs({

        image: { decoded: true, probes: [ "image", "rgba" ] },

        rgba: { decoded: true },

        raw: { role: "debug", default: true, passthrough: true }

    });

    /**
     * Fill a HostBitmap through this format's RGBA8 output, for Carbon's ImageIO
     * registry (ImageIO). See CjsImageFormat.readImageFromRgbaPayload.
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

CjsSchema.meta.define(CjsTgaFormat, { className: "CjsTgaFormat" });
