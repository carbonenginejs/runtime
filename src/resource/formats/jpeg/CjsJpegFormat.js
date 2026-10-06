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
    isJPEG,
    probeSupportWithValues,
    normalizeValues,
    readWithValues
} from "./core/helpers.js";
import { encodeJpeg } from "./core/writer.js";

const FORMAT_NAME = "CjsJpegFormat";

/**
 * JPEG format profile that inspects marker and header metadata and reads
 * baseline JPEG bytes into raw, debug JSON, or RGBA payloads through the
 * in-project baseline decoder.
 */
export class CjsJpegFormat extends CjsImageFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsJpegFormat";

    /**
     * Fast sniff: a JPEG has magic bytes, so the bytes decide, even against a contrary
     * extension. With no bytes it is Carbon's extension check on the filename. Never throws.
     *
     * @param {string|null} filename Resource path, or null.
     * @param {*} bytes Candidate bytes, or null.
     * @param {object|null} [_options] Probe options; unused.
     * @returns {boolean} Whether this is a JPEG.
     */
    static is(filename, bytes, _options = null)
    {
        if (bytes === null || bytes === undefined) return this.filenameMatches(filename);

        const view = CjsImageFormat.sniffBytes(bytes);

        return view !== null && isJPEG(view);
    }

    /**
     * Carbon IsSaveSupported (Tr2JpgHandler.cpp:383-400): a 2D image with one array element.
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
     * Carbon Save (Tr2JpgHandler.cpp:411-484) at Carbon's quality, 90.

     * Beyond the conversion, Carbon writes R8 as single-component greyscale and
     * uses a float DCT; this writes three components through the existing
     * encoder. Carbon ignores metadata, as this does.
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

        return { result, bytes: encodeJpeg(payload, { quality: 0.9 }) };
    }

    _values = DEFAULT_VALUES;

    /**
     * Create a reusable JPEG format profile.
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
     * @returns {CjsJpegFormat} This format profile.
     */
    SetValues(options = {})
    {
        this._values = normalizeValues(this._values, { inputType: "jpeg", ...options }, FORMAT_NAME);
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
        return normalizeValues(this._values, { inputType: "jpeg", ...options }, FORMAT_NAME);
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
     * Write a normalized RGBA payload as baseline JPEG bytes.
     *
     * The counterpart of the `rgba` emit target, and it takes exactly what that
     * produces - so any image format in this package converts to JPEG through
     * its own reader and this writer, with no canvas and no second library.
     *
     * @param {object} payload `{ width, height, data }`, as the image formats
     *   emit for `rgba`; `strideBytes` and `origin` are honoured when present.
     * @param {object} [options] `quality` 0..1 and `subsampling`.
     * @returns {Uint8Array} JPEG bytes.
     */
    Write(payload, options = {})
    {
        return encodeJpeg(payload, options);
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
     * One-shot JPEG write from a normalized RGBA payload.
     *
     * @param {object} payload `{ width, height, data }` as emitted for `rgba`.
     * @param {object} [options] `quality` 0..1 and `subsampling`.
     * @returns {Uint8Array} JPEG bytes.
     */
    static write(payload, options = {})
    {
        return encodeJpeg(payload, options);
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
    static probeSupport(input, options = {})
    {
        return probeSupportWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "jpeg", ...options }, FORMAT_NAME), "jpeg");
    }



    static id = "CjsJpegFormat";

    static inputs = CjsFormat.defineInputs({
        rgba: { default: true, lossy: true, options: [ "quality", "subsampling" ] }
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

    static extensions = [ ".jpg", ".jpeg" ];
}


export default CjsJpegFormat;
