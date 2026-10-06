// Source: imageio/include/PsdHandler.h
// Source: imageio/PsdHandler.cpp
import { asUint8Array } from "#utils/bytes";
import { HostBitmap, ImageIOResult } from "#imageio";
import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsImageFormat } from "../../format/CjsImageFormat.js";
import { toJsonWithByteSummary } from "../../format/jsonPolicies.js";
import { doReadHeader, getFormat, readImage } from "./core/helpers.js";
import { isSaveSupported, save } from "./core/writer.js";

/**
 * Carbon Psd namespace as a standalone image format: reads the stored merged
 * image and writes uncompressed 8-bit grayscale, RG, BGRX and BGRA bitmaps.
 * The decorator-free facade and raw/image/rgba outputs follow CjsImageFormat;
 * the native handler preserves Carbon's channel-dependent pixel formats.
 */
export class CjsPsdFormat extends CjsImageFormat
{
    /**
     * Read with this profile's defaults and per-call overrides.
     *
     * @param {Uint8Array|ArrayBuffer} input PSD file bytes.
     * @param {object} [options={}] Per-call overrides of the profile options.
     * @param {string} [options.emit="raw"] Output to emit: "raw", "rgba" or "image".
     * @returns {object} The raw record or the RGBA image payload.
     */
    Read(input, options = {})
    {
        return CjsPsdFormat.read(input, { ...this.options, ...options });
    }

    /**
     * Encode the sibling formats' RGBA payload through Carbon's BGRA writer.
     *
     * @param {object} payload RGBA8 image payload: width, height, data, strideBytes.
     * @returns {Uint8Array} The PSD file bytes.
     */
    Write(payload)
    {
        return CjsPsdFormat.write(payload);
    }

    /**
     * Convert a payload to the shared JSON debug representation.
     *
     * @param {*} value Value to convert; any payload or record.
     * @returns {*} The value with byte arrays replaced by byte-length summaries.
     */
    ToJSON(value)
    {
        return toJsonWithByteSummary(value);
    }

    /**
     * Read raw bytes or the common RGBA image payload. Native callers use
     * readImageNative/carbon to retain Carbon's R8, RG8, BGRX or BGRA storage.
     *
     * @param {Uint8Array|ArrayBuffer} input PSD file bytes.
     * @param {object} [options={}] Reader options.
     * @param {string} [options.emit="raw"] Output to emit: "raw", "rgba" or "image".
     * @returns {object} The raw record, or the RGBA image payload.
     * @throws {TypeError} When the emit value is unknown.
     * @throws {Error} When the header or pixel data cannot be read.
     */
    static read(input, options = {})
    {
        const bytes = asUint8Array(input, "PSD input");
        const metadata = this.inspect(bytes);
        const emit = options.emit ?? "raw";
        if (emit === "raw") return { sourceFormat: "psd", mimeType: "image/vnd.adobe.photoshop", metadata, bytes };
        if (emit !== "rgba" && emit !== "image") throw new TypeError(`CjsPsdFormat: unknown emit value ${JSON.stringify(emit)}`);
        const bitmap = new HostBitmap();
        const result = this.readImageNative(bytes, null, bitmap);
        if (!result.IsOk()) throw Object.assign(new Error(result.GetErrorMessage()), { code: result.code });
        const source = bitmap.GetRawData();
        const channels = metadata.channelCount;
        const bpp = channels === 3 ? 4 : channels || 4;
        const data = new Uint8Array(metadata.width * metadata.height * 4); // alloc: returned RGBA payload owns its pixels.
        for (let i = 0; i < metadata.width * metadata.height; i++)
        {
            const from = i * bpp, to = i * 4;
            data[to] = source[from + (channels >= 3 ? 2 : 0)];
            data[to + 1] = source[from + (channels >= 3 ? 1 : 0)];
            data[to + 2] = source[from];
            data[to + 3] = channels === 2 ? source[from + 1] : channels === 4 ? source[from + 3] : 255;
        }
        return { sourceFormat: "psd", mimeType: "image/vnd.adobe.photoshop",
            width: metadata.width, height: metadata.height, pixelFormat: "rgba8unorm",
            strideBytes: metadata.width * 4, origin: "top-left", colorSpace: "srgb",
            alphaMode: channels === 2 || channels === 4 ? "straight" : "opaque", metadata, data };
    }

    /**
     * Inspect Carbon's supported header and the merged-image byte offset.
     *
     * @param {Uint8Array|ArrayBuffer} input PSD file bytes.
     * @returns {object} The header fields plus sourceFormat, byteLength and pixelFormat.
     * @throws {Error} When the header is invalid or unsupported.
     */
    static inspect(input)
    {
        const bytes = asUint8Array(input, "PSD input");
        const { code, header } = doReadHeader(bytes);
        if (code !== ImageIOResult.Code.OK)
        {
            throw Object.assign(new Error(new ImageIOResult(code).GetErrorMessage()), { code });
        }
        return { sourceFormat: "psd", byteLength: bytes.length, ...header, pixelFormat: getFormat(header) };
    }

    /**
     * Identify the PSD signature independently of decoder limitations.
     *
     * @param {string|null} _filename Resource path; unused.
     * @param {Uint8Array|ArrayBuffer} input Candidate bytes.
     * @returns {boolean} True when the 8BPS signature is present.
     */
    static is(_filename, input)
    {
        try
        {
            const bytes = asUint8Array(input, "PSD input");
            return bytes.length >= 4 && bytes[0] === 56 && bytes[1] === 66 && bytes[2] === 80 && bytes[3] === 83;
        }
        catch
        {
            return false;
        }
    }

    /**
     * Carbon ReadImage adapted to the existing byte-input native handler hook.
     *
     * @param {Uint8Array|ArrayBuffer} input PSD file bytes.
     * @param {import("#imageio").LoadParameters|null} _loadParameters Load parameters; unused.
     * @param {HostBitmap} bitmap Destination bitmap.
     * @param {import("#imageio").Metadata|null} [metadata=null] Optional metadata out.
     * @returns {ImageIOResult} The read result.
     */
    static readImageNative(input, _loadParameters, bitmap, metadata = null)
    {
        return readImage(input, bitmap, metadata);
    }

    /**
     * Carbon IsSaveSupported; accepts the four native 8-bit pixel formats.
     *
     * @param {import("#imageio").BitmapDimensions} dimensions Dimensions of the bitmap to save.
     * @returns {ImageIOResult} OK, or SAVE_NOT_SUPPORTED.
     */
    static isSaveSupported(dimensions)
    {
        return isSaveSupported(dimensions);
    }

    /**
     * Carbon Save adapted to ImageIO's {result, bytes} stream replacement.
     *
     * @param {HostBitmap} bitmap Bitmap to encode.
     * @param {import("#imageio").Metadata|null} [_metadata=null] Metadata; unused.
     * @returns {{result: ImageIOResult, bytes: Uint8Array|null}} The result and, on success, the PSD file bytes.
     */
    static save(bitmap, _metadata = null)
    {
        return save(bitmap);
    }

    /**
     * Encode normalized RGBA using the existing RGBA-to-HostBitmap adapter.
     *
     * @param {object} payload RGBA8 image payload: width, height, data, strideBytes.
     * @returns {Uint8Array} The PSD file bytes.
     * @throws {Error} When the payload cannot be converted or saved.
     */
    static write(payload)
    {
        const bitmap = new HostBitmap();
        const result = this.readImageFromRgbaPayload(payload, bitmap);
        if (!result.IsOk()) throw new Error(result.GetErrorMessage());
        const saved = this.save(bitmap);
        if (!saved.result.IsOk()) throw new Error(saved.result.GetErrorMessage());
        return saved.bytes;
    }

    /**
     * Convert output to the shared JSON debug representation.
     *
     * @param {*} value Value to convert; any payload or record.
     * @returns {*} The value with byte arrays replaced by byte-length summaries.
     */
    static toJSON(value)
    {
        return toJsonWithByteSummary(value);
    }

    static className = "CjsPsdFormat";

    static id = "CjsPsdFormat";

    static extensions = [ ".psd" ];

    static inputs = CjsFormat.defineInputs({ rgba: { default: true } });

    static outputs = CjsFormat.defineOutputs({
        image: { decoded: true, probes: [ "image", "rgba" ] },
        rgba: { decoded: true },
        raw: { role: "debug", default: true, passthrough: true }
    });
}

export default CjsPsdFormat;
