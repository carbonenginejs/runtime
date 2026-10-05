import { asUint8Array } from "#utils/bytes";
import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsImageFormat } from "../../format/CjsImageFormat.js";
import { TextureType } from "#consts/render-context";
import { ImageIOResult } from "#imageio";
import {
    DEFAULT_VALUES,
    OUTPUT_IMAGE,
    OUTPUT_RAW,
    OUTPUT_RGBA,
    inspectWithValues,
    isPNG,
    probeSupportWithValues,
    normalizeValues,
    readWithValues,
    readWithValuesAsync
} from "./core/helpers.js";
import { encodePng, encodePngAsync } from "./core/writer.js";

const FORMAT_NAME = "CjsPngFormat";

/**
 * PNG format profile that synchronously inspects chunk and header metadata
 * and emits raw bytes or debug JSON, with RGBA decoding available on the
 * asynchronous read path.
 */
export class CjsPngFormat extends CjsImageFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsPngFormat";

    /**
     * Carbon IsSaveSupported (Tr2PngHandler.cpp:511-533): a 1D or 2D image with one array element.
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
        return CjsImageFormat._isConvertibleSave(dimensions, [ TextureType.TEX_TYPE_1D, TextureType.TEX_TYPE_2D ]);
    }

    /**
     * Carbon Save (Tr2PngHandler.cpp:544-702), writing the bitmap as PNG.

     * Beyond the conversion, two differences from libpng's output: the file is
     * always 8-bit RGBA, where Carbon writes grey, RGB or 16-bit depending on the
     * source; and it is written with stored deflate blocks, as the synchronous
     * `write` is, so it is valid and uncompressed. Metadata is not written;
     * Carbon writes its strings as tEXt chunks, with each key also as the text
     * (Tr2PngHandler.cpp:671-672).
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

        return { result, bytes: encodePng(payload) };
    }

    _values = DEFAULT_VALUES;

    /**
     * One-shot PNG write from a normalized RGBA payload, without compressing.
     *
     * @param {object} payload As emitted for `rgba`.
     * @returns {Uint8Array} PNG bytes.
     */
    static write(payload, options = {})
    {
        return encodePng(payload, options);
    }

    /**
     * One-shot compressed PNG write from a normalized RGBA payload.
     *
     * @param {object} payload As emitted for `rgba`.
     * @returns {Promise<Uint8Array>} PNG bytes.
     */
    static async writeAsync(payload, options = {})
    {
        return encodePngAsync(payload, options);
    }

    /**
     * Write a normalized RGBA payload as PNG bytes, without compressing.
     *
     * @param {object} payload As emitted for `rgba`.
     * @returns {Uint8Array} PNG bytes.
     */
    Write(payload, options = {})
    {
        return encodePng(payload, options);
    }

    /**
     * Write a normalized RGBA payload as compressed PNG bytes.
     *
     * @param {object} payload As emitted for `rgba`.
     * @returns {Promise<Uint8Array>} PNG bytes.
     */
    async WriteAsync(payload, options = {})
    {
        return encodePngAsync(payload, options);
    }

    /**
     * Create a reusable PNG format profile.
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
     * @returns {CjsPngFormat} This format profile.
     */
    SetValues(options = {})
    {
        this._values = normalizeValues(this._values, { inputType: "png", ...options }, FORMAT_NAME);
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
        return normalizeValues(this._values, { inputType: "png", ...options }, FORMAT_NAME);
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
     * One-shot PNG inspection, without decoding pixels.
     *
     * Besides the header and chunk summary, reports the ancillary placement
     * chunks when present, as raw PNG facts with no domain meaning assigned:
     * `offset: { x, y, unit }` from `oFFs` (signed 32-bit) and
     * `physicalPixelDimensions: { x, y, unit }` from `pHYs` (unsigned 32-bit);
     * each is `null` when absent.
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
    static probeSupport(input, options = {})
    {
        return probeSupportWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "png", ...options }, FORMAT_NAME), "png");
    }


    static id = "CjsPngFormat";
    static inputs = CjsFormat.defineInputs({
        // async because the compressing path is the real one; the sync writer
        // emits stored blocks and is the fallback, not the intent.
        rgba: { default: true, writeMode: "async", options: [ "compression" ] }
    });

    static outputs = CjsFormat.defineOutputs({
        image: { readMode: "async", decoded: true, probes: [ "image", "rgba" ] },
        rgba: { readMode: "async", decoded: true },
        raw: { role: "debug", default: true, passthrough: true }
    });
    /**
     * Fill a HostBitmap through this format's RGBA8 output, for Carbon's ImageIO
     * registry (`CjsPngFormat.carbon`). See CjsImageFormat.readImageFromRgbaPayload.
     *
     * @param {Uint8Array|ArrayBuffer} input Image bytes.
     * @param {object} _loadParameters Load parameters; a single-mip image skips nothing.
     * @param {object} bitmap Destination HostBitmap.
     * @param {object|null} [metadata] Optional Metadata out.
     * @returns {object} ImageIOResult.
     */
    static readImageNative(_input, _loadParameters, _bitmap, _metadata = null)
    {
        // PNG inflates through the browser's DecompressionStream, which is
        // asynchronous only; see CjsImageFormat.readImageAsync.
        return new ImageIOResult(ImageIOResult.Code.METHOD_NOT_SUPPORTED, "PNG decodes asynchronously; use readImageAsync");
    }

    /**
     * Fill a HostBitmap through this format's asynchronous RGBA8 output.
     *
     * @param {Uint8Array|ArrayBuffer} input Image bytes.
     * @param {object} _loadParameters Load parameters.
     * @param {object} bitmap Destination HostBitmap.
     * @param {object|null} [metadata] Optional Metadata out.
     * @returns {Promise<object>} ImageIOResult.
     */
    static async readImageNativeAsync(input, _loadParameters, bitmap, metadata = null)
    {
        return this.readImageFromRgbaPayload(await this.readAsync(input, { emit: "rgba" }), bitmap, metadata);
    }

    static extensions = [ ".png" ];
}

CjsImageFormat.registerSignature("png", isPNG);

export default CjsPngFormat;
