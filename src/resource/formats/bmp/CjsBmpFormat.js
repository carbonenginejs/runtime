// Source: imageio/include/Tr2BmpHandler.h
// Source: imageio/Tr2BmpHandler.cpp
import { CjsSchema } from "#schema/CjsSchema";
import { asUint8Array } from "#utils/bytes";
import { HostBitmap, ImageIOResult } from "#imageio";
import { PixelFormat } from "#consts/render-context";
import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsImageFormat } from "../../format/CjsImageFormat.js";
import { doReadHeader, getFormat, readImage } from "./core/helpers.js";
import { isSaveSupported, save } from "./core/writer.js";

/**
 * Standalone Carbon BMP reader/writer with the existing ImageIO adapter.
 * Reads bottom-up, uncompressed 24/32-bit BMPs into native BGRX/BGRA storage;
 * normalized payload conversion belongs to the shared image base.
 */
export class CjsBmpFormat extends CjsImageFormat
{
    /**
     * Read using instance defaults and per-call overrides.
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input BMP file bytes.
     * @param {object|null} [options=null] Output options.
     * @returns {object} Raw record or normalized RGBA image.
     */
    Read(input, options = null)
    {
        return CjsBmpFormat.read(input, { ...this.options, ...(options || {}) });
    }

    /**
     * Write a normalized RGBA payload through shared ImageIO conversion.
     * @param {object} payload RGBA8 pixels, width, height and optional strideBytes.
     * @returns {Uint8Array} BMP file bytes.
     */
    Write(payload)
    {
        return CjsBmpFormat.write(payload);
    }

    /**
     * Identify the BM signature independently of decode support.
     * @param {string|null} _filename Optional resource path; unused.
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input Candidate bytes.
     * @returns {boolean} Whether the signature is BMP.
     */
    static is(_filename, input)
    {
        try
        {
            const bytes = asUint8Array(input, "BMP input");
            return bytes.length >= 2 && bytes[0] === 66 && bytes[1] === 77;
        }
        catch
        {
            return false;
        }
    }

    /**
     * Inspect Carbon-supported headers without reading or converting pixels.
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input BMP file bytes.
     * @returns {object} Native header fields, byte length and numeric pixel format.
     * @throws {Error} With an ImageIO result code for a failed header read.
     */
    static inspect(input)
    {
        const bytes = asUint8Array(input, "BMP input");
        const { code, header } = doReadHeader(bytes);
        if (code !== ImageIOResult.Code.OK)
        {
            throw Object.assign(new Error(new ImageIOResult(code).GetErrorMessage()), { code });
        }
        return { sourceFormat: "bmp", byteLength: bytes.length, ...header, pixelFormat: getFormat(header) };
    }

    /**
     * Read retained source bytes or normalized RGBA through shared conversion.
     * Raw is the default, like the sibling image profiles. Use ImageIO's
     * native hook to retain Carbon's BGRX/BGRA storage rather than an RGBA view.
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input BMP file bytes.
     * @param {object|null} [options=null] emit: raw, rgba or image.
     * @returns {object} Raw record or top-left RGBA8 image payload.
     * @throws {TypeError} For an unknown output.
     * @throws {Error} When native decoding or shared conversion fails.
     */
    static read(input, options = null)
    {
        const bytes = asUint8Array(input, "BMP input");
        const metadata = this.inspect(bytes), emit = options?.emit ?? "raw";
        if (emit === "raw") return { sourceFormat: "bmp", mimeType: "image/bmp", metadata, bytes };
        if (emit !== "rgba" && emit !== "image") throw new TypeError(`CjsBmpFormat: unknown emit value ${JSON.stringify(emit)}`);
        const bitmap = new HostBitmap();
        const result = this.readImageNative(bytes, null, bitmap);
        if (!result.IsOk()) throw Object.assign(new Error(result.GetErrorMessage()), { code: result.code });
        if (!this.convertImage(bitmap, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM))
        {
            const code = ImageIOResult.Code.ERROR_CONVERTING_FORMAT;
            throw Object.assign(new Error(new ImageIOResult(code).GetErrorMessage()), { code });
        }
        return { sourceFormat: "bmp", mimeType: "image/bmp",
            width: metadata.width, height: metadata.height, pixelFormat: "rgba8unorm",
            strideBytes: metadata.width * 4, origin: "top-left", colorSpace: "srgb",
            alphaMode: metadata.bitCount === 24 ? "opaque" : "straight", metadata, data: bitmap.GetRawData() };
    }

    /**
     * Carbon ReadImage with the existing byte-input handler signature.
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input BMP file bytes.
     * @param {import("#imageio").LoadParameters|null} _loadParameters Unused by Carbon BMP.
     * @param {HostBitmap} bitmap Destination native bitmap.
     * @param {import("#imageio").Metadata|null} [metadata=null] Metadata output.
     * @returns {ImageIOResult} Decode status.
     */
    static readImageNative(input, _loadParameters, bitmap, metadata = null)
    {
        return readImage(input, bitmap, metadata);
    }

    /**
     * Carbon IsSaveSupported (Tr2BmpHandler.cpp:257-267).
     * @param {import("#imageio").BitmapDimensions} dimensions Source dimensions.
     * @returns {ImageIOResult} Whether native BGRX/BGRA BMP writing is supported.
     */
    static isSaveSupported(dimensions)
    {
        return isSaveSupported(dimensions);
    }

    /**
     * Carbon Save, retaining native format acceptance and size-field quirks.
     * @param {HostBitmap} bitmap Source bitmap.
     * @param {import("#imageio").Metadata|null} [_metadata=null] Ignored by Carbon.
     * @returns {{result: ImageIOResult, bytes: Uint8Array|null}} Status and bytes.
     */
    static save(bitmap, _metadata = null)
    {
        return save(bitmap);
    }

    /**
     * Write normalized RGBA with the existing shared RGBA-to-BGRA adapter.
     * This payload convenience is separate from native Save's format contract.
     * @param {object} payload RGBA8 pixels, width, height and optional strideBytes.
     * @returns {Uint8Array} BMP bytes.
     * @throws {Error} When shared conversion or saving fails.
     */
    static write(payload)
    {
        const bitmap = new HostBitmap();
        const converted = this.readImageFromRgbaPayload(payload, bitmap);
        if (!converted.IsOk()) throw Object.assign(new Error(converted.GetErrorMessage()), { code: converted.code });
        const saved = this.save(bitmap);
        if (!saved.result.IsOk()) throw Object.assign(new Error(saved.result.GetErrorMessage()), { code: saved.result.code });
        return saved.bytes;
    }

    static className = "CjsBmpFormat";

    static id = "CjsBmpFormat";

    static extensions = [ ".bmp" ];

    static inputs = CjsFormat.defineInputs({ rgba: { default: true } });

    static outputs = CjsFormat.defineOutputs({
        image: { decoded: true, probes: [ "image", "rgba" ] },
        rgba: { decoded: true },
        raw: { role: "debug", default: true, passthrough: true }
    });
}

export default CjsBmpFormat;
CjsSchema.meta.define("CjsBmpFormat")(CjsBmpFormat);
