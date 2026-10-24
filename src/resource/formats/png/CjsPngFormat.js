import { CjsSchema } from "#schema/CjsSchema";

import { asUint8Array } from "#utils/bytes";
import { decompressBytes } from "#utils/compression";
import { crc32 } from "#utils/checksum";
import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsImageFormat } from "../../format/CjsImageFormat.js";
import { TextureType, PixelFormat } from "#consts/render-context";
import { ImageIOResult, Cutout } from "#imageio";
import {
    decodePngToRgba,
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
     * Fast sniff: a PNG has magic bytes, so the bytes decide, even against a contrary
     * extension. With no bytes it is Carbon's extension check on the filename. Never throws.
     *
     * @param {string|null} filename Resource path, or null.
     * @param {*} bytes Candidate bytes, or null.
     * @param {object|null} [_options] Probe options; unused.
     * @returns {boolean} Whether this is a PNG.
     */
    static is(filename, bytes, _options = null)
    {
        if (bytes === null || bytes === undefined) return this.filenameMatches(filename);

        const view = CjsImageFormat.sniffBytes(bytes);

        return view !== null && isPNG(view);
    }

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
     * @param {object} [options={}] Write options.
     * @param {number} [options.compression] PNG compression method; only 0 is defined.
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
     * @param {object} [options={}] Write options.
     * @param {number} [options.compression] PNG compression method; only 0 is defined.
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
     * @param {object} [options={}] Write options.
     * @param {number} [options.compression] PNG compression method; only 0 is defined.
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
     * @param {object} [options={}] Write options.
     * @param {number} [options.compression] PNG compression method; only 0 is defined.
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
     * registry (ImageIO). See CjsImageFormat.readImageFromRgbaPayload.
     *
     * @param {Uint8Array|ArrayBuffer} _input Image bytes; unread.
     * @param {object} _loadParameters Load parameters; a single-mip image skips nothing.
     * @param {object} _bitmap Destination HostBitmap; unread.
     * @param {object|null} [_metadata=null] Optional Metadata out; unread.
     * @returns {object} ImageIOResult.
     */
    static readImageNative(_input, _loadParameters, _bitmap, _metadata = null)
    {
        // PNG inflates through the browser's DecompressionStream, which is
        // asynchronous only; see CjsImageFormat.readImageAsync.
        return new ImageIOResult(ImageIOResult.Code.METHOD_NOT_SUPPORTED, "PNG decodes asynchronously; use readImageAsync");
    }

    /**
     * Fill a HostBitmap in the PNG's native channel width and precision.
     * Adapted: platform deflate decode is asynchronous. Cutout and pre-IDAT
     * text follow ImageIO's Read (imageio/Tr2PngHandler.cpp:228-255).
     *
     * Native GetFormat (imageio/Tr2PngHandler.cpp:115-165) selects R/RG for
     * grayscale and grayscale-alpha, BGRX/BGRA for eight-bit colour, and
     * RGBA16 for sixteen-bit colour. Palette and transparency expand first.
     * Explicit conversion remains owned by CjsImageFormat after this read.
     *
     * @param {Uint8Array|ArrayBuffer} input Image bytes.
     * @param {object} loadParameters Load parameters, including requestedFormat.
     * @param {object} bitmap Destination HostBitmap.
     * @param {object|null} [metadata] Optional Metadata out.
     * @returns {Promise<object>} ImageIOResult.
     */
    static async readImageNativeAsync(input, loadParameters, bitmap, metadata = null)
    {
        const bytes = asUint8Array(input);
        const info = this.inspect(bytes);
        const payload = await decodePngToRgba(bytes, info, true);
        const alpha = payload.alphaMode === "straight";
        const gray = info.colorType === 0 || info.colorType === 4;
        const wide = info.bitDepth === 16;
        const channels = gray ? (alpha ? 2 : 1) : 4;
        const format = wide
            ? (gray ? (alpha ? PixelFormat.PIXEL_FORMAT_R16G16_UNORM : PixelFormat.PIXEL_FORMAT_R16_UNORM)
                : PixelFormat.PIXEL_FORMAT_R16G16B16A16_UNORM)
            : (gray ? (alpha ? PixelFormat.PIXEL_FORMAT_R8G8_UNORM : PixelFormat.PIXEL_FORMAT_R8_UNORM)
                : (alpha ? PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM : PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM));
        if (!bitmap.Create(payload.width, payload.height, 1, format))
        {
            return new ImageIOResult(ImageIOResult.Code.ERROR_CREATING_BITMAP);
        }
        const target = bitmap.GetRawData();
        const view = new DataView(target.buffer, target.byteOffset, target.byteLength);
        for (let pixel = 0; pixel < payload.width * payload.height; pixel++)
        {
            for (let channel = 0; channel < channels; channel++)
            {
                const source = gray ? (channel === 1 ? 3 : 0) : (!wide && channel < 3 ? 2 - channel : channel);
                const value = payload.data[pixel * 4 + source];
                const destination = pixel * channels + channel;
                if (wide) view.setUint16(destination * 2, value, true);
                else target[destination] = value;
            }
        }
        if (metadata)
        {
            metadata.cutout = new Cutout();
            await this._readMetadata(input, metadata);
        }
        return new ImageIOResult(ImageIOResult.Code.OK);
    }

    /**
     * Fills native metadata without changing the inspection record's raw facts.
     * Carbon ignores chunk units, rejects both offsets when either is negative,
     * and performs the millionths multiplication in float32. Its png_get_text
     * runs after read_info and before pixels, so only pre-IDAT strings belong here.
     * @param {Uint8Array|ArrayBuffer} input Original PNG bytes.
     * @param {object} metadata Native Metadata output, whose Cutout was reset.
     * @returns {Promise<void>}
     */
    static async _readMetadata(input, metadata)
    {
        const scale = Math.fround(1 / 1000000);
        metadata.metadata = [];
        const bytes = asUint8Array(input, "PNG metadata");
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        let hasOffset = false;
        let hasPhysical = false;
        for (let cursor = 8; cursor + 12 <= bytes.length;)
        {
            const length = view.getUint32(cursor, false);
            const end = cursor + 8 + length;
            if (end + 4 > bytes.length) break;
            const type = view.getUint32(cursor + 4, false);
            // libpng read_info stops at the first IDAT; IEND ends an empty file.
            if (type === 0x49444154 || type === 0x49454e44) break;
            // libpng's default ancillary CRC action discards the corrupt chunk.
            if (crc32(bytes.subarray(cursor + 4, end)) !== view.getUint32(end, false))
            {
                cursor = end + 4;
                continue;
            }
            if (type === 0x6f464673 && length === 9 && !hasOffset)
            {
                hasOffset = true;
                const x = view.getInt32(cursor + 8, false);
                const y = view.getInt32(cursor + 12, false);
                if (x >= 0 && y >= 0)
                {
                    metadata.cutout.x = Math.fround(Math.fround(x) * scale);
                    metadata.cutout.y = Math.fround(Math.fround(y) * scale);
                }
            }
            else if (type === 0x70485973 && length === 9 && !hasPhysical)
            {
                hasPhysical = true;
                metadata.cutout.width = Math.fround(Math.fround(view.getUint32(cursor + 8, false)) * scale);
                metadata.cutout.height = Math.fround(Math.fround(view.getUint32(cursor + 12, false)) * scale);
            }
            if (type === 0x74455874 || type === 0x7a545874 || type === 0x69545874)
            {
                const data = bytes.subarray(cursor + 8, end);
                const separator = data.indexOf(0);
                if (separator > 0 && separator <= 79)
                {
                    const key = this._decodeText(data.subarray(0, separator));
                    let text = null;
                    if (type === 0x74455874)
                    {
                        text = this._decodeText(data.subarray(separator + 1));
                    }
                    else
                    {
                        let start = separator + 2;
                        let compressed = true;
                        let valid = separator + 1 < data.length && data[separator + 1] === 0;
                        const international = type === 0x69545874;
                        if (international)
                        {
                            compressed = data[separator + 1] === 1;
                            valid = separator + 2 < data.length && data[separator + 1] <= 1 && (!compressed || data[separator + 2] === 0);
                            const languageEnd = data.indexOf(0, separator + 3);
                            const translatedEnd = languageEnd < 0 ? -1 : data.indexOf(0, languageEnd + 1);
                            valid &&= translatedEnd >= 0;
                            start = translatedEnd + 1;
                        }
                        if (valid)
                        {
                            try
                            {
                                const textBytes = compressed ? await decompressBytes(data.subarray(start), "deflate") : data.subarray(start);
                                text = international ? new TextDecoder("utf-8", { ignoreBOM: true }).decode(textBytes).split("\0", 1)[0] : this._decodeText(textBytes);
                            }
                            catch
                            {
                                // libpng treats an invalid compressed ancillary text chunk as a warning.
                            }
                        }
                    }
                    if (text !== null) metadata.metadata.push([ key, text ]);
                }
            }
            cursor = end + 4;
        }
    }

    /**
     * PNG's Latin-1 text is byte-valued; TextDecoder("latin1") is Windows-1252.
     * Native std::string construction stops at the first NUL.
     * @param {Uint8Array} bytes Text bytes.
     * @returns {string} Text with the native byte-to-character mapping.
     */
    static _decodeText(bytes)
    {
        let text = "";
        for (const byte of bytes)
        {
            if (byte === 0) break;
            text += String.fromCharCode(byte);
        }
        return text;
    }

    static extensions = [ ".png" ];
}


export default CjsPngFormat;

CjsSchema.meta.define("CjsPngFormat")(CjsPngFormat);
