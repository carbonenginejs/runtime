import { asUint8Array } from "#utils/bytes";
import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsImageFormat } from "../../format/CjsImageFormat.js";
import { BitmapDimensions, Cutout, ImageIOResult } from "#imageio";
import { PixelFormat, PixelFormatFromCanonical, TextureType } from "#consts/render-context";
import {
    DEFAULT_VALUES,
    canDecodeDdsBlockFormat,
    decodeDdsSlice,
    OUTPUT_IMAGE,
    OUTPUT_JSON,
    OUTPUT_RAW,
    OUTPUT_RGBA,
    OUTPUT_TEXTURE,
    inspectBytes,
    inspectWithValues,
    isDDS,
    probeSupportWithValues,
    normalizeValues,
    readWithValues,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsDdsFormat";

/**
 * The legacy (non-DX10) DDS formats this format's parser names with a DDS-only
 * string, mapped to Carbon's PixelFormat as Tr2DdsHandler's s_ddsFormats does
 * (imageio/Tr2DdsHandler.cpp:190-226). Everything else maps through
 * PixelFormatFromCanonical.
 */
const LEGACY_PIXEL_FORMATS = {
    "bgr8unorm": PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM,
    "bgrx8unorm": PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM,
    "rgbx8unorm": PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM,
    "l8unorm": PixelFormat.PIXEL_FORMAT_R8_UNORM,
    "l8a8unorm": PixelFormat.PIXEL_FORMAT_R8G8_UNORM,
    "a8unorm": PixelFormat.PIXEL_FORMAT_A8_UNORM,
    "rgb32float": PixelFormat.PIXEL_FORMAT_R32G32B32_FLOAT
};

/**
 * DDS texture format profile that inspects header metadata, probes output
 * support, and reads DDS bytes into raw, GPU-free texture, image, or
 * software-decoded RGBA and float payloads (BC1-BC5, BC7, and BC6H
 * included).
 */
export class CjsDdsFormat extends CjsImageFormat
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
     * Fill a HostBitmap from DDS bytes: Carbon's `Dds::ReadImage`
     * (imageio/Tr2DdsHandler.cpp:922-958), read through this format's own
     * header parser rather than a second one, so it covers every DDS variant the
     * parser does - more than Carbon's handler table.
     *
     * Kept from Carbon: mip skipping from `LoadParameters` (not for cubes,
     * DoReadHeader :484-515), 24-bit RGB expanded to 32-bit BGRX with X = 0
     * (`Convert24BitTo32Bit`, :774-795), and A8L8 read as R8G8 then converted
     * to BGRA (:863-868). The pixel data is copied as it lies: the file order is
     * the HostBitmap layout.
     *
     * adapted: a cube ARRAY loads whole (arraySize = 6 x cubes); Carbon's
     * CopyHeaderValuesToMembers always makes one cube (:447-449). Not yet
     * ported: the CCP-META trailer; metadata gets its default cutout only.
     *
     * @param {Uint8Array|ArrayBuffer} input DDS bytes.
     * @param {import("#imageio").LoadParameters} loadParameters Load parameters.
     * @param {object} bitmap Destination HostBitmap; only its methods are used.
     * @param {import("#imageio").Metadata|null} [metadata] Optional Metadata out.
     * @returns {ImageIOResult} The result.
     */
    static readImageNative(input, loadParameters, bitmap, metadata = null)
    {
        const Code = ImageIOResult.Code;
        const bytes = asUint8Array(input, "Image input");

        let meta;
        try
        {
            meta = inspectBytes(bytes);
        }
        catch (error)
        {
            return new ImageIOResult(Code.INVALID_HEADER, error.message);
        }

        if (meta.sourceFormat !== "dds") return new ImageIOResult(Code.INVALID_HEADER);

        const format = meta.hasDx10
            ? meta.dxgiFormat
            : LEGACY_PIXEL_FORMATS[meta.pixelFormat] ?? PixelFormatFromCanonical[meta.pixelFormat] ?? PixelFormat.PIXEL_FORMAT_UNKNOWN;

        if (format === PixelFormat.PIXEL_FORMAT_UNKNOWN)
        {
            return new ImageIOResult(Code.HEADER_NOT_SUPPORTED, `unsupported DDS format ${meta.textureFormat}`);
        }

        const isRgb24 = meta.pixelFormat === "bgr8unorm";
        const description = {
            type: meta.isCube ? TextureType.TEX_TYPE_CUBE : (meta.isVolume ? TextureType.TEX_TYPE_3D : TextureType.TEX_TYPE_2D),
            format,
            width: meta.width,
            height: meta.height,
            depth: meta.isVolume ? Math.max(meta.depth, 1) : 1,
            mipCount: meta.mipCount,
            arraySize: meta.isCube ? 6 * Math.max(meta.arraySize, 1) : Math.max(meta.arraySize, 1)
        };

        let skipBytes = 0;

        if (!meta.isCube)
        {
            const full = new BitmapDimensions(description);
            const range = loadParameters.GetMipLevelRange(meta.width, meta.height, meta.hasMipMaps ? meta.mipCount : 0);

            if (range.skipCount)
            {
                for (let i = 0; i < range.skipCount; ++i)
                {
                    skipBytes += isRgb24
                        ? full.GetMipWidth(i) * full.GetMipHeight(i) * full.GetMipDepth(i) * 3
                        : full.GetMipSize(i);
                }

                description.mipCount = range.mipCount;
                description.width = meta.width >>> range.skipCount;
                description.height = meta.height >>> range.skipCount;
                description.depth = Math.max(1, description.depth >>> range.skipCount);
            }
        }

        if (metadata) metadata.cutout = new Cutout();

        if (!bitmap.CreateFromBitmapDimensions(new BitmapDimensions(description)))
        {
            return new ImageIOResult(Code.ERROR_CREATING_BITMAP);
        }

        const dst = bitmap.GetRawData();
        const elementSize = bitmap.GetArrayElementSize();
        const sourceElementSize = isRgb24 ? Math.floor(elementSize / 4) * 3 : elementSize;
        let cursor = meta.dataOffset;

        for (let element = 0; element < bitmap.GetArraySize(); ++element)
        {
            cursor += skipBytes;
            const source = bytes.subarray(cursor, Math.min(cursor + sourceElementSize, bytes.length));

            if (isRgb24)
            {
                // Convert24BitTo32Bit (Tr2DdsHandler.cpp:774-795): BGR -> BGRX, X = 0.
                for (let s = 0, d = element * elementSize; s + 2 < source.length; s += 3)
                {
                    dst[d++] = source[s];
                    dst[d++] = source[s + 1];
                    dst[d++] = source[s + 2];
                    dst[d++] = 0;
                }
            }
            else
            {
                // quirk: a short file leaves a zeroed tail rather than failing,
                // as a CCP stream's partial Read does.
                dst.set(source, element * elementSize);
            }

            cursor += sourceElementSize;
        }

        if (meta.pixelFormat === "l8a8unorm" && !bitmap.ConvertFormat(PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM))
        {
            bitmap.Destroy();
            return new ImageIOResult(Code.ERROR_CONVERTING_FORMAT);
        }

        return new ImageIOResult(Code.OK);
    }

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
