import { CjsImageFormat } from "../../../format/CjsImageFormat.js";

import { asUint8Array, readU16BE, readU16LE, readU32BE, readU32LE } from "#utils/bytes";
import { decodeBc6h } from "./bc6h.js";
import { decodeBc7 } from "./bc7.js";

/**
 * True when `bytes` opens with the DDS magic AND a well-formed header size.
 *
 * The size check is what separates this from a bare magic test: `DDS ` followed
 * by anything is not a DDS file, and accepting it sends a caller into a header
 * parse that cannot succeed.
 *
 * @param {Uint8Array} bytes Candidate bytes.
 * @returns {boolean} Whether the container is DDS.
 */
export function isDDS(bytes)
{
    return bytes.byteLength >= DDS_HEADER_SIZE + 4 &&
        bytes[0] === 0x44 && bytes[1] === 0x44 && bytes[2] === 0x53 && bytes[3] === 0x20 &&
        readU32LE(bytes, 4) === DDS_HEADER_SIZE;
}

export const OUTPUT_IMAGE = "image";
export const OUTPUT_TEXTURE = "texture";
export const OUTPUT_RGBA = "rgba";
export const OUTPUT_RAW = "raw";

export const DEFAULT_VALUES = {
    emit: OUTPUT_RAW,
    inputType: "",
    source: ""
};

const DDS_HEADER_SIZE = 124;
const DDS_PIXELFORMAT_OFFSET = 76;
const DDS_FOURCC = 0x00000004;
const DDS_RGB = 0x00000040;
const DDS_ALPHAPIXELS = 0x00000001;
const DDS_ALPHA = 0x00000002;
const DDS_LUMINANCE = 0x00020000;
const DDSCAPS2_CUBEMAP = 0x00000200;
const DDS_HEADER_FLAGS_VOLUME = 0x00800000; // DDSD_DEPTH (Tr2DdsHandler.cpp:23).

const DDS_CUBE_FACE_FLAGS = [
    [ "positive-x", 0x00000400 ],
    [ "negative-x", 0x00000800 ],
    [ "positive-y", 0x00001000 ],
    [ "negative-y", 0x00002000 ],
    [ "positive-z", 0x00004000 ],
    [ "negative-z", 0x00008000 ]
];

const FOURCC_PIXEL_FORMATS = Object.freeze({
    DXT1: "bc1-rgba-unorm",
    DXT3: "bc2-rgba-unorm",
    DXT5: "bc3-rgba-unorm",
    ATI1: "bc4-r-unorm",
    BC4U: "bc4-r-unorm",
    BC4S: "bc4-r-snorm",
    ATI2: "bc5-rg-unorm",
    BC5U: "bc5-rg-unorm",
    BC5S: "bc5-rg-snorm"
});

const DXGI_PIXEL_FORMATS = Object.freeze({
    2: "rgba32float",
    6: "rgb32float",
    10: "rgba16float",
    16: "rg32float",
    34: "rg16float",
    41: "r32float",
    54: "r16float",
    56: "r16unorm",
    28: "rgba8unorm",
    29: "rgba8unorm-srgb",
    49: "rg8unorm",
    61: "r8unorm",
    71: "bc1-rgba-unorm",
    72: "bc1-rgba-unorm-srgb",
    74: "bc2-rgba-unorm",
    75: "bc2-rgba-unorm-srgb",
    77: "bc3-rgba-unorm",
    78: "bc3-rgba-unorm-srgb",
    80: "bc4-r-unorm",
    81: "bc4-r-snorm",
    83: "bc5-rg-unorm",
    84: "bc5-rg-snorm",
    87: "bgra8unorm",
    88: "bgrx8unorm",
    91: "bgra8unorm-srgb",
    93: "bgrx8unorm-srgb",
    95: "bc6h-rgb-ufloat",
    96: "bc6h-rgb-float",
    98: "bc7-rgba-unorm",
    99: "bc7-rgba-unorm-srgb"
});

const COMPRESSED_PIXEL_FORMATS = new Set([
    "bc1-rgba-unorm",
    "bc1-rgba-unorm-srgb",
    "bc2-rgba-unorm",
    "bc2-rgba-unorm-srgb",
    "bc3-rgba-unorm",
    "bc3-rgba-unorm-srgb",
    "bc4-r-unorm",
    "bc4-r-snorm",
    "bc5-rg-unorm",
    "bc5-rg-snorm",
    "bc6h-rgb-ufloat",
    "bc6h-rgb-float",
    "bc7-rgba-unorm",
    "bc7-rgba-unorm-srgb"
]);


/**
 * Normalized DDS reader options.
 *
 * @typedef {object} DdsValues
 * @property {string} emit Output to emit: "bitmap", "image", "texture", "rgba" or "raw".
 * @property {string} inputType Lower-case expected source type without a leading dot, or "".
 * @property {string} source Diagnostic source label, or "".
 * @property {boolean} [expandLegacy] For "texture", rewrite 24-bit and L8A8 payloads to 32-bit.
 */

/**
 * DDS header metadata read without decoding pixel data.
 *
 * Unrecognized bytes produce only `{ sourceFormat: "", width: 0, height: 0 }`.
 *
 * @typedef {object} DdsInspection
 * @property {string} sourceFormat "dds", the expected type, or "" for unrecognized bytes.
 * @property {number} [byteLength] Input length in bytes (set by `inspectWithValues`).
 * @property {number} width Top-level width.
 * @property {number} height Top-level height.
 * @property {number} [headerSize] Declared header size (124).
 * @property {number} [depth] Declared depth.
 * @property {number} [mipCount] Mip count, at least 1.
 * @property {number} [pitchOrLinearSize] Header pitch/linear size field.
 * @property {number} [pfFlags] Pixel format flags.
 * @property {string} [fourCc] FourCC as text with trailing NULs removed.
 * @property {number} [fourCcCode] FourCC as a little-endian integer.
 * @property {number} [rgbBitCount] Pixel format bit count.
 * @property {number} [rBitMask] Red mask.
 * @property {number} [gBitMask] Green mask.
 * @property {number} [bBitMask] Blue mask.
 * @property {number} [aBitMask] Alpha mask.
 * @property {number} [caps2] Caps2 field.
 * @property {boolean} [hasDx10] Whether a DX10 header extension is present.
 * @property {number} [dxgiFormat] DXGI format from the DX10 header, or 0.
 * @property {number} [resourceDimension] DX10 resource dimension, or 0.
 * @property {number} [arraySize] Array size; a cube's count of cubes.
 * @property {number} [dataOffset] Byte offset of the pixel data (128 or 148).
 * @property {number} [dataBytes] Bytes after `dataOffset`.
 * @property {?number} [expectedDataBytes] Bytes every subresource needs, or null for an unknown format.
 * @property {boolean} [isDataComplete] Whether `dataBytes` covers `expectedDataBytes`.
 * @property {?number} [missingDataBytes] Shortfall in bytes, or null.
 * @property {?number} [extraDataBytes] Trailing bytes past the pixel data, or null.
 * @property {number} [faces] 6 for a cube, otherwise 1.
 * @property {string[]} [cubeFaces] Cube face names flagged in caps2.
 * @property {boolean} [isCubeComplete] Whether all six cube faces are flagged.
 * @property {boolean} [isCube] Whether caps2 marks a cube map.
 * @property {boolean} [isVolume] Whether the header flags mark a volume.
 * @property {string} [dimension] "1d", "2d", "3d" or "cube".
 * @property {string} [pixelFormat] Canonical pixel format name, or "" when unrecognized.
 * @property {string} [textureFormat] `pixelFormat`, the FourCC, or "dds-legacy".
 * @property {boolean} [isCompressed] Whether the format is block-compressed.
 * @property {boolean} [nativeTextureOnly] Compressed with no software RGBA decoder.
 * @property {boolean} [hasAlpha] Whether the format carries alpha.
 * @property {boolean} [hasMipMaps] Whether the header declares more than one mip.
 */

/**
 * Location and layout of one mip of one array layer or cube face.
 *
 * @typedef {object} DdsSubresource
 * @property {number} mip Mip level.
 * @property {number} layer Layer index across arrays and cube faces.
 * @property {number} arrayIndex Array element (cube index for cubes).
 * @property {number} face Cube face index, or 0.
 * @property {number} offset Byte offset from the start of the pixel data.
 * @property {number} byteLength Bytes in this subresource.
 * @property {number} rowPitch Bytes per row (per block row for BC formats).
 * @property {number} slicePitch Bytes per depth slice.
 * @property {number} width Mip width.
 * @property {number} height Mip height.
 * @property {number} depth Mip depth.
 */

/**
 * Native bitmap description shared by the DDS reader, writer and encoder.
 *
 * @typedef {object} DdsBitmapDescription
 * @property {number} type TextureType.
 * @property {number} format PixelFormat.
 * @property {number} width Top-level width.
 * @property {number} height Top-level height.
 * @property {number} depth Top-level depth.
 * @property {number} mipCount Mip count.
 * @property {number} arraySize Array size (6 per cube for cubes).
 */

/**
 * Plain bitmap packet: a description, its complete native storage and metadata.
 *
 * @typedef {object} DdsBitmapPacket
 * @property {string} [sourceFormat] "dds" on packets this format produces.
 * @property {DdsBitmapDescription} description Bitmap description.
 * @property {Uint8Array} data Every subresource, in HostBitmap order.
 * @property {?{cutout?:object,metadata:Array<[string, string]>}} [metadata] Cutout and CCP-META string pairs.
 */

/**
 * Caller input to `selectCompression`.
 *
 * @typedef {object} DdsCompressionRequest
 * @property {boolean} enabled Whether on-load compression is wanted at all.
 * @property {string} backend Selected backend.
 * @property {string} role Texture role from the caller's asset semantics.
 * @property {Iterable<string>} features Active device feature names.
 */

/**
 * Result of `selectCompression`.
 *
 * @typedef {object} DdsCompressionChoice
 * @property {?number} mode Carbon compression mode, or null when skipped.
 * @property {string} reason Why the mode was chosen or skipped.
 */

/**
 * Unique colours of one 4x4 block, built by `colourSet` in `libsquish.js`.
 *
 * @typedef {object} SquishColourSet
 * @property {Array<number[]>} points Unique RGB colours in 0..1.
 * @property {number[]} weights Square root of each colour's texel count.
 * @property {number[]} remap Point index per texel, or -1 for masked or transparent texels.
 * @property {boolean} transparent Whether a valid texel was dropped as transparent (DXT1).
 */

/**
 * Normalizes reader options against their supported defaults for the DDS format
 * reader.
 *
 * @param {Partial<DdsValues>|null} [base=DEFAULT_VALUES] Values to start from.
 * @param {Partial<DdsValues>|null} [options={}] Caller options layered over `base`.
 * @param {string} [options.emit] Output to emit.
 * @param {string} [options.inputType] Expected source type.
 * @param {string} [readerName="CjsImageFormat"] Name used in error messages.
 * @returns {DdsValues} The normalized values.
 */
export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsImageFormat")
{
    const values = { ...DEFAULT_VALUES, ...(base || {}), ...(options || {}) };
    values.inputType = normalizeInputType(values.inputType);
    values.emit = normalizeEmit(values.emit, values.inputType, readerName);
    return values;
}

/**
 * Normalizes the requested input representation for the DDS format reader.
 *
 * @param {?string} inputType Type or extension, with or without a leading dot.
 * @returns {string} Lower-case type with "jpg" mapped to "jpeg", or "" when empty.
 */
export function normalizeInputType(inputType)
{
    if (!inputType) return "";
    const value = String(inputType).replace(/^\./u, "").toLowerCase();
    return value === "jpg" ? "jpeg" : value;
}

/**
 * Normalizes the requested output representation for the DDS format reader.
 *
 * @param {?string} emit Requested output.
 * @param {string} inputType Normalized input type.
 * @param {string} readerName Name used in error messages.
 * @returns {string} The emit value, or "raw" when none was given.
 * @throws {TypeError} When `emit` is not "bitmap", "image", "texture", "rgba" or "raw".
 */
export function normalizeEmit(emit, inputType, readerName)
{
    if (emit === undefined || emit === null) return OUTPUT_RAW;
    if ([ "bitmap", OUTPUT_IMAGE, OUTPUT_TEXTURE, OUTPUT_RGBA, OUTPUT_RAW].includes(emit)) return emit;
    throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(emit)}`);
}

/**
 * Inspects input using normalized format options for the DDS format reader.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
 * @param {DdsValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @param {string} [expectedType=""] Required detected type, or "" to accept any.
 * @returns {DdsInspection} The header metadata with `byteLength`.
 * @throws {TypeError} When the detected type does not match `expectedType`.
 */
export function inspectWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    const bytes = asUint8Array(input, "Image input");
    const detected = inspectBytes(bytes);
    const sourceFormat = expectedType || values.inputType || detected.sourceFormat;

    if (expectedType && detected.sourceFormat !== expectedType)
    {
        throw new TypeError(`not a ${expectedType.toUpperCase()}`);
    }

    return {
        sourceFormat,
        byteLength: bytes.byteLength,
        ...detected
    };
}

/**
 * Reports whether input is supported under normalized format options for the DDS
 * format reader.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
 * @param {DdsValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @param {string} [expectedType=""] Required detected type, or "" to accept any.
 * @returns {object} Support report with compressed, texture, rgba and raw variants, or
 *     `supported` "none" with the error message when inspection fails.
 */
export function probeSupportWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    try
    {
        const metadata = inspectWithValues(input, values, expectedType);
        const hasCompleteTextureData = metadata.isDataComplete !== false;
        const canEmitTexture = metadata.sourceFormat === "dds" && metadata.dataOffset > 0 && !!metadata.pixelFormat && hasCompleteTextureData;
        const canEmitRgba = canDecodeDdsToRgba(metadata) && hasCompleteTextureData;
        const textureUnsupportedReason = !metadata.pixelFormat
            ? "DDS texture format is not recognized yet."
            : !hasCompleteTextureData
                ? `DDS texture data is truncated: expected ${metadata.expectedDataBytes} bytes, got ${metadata.dataBytes}.`
                : "";
        const variants = metadata.sourceFormat === "dds"
            ? [
                {
                    kind: "compressed",
                    codec: metadata.pixelFormat || metadata.textureFormat || "unknown",
                    supported: canEmitTexture && metadata.isCompressed,
                    reason: metadata.isCompressed ? textureUnsupportedReason : "DDS is not block-compressed."
                },
                {
                    kind: "texture",
                    codec: metadata.pixelFormat || metadata.textureFormat || "unknown",
                    supported: canEmitTexture,
                    reason: canEmitTexture ? "" : textureUnsupportedReason
                },
                {
                    kind: "rgba",
                    codec: canEmitRgba
                        ? (isFloatPixelFormat(metadata.pixelFormat) ? "rgba32float" : "rgba8unorm")
                        : "rgba8unorm",
                    supported: canEmitRgba,
                    reason: canEmitRgba
                        ? ""
                        : textureUnsupportedReason || (metadata.nativeTextureOnly
                            ? `${metadata.pixelFormat} is available as a native compressed texture only; register a software decoder or alternate representation for RGBA fallback.`
                            : "DDS RGBA decode is not implemented for this pixel format.")
                },
                { kind: "raw", codec: "dds", supported: true }
            ]
            : [
                { kind: "rgba", codec: "rgba8", supported: false, reason: `${metadata.sourceFormat.toUpperCase()} RGBA decode is not implemented yet.` }
            ];
        const preferredVariant = variants.find(v => v.supported && v.kind !== "raw") || variants.find(v => v.supported);

        return {
            format: metadata.sourceFormat,
            source: values.source || "buffer",
            supported: metadata.sourceFormat ? (variants.some(v => v.supported && v.kind !== "raw") ? "full" : (variants.some(v => v.supported) ? "partial" : "none")) : "none",
            confidence: metadata.sourceFormat ? 1 : 0,
            preferredOutput: preferredVariant?.kind || "",
            reason: metadata.sourceFormat ? "Container/header recognized." : "Unrecognized image format.",
            metadata,
            variants,
            warnings: [],
            errors: []
        };
    }
    catch (error)
    {
        return {
            format: expectedType || values.inputType || "",
            source: values.source || "buffer",
            supported: "none",
            confidence: 0,
            preferredOutput: "",
            reason: error.message,
            metadata: null,
            variants: [],
            warnings: [],
            errors: [ error.message ]
        };
    }
}

/**
 * Reads input using normalized format options for the DDS format reader.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
 * @param {DdsValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @param {string} [expectedType=""] Required detected type, or "" to accept any.
 * @returns {object} `{ sourceFormat, metadata, bytes }` for "raw", the texture payload
 *     with subresources for "texture", or the decoded RGBA payload for "rgba"/"image".
 * @throws {Error} With code `CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED` for any other output.
 */
export function readWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    const bytes = asUint8Array(input, "Image input");
    const metadata = inspectWithValues(bytes, values, expectedType);

    if (values.emit === OUTPUT_RAW)
    {
        return {
            sourceFormat: metadata.sourceFormat,
            metadata,
            bytes
        };
    }

    if (values.emit === OUTPUT_TEXTURE && metadata.sourceFormat === "dds")
    {
        return readDdsTexture(bytes, metadata, values);
    }

    if ((values.emit === OUTPUT_RGBA || values.emit === OUTPUT_IMAGE) && metadata.sourceFormat === "dds")
    {
        return readDdsToRgba(bytes, metadata);
    }

    const error = new Error(`${metadata.sourceFormat}: emit "${values.emit}" is not implemented yet`);
    error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
    error.sourceFormat = metadata.sourceFormat;
    error.emit = values.emit;
    throw error;
}


/**
 * Inspects the supplied bytes without decoding their payload for the DDS format
 * reader.
 *
 * @param {Uint8Array} bytes File bytes.
 * @returns {DdsInspection} DDS header metadata, or `{ sourceFormat: "", width: 0, height: 0 }`
 *     when the bytes are not a DDS.
 * @throws {RangeError} When a DX10 1D texture declares a height other than one.
 */
export function inspectBytes(bytes)
{
    return isDDS(bytes) ? inspectDDS(bytes) : { sourceFormat: "", width: 0, height: 0 };
}







/**
 * Parses the DDS header and DX10 extension into metadata.
 *
 * @param {Uint8Array} bytes File bytes with a valid DDS magic and header size.
 * @returns {DdsInspection} The header metadata.
 * @throws {RangeError} When a DX10 1D texture declares a height other than one.
 */
function inspectDDS(bytes)
{
    const headerSize = readU32LE(bytes, 4);
    const pfOffset = DDS_PIXELFORMAT_OFFSET;
    const pfFlags = readU32LE(bytes, pfOffset + 4);
    const fourCcCode = readU32LE(bytes, pfOffset + 8);
    const fourCc = String.fromCharCode(bytes[84], bytes[85], bytes[86], bytes[87]).replace(/\0+$/u, "");
    const rgbBitCount = readU32LE(bytes, pfOffset + 12);
    const rBitMask = readU32LE(bytes, pfOffset + 16);
    const gBitMask = readU32LE(bytes, pfOffset + 20);
    const bBitMask = readU32LE(bytes, pfOffset + 24);
    const aBitMask = readU32LE(bytes, pfOffset + 28);
    const caps2 = readU32LE(bytes, 112);
    const isCube = !!(caps2 & DDSCAPS2_CUBEMAP);
    // Carbon IsVolumeTexture uses dwHeaderFlags, not dwCubemapFlags/caps2
    // (imageio/Tr2DdsHandler.cpp:350-352). Shipped volumes can leave caps2 zero.
    const isVolume = !!(readU32LE(bytes, 8) & DDS_HEADER_FLAGS_VOLUME);
    const cubeFaces = getDdsCubeFaces(caps2);
    const hasDx10 = fourCc === "DX10" && bytes.byteLength >= 148;
    const dxgiFormat = hasDx10 ? readU32LE(bytes, 128) : 0;
    const resourceDimension = hasDx10 ? readU32LE(bytes, 132) : 0;
    const declaredArraySize = hasDx10 ? readU32LE(bytes, 140) : 1;
    const dataOffset = hasDx10 ? 148 : 128;
    const pixelFormat = getDdsPixelFormat({ pfFlags, fourCc, fourCcCode, rgbBitCount, rBitMask, gBitMask, bBitMask, aBitMask, dxgiFormat });
    const width = readU32LE(bytes, 16);
    const height = readU32LE(bytes, 12);
    if (resourceDimension === 2 && height !== 1) throw new RangeError("DDS 1D texture height must be one");
    const depth = readU32LE(bytes, 24);
    const mipCount = Math.max(readU32LE(bytes, 28), 1);
    const dataBytes = Math.max(bytes.byteLength - dataOffset, 0);
    const expectedFor = (count) => (pixelFormat ? getDdsExpectedDataBytes({
        pixelFormat,
        width,
        height,
        depth,
        mipCount,
        arraySize: count,
        isCube,
        isVolume
    }) : null);

    // A CUBE'S ARRAY SIZE IS AMBIGUOUS, and the file's own length settles it.
    //
    // The DX10 spec counts CUBES in that field, so 6 means six cubes - thirty
    // six surfaces. Frontier's `hydrogen_alpha_nebula_cube_refl.dds` writes 6
    // meaning six FACES, and the spec reading made this reader expect exactly
    // six times the data the file holds and reject it as truncated.
    //
    // Carbon does not disambiguate because it cannot express a cube array at
    // all: `CopyHeaderValuesToMembers` passes no array size for a cube
    // (`imageio/Tr2DdsHandler.cpp:445-447`) and `BitmapDimensions` forces
    // `m_arraySize( type == TEX_TYPE_CUBE ? 6 : 1 )`
    // (`imageio/include/BitmapDimensions.h:122`). Reading it the donor's way
    // would fix this file and silently drop every genuine cube array, which
    // this reader does support and is tested for.
    //
    // So neither reading is assumed. The declared count is kept when the data
    // is there for it, and dropped to one cube only when it is not AND one cube
    // accounts for the file exactly. A non-conformant writer is detectable; a
    // guess is not.
    let arraySize = declaredArraySize;
    let expectedDataBytes = expectedFor(arraySize);

    if (isCube && declaredArraySize > 1 && expectedDataBytes !== null && dataBytes < expectedDataBytes)
    {
        const single = expectedFor(1);

        if (single !== null && dataBytes === single)
        {
            arraySize = 1;
            expectedDataBytes = single;
        }
    }

    return {
        sourceFormat: "dds",
        headerSize,
        width,
        height,
        depth,
        mipCount,
        pitchOrLinearSize: readU32LE(bytes, 20),
        pfFlags,
        fourCc,
        fourCcCode,
        rgbBitCount,
        rBitMask,
        gBitMask,
        bBitMask,
        aBitMask,
        caps2,
        hasDx10,
        dxgiFormat,
        resourceDimension,
        arraySize,
        dataOffset,
        dataBytes,
        expectedDataBytes,
        isDataComplete: expectedDataBytes !== null && dataBytes >= expectedDataBytes,
        missingDataBytes: expectedDataBytes === null ? null : Math.max(expectedDataBytes - dataBytes, 0),
        extraDataBytes: expectedDataBytes === null ? null : Math.max(dataBytes - expectedDataBytes, 0),
        faces: isCube ? 6 : 1,
        cubeFaces,
        isCubeComplete: isCube && cubeFaces.length === 6,
        isCube,
        isVolume,
        dimension: isVolume ? "3d" : (isCube ? "cube" : (resourceDimension === 2 ? "1d" : "2d")),
        pixelFormat,
        textureFormat: pixelFormat || fourCc || "dds-legacy",
        isCompressed: COMPRESSED_PIXEL_FORMATS.has(pixelFormat),
        nativeTextureOnly: COMPRESSED_PIXEL_FORMATS.has(pixelFormat) && !canDecodeDdsToRgba({ pixelFormat }),
        hasAlpha: !!(pfFlags & DDS_ALPHAPIXELS) || /rgba|bgra/u.test(pixelFormat),
        hasMipMaps: readU32LE(bytes, 28) > 1
    };
}

/**
 * Carbon's load-time clean-up of 24-bit RGB: BGR -> BGRX with X = 0
 * (imageio/Tr2DdsHandler.cpp Convert24BitTo32Bit, :774-795).
 *
 * @param {Uint8Array} source 24-bit pixels.
 * @returns {Uint8Array} 32-bit pixels.
 */
export function expand24To32(source)
{
    const pixels = Math.floor(source.length / 3);
    const out = new Uint8Array(pixels * 4);

    for (let p = 0, s = 0, d = 0; p < pixels; p++)
    {
        out[d++] = source[s++];
        out[d++] = source[s++];
        out[d++] = source[s++];
        out[d++] = 0;
    }

    return out;
}

/**
 * Carbon's load-time clean-up of A8L8: luminance and alpha -> BGRA with
 * B = G = R = L (Tr2DdsHandler.cpp:863-868, via HostBitmap::ConvertFormat
 * R8G8 -> B8G8R8A8, HostBitmap.cpp:386-396).
 *
 * @param {Uint8Array} source L8A8 pixels.
 * @returns {Uint8Array} BGRA pixels.
 */
export function convertL8A8ToBgra(source)
{
    const pixels = Math.floor(source.length / 2);
    const out = new Uint8Array(pixels * 4);

    for (let p = 0, s = 0, d = 0; p < pixels; p++, s += 2)
    {
        out[d++] = source[s];
        out[d++] = source[s];
        out[d++] = source[s];
        out[d++] = source[s + 1];
    }

    return out;
}

/** The legacy layouts `expandLegacy` rewrites, with their converter and resulting format. */
const LEGACY_EXPANSIONS = {
    "bgr8unorm": { convert: expand24To32, pixelFormat: "bgrx8unorm", scale: 4 / 3 },
    "l8a8unorm": { convert: convertL8A8ToBgra, pixelFormat: "bgra8unorm", scale: 2 }
};

/**
 * Rewrite a 24-bit or A8L8 texture payload into Carbon's 32-bit shape, subresource
 * by subresource, when `values.expandLegacy` asks for it.
 *
 * @param {object} texture Texture payload from `readDdsTexture`.
 * @returns {object} The same payload for other formats, or a copy with rewritten data,
 *     pixel format and subresource pitches.
 */
function expandLegacyTexture(texture)
{
    const rule = LEGACY_EXPANSIONS[texture.pixelFormat];
    if (!rule) return texture;

    const parts = [];
    let offset = 0;
    const subresources = texture.subresources.map(sub =>
    {
        const data = rule.convert(texture.data.subarray(sub.offset, sub.offset + sub.byteLength));
        parts.push(data);
        const next = {
            ...sub,
            offset,
            byteLength: data.length,
            rowPitch: Math.round(sub.rowPitch * rule.scale),
            slicePitch: Math.round(sub.slicePitch * rule.scale)
        };
        offset += data.length;
        return next;
    });

    const data = new Uint8Array(offset);
    for (let i = 0, at = 0; i < parts.length; at += parts[i].length, i++) data.set(parts[i], at);

    return { ...texture, pixelFormat: rule.pixelFormat, dataBytes: offset, subresources, data };
}

/**
 * Builds the GPU-free texture payload: metadata, subresource layout and a view of the pixel data.
 *
 * @param {Uint8Array} bytes File bytes.
 * @param {DdsInspection} metadata Header metadata.
 * @param {DdsValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @param {boolean} [values.expandLegacy] Rewrite 24-bit and L8A8 payloads to 32-bit.
 * @returns {object} Texture payload with `subresources` ({@link DdsSubresource}[]) and `data`.
 * @throws {Error} With code `CJS_FORMAT_OUTPUT_NOT_SUPPORTED` for an unrecognized format.
 */
function readDdsTexture(bytes, metadata, values = DEFAULT_VALUES)
{
    if (!metadata.pixelFormat)
    {
        const error = new Error("dds: texture format is not recognized yet");
        error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
        error.sourceFormat = metadata.sourceFormat;
        throw error;
    }

    const subresources = buildDdsSubresources(bytes, metadata);
    const texture = {
        sourceFormat: "dds",
        width: metadata.width,
        height: metadata.height,
        depth: metadata.depth,
        faces: metadata.faces,
        cubeFaces: metadata.cubeFaces,
        isCubeComplete: metadata.isCubeComplete,
        dimension: metadata.dimension,
        mipCount: metadata.mipCount,
        arraySize: metadata.arraySize,
        pixelFormat: metadata.pixelFormat,
        isCompressed: metadata.isCompressed,
        dataBytes: metadata.dataBytes,
        expectedDataBytes: metadata.expectedDataBytes,
        isDataComplete: metadata.isDataComplete,
        missingDataBytes: metadata.missingDataBytes,
        extraDataBytes: metadata.extraDataBytes,
        subresources,
        metadata,
        data: bytes.subarray(metadata.dataOffset, metadata.dataOffset + subresources.reduce((sum, entry) => sum + entry.byteLength, 0))
    };

    return values.expandLegacy ? expandLegacyTexture(texture) : texture;
}

/**
 * Block formats one slice can be decoded from, by pixel format alone.
 *
 * Narrower than `canDecodeDdsToRgba`, which answers for a whole file and
 * includes the uncompressed formats. A caller holding one slice of a volume has
 * no file to ask about, only a format name.
 *
 * @param {?string} pixelFormat Canonical pixel format name.
 * @returns {boolean} True for BC1-BC7 formats.
 */
export function canDecodeDdsBlockFormat(pixelFormat)
{
    return /^bc[1-7]/u.test(String(pixelFormat ?? ""));
}

/**
 * Reports whether the software RGBA decoder handles a file's pixel format.
 *
 * @param {{pixelFormat?:string}} metadata Header metadata.
 * @returns {boolean} True for the uncompressed and BC formats the decoder reads.
 */
function canDecodeDdsToRgba(metadata)
{
    return [
        "rgba32float",
        "rgb32float",
        "rgba16float",
        "rg32float",
        "rg16float",
        "r32float",
        "r16float",
        "rgba8unorm",
        "rgba8unorm-srgb",
        "bgra8unorm",
        "bgra8unorm-srgb",
        "bgrx8unorm",
        "bgrx8unorm-srgb",
        "rgbx8unorm",
        "bgr8unorm",
        "l8unorm",
        "l8a8unorm",
        "a8unorm",
        "rg8unorm",
        "r8unorm",
        "bc1-rgba-unorm",
        "bc1-rgba-unorm-srgb",
        "bc2-rgba-unorm",
        "bc2-rgba-unorm-srgb",
        "bc3-rgba-unorm",
        "bc3-rgba-unorm-srgb",
        "bc4-r-unorm",
        "bc4-r-snorm",
        "bc5-rg-unorm",
        "bc5-rg-snorm",
        "bc6h-rgb-ufloat",
        "bc6h-rgb-float",
        "bc7-rgba-unorm",
        "bc7-rgba-unorm-srgb"
    ].includes(metadata.pixelFormat);
}

/**
 * Software-decodes a DDS into one RGBA surface (`emit: "rgba"`/`"image"`).
 *
 * Only the first subresource is decoded: no stored mips, cube faces or array
 * layers (a volume's z-slices are all decoded). A successful RGBA read or
 * probe therefore says nothing about multi-subresource support; engines that
 * need mips generate them. BC1-BC5 and BC7 decode to RGBA8; signed and
 * unsigned BC6H decode to linear `Float32Array` RGBA without clamping HDR
 * values. The block decoders are in-project, with no codec package.
 *
 * @param {Uint8Array} bytes DDS bytes.
 * @param {DdsInspection} metadata Inspected DDS metadata.
 * @returns {object} RGBA payload; `data` is a `Uint8Array`, or a `Float32Array` for float formats.
 * @throws {Error} With code `CJS_FORMAT_OUTPUT_NOT_SUPPORTED` for a format the decoder cannot read.
 */
function readDdsToRgba(bytes, metadata)
{
    if (!canDecodeDdsToRgba(metadata))
    {
        const error = new Error(`dds: RGBA decode is not implemented for ${metadata.pixelFormat || "unknown"}`);
        error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
        error.sourceFormat = metadata.sourceFormat;
        throw error;
    }

    const subresource = buildDdsSubresources(bytes, metadata)[0];
    const isFloat = isFloatPixelFormat(metadata.pixelFormat);
    const depth = Math.max(subresource.depth ?? 1, 1);

    // Every slice, not just the first.
    //
    // This decoded subresource[0] with the source's own width and height, which
    // for a volume reads one slice out of a buffer holding all of them and
    // returns it as though it were the image. A 128-cube came back as 65,536
    // bytes with `depth` absent from the payload, so a caller could not even
    // tell it had been handed 1/128th of what it asked for. Silent and
    // plausible, which is worse than an error: nothing downstream can detect it.
    //
    // Slices are `slicePitch` apart and each decodes exactly like a 2D image of
    // the same dimensions, so this is a loop rather than a second decoder.
    const slices = [];

    for (let z = 0; z < depth; z++)
    {
        const start = metadata.dataOffset + subresource.offset + (z * subresource.slicePitch);
        const source = bytes.subarray(start, start + subresource.slicePitch);

        slices.push(decodeDdsSlice(source, metadata, subresource));
    }

    const rgba = depth === 1 ? slices[0] : concatTypedArrays(slices);
    const sliceBytes = metadata.width * metadata.height * (isFloat ? 16 : 4);

    return {
        sourceFormat: "dds",
        width: metadata.width,
        height: metadata.height,
        // Always present, and 1 for a flat image. An optional field that only
        // appears for volumes is one every caller forgets to look for.
        depth,
        isVolume: depth > 1,
        pixelFormat: isFloat ? "rgba32float" : "rgba8unorm",
        strideBytes: metadata.width * (isFloat ? 16 : 4),
        // What one z-slice occupies, so a caller can cut the buffer up without
        // recomputing it from a pixel format it should not have to know about.
        sliceBytes,
        origin: "top-left",
        colorSpace: isFloat ? "linear" : (metadata.pixelFormat.endsWith("-srgb") ? "srgb" : "unknown"),
        alphaMode: metadata.hasAlpha ? "straight" : "opaque",
        metadata,
        data: rgba
    };
}

/**
 * Decodes one 2D slice of a DDS subresource to RGBA, whatever its block format.
 *
 * @param {Uint8Array} source The slice's pixel or block data.
 * @param {{width:number,height:number,pixelFormat:string}} metadata Slice dimensions and pixel format.
 * @param {{rowPitch:number}} subresource Row pitch in bytes (per block row for BC formats).
 * @returns {Uint8Array|Float32Array} RGBA pixels; `Float32Array` for BC6H and float formats.
 */
export function decodeDdsSlice(source, metadata, subresource)
{
    const { width, height } = metadata;
    const pitch = subresource.rowPitch;
    const format = metadata.pixelFormat;

    if (format.startsWith("bc1-")) return decodeBc1(source, width, height, pitch);
    if (format.startsWith("bc2-")) return decodeBc2(source, width, height, pitch);
    if (format.startsWith("bc3-")) return decodeBc3(source, width, height, pitch);
    if (format.startsWith("bc4-")) return decodeBc4(source, width, height, pitch, format.endsWith("-snorm"));
    if (format.startsWith("bc5-")) return decodeBc5(source, width, height, pitch, format.endsWith("-snorm"));
    if (format.startsWith("bc6h-")) return decodeBc6h(source, width, height, pitch, format === "bc6h-rgb-float");
    if (format.startsWith("bc7-")) return decodeBc7(source, width, height, pitch);

    return isFloatPixelFormat(format) ? decodeFloatUncompressed(source, metadata) : decodeUncompressed(source, metadata);
}

/**
 * Joins same-typed slice buffers into one, preserving the element type.
 *
 * @param {Array<Uint8Array|Float32Array>} parts Non-empty list of same-typed arrays.
 * @returns {Uint8Array|Float32Array} The concatenation, typed like `parts[0]`.
 */
function concatTypedArrays(parts)
{
    let total = 0;

    for (const part of parts) total += part.length;

    const out = new parts[0].constructor(total);
    let at = 0;

    for (const part of parts)
    {
        out.set(part, at);
        at += part.length;
    }

    return out;
}

/**
 * Lays out every subresource in file order: per layer (cube faces within cubes), every mip.
 *
 * @param {Uint8Array} bytes File bytes.
 * @param {DdsInspection} metadata Header metadata.
 * @returns {DdsSubresource[]} The subresources.
 * @throws {Error} With code `CJS_FORMAT_TRUNCATED` when the data is short.
 */
function buildDdsSubresources(bytes, metadata)
{
    const subresources = [];
    let offset = 0;
    const layers = Math.max(metadata.arraySize, 1) * (metadata.isCube ? 6 : 1);

    for (let layer = 0; layer < layers; layer++)
    {
        const arrayIndex = metadata.isCube ? Math.floor(layer / 6) : layer;
        const face = metadata.isCube ? layer % 6 : 0;
        for (let mip = 0; mip < metadata.mipCount; mip++)
        {
            const width = Math.max(metadata.width >> mip, 1);
            const height = Math.max(metadata.height >> mip, 1);
            const depth = metadata.isVolume ? Math.max(metadata.depth >> mip, 1) : 1;
            const layout = getDdsLevelLayout(metadata.pixelFormat, width, height, depth);
            if (offset + layout.byteLength > bytes.byteLength - metadata.dataOffset)
            {
                const error = new Error("dds: texture data is truncated");
                error.code = "CJS_FORMAT_TRUNCATED";
                error.sourceFormat = metadata.sourceFormat;
                error.expectedDataBytes = metadata.expectedDataBytes;
                error.dataBytes = metadata.dataBytes;
                error.missingDataBytes = metadata.missingDataBytes;
                throw error;
            }
            subresources.push({
                mip,
                layer,
                arrayIndex,
                face,
                offset,
                byteLength: layout.byteLength,
                rowPitch: layout.rowPitch,
                slicePitch: layout.slicePitch,
                width,
                height,
                depth
            });
            offset += layout.byteLength;
        }
    }

    return subresources;
}

/**
 * Sums the byte size of every subresource a header describes.
 *
 * @param {{pixelFormat:string,width:number,height:number,depth:number,mipCount:number,arraySize:number,isCube:boolean,isVolume:boolean}} metadata
 *     Header fields.
 * @returns {number} Expected pixel data size in bytes.
 */
function getDdsExpectedDataBytes(metadata)
{
    let total = 0;
    const layers = Math.max(metadata.arraySize, 1) * (metadata.isCube ? 6 : 1);

    for (let layer = 0; layer < layers; layer++)
    {
        for (let mip = 0; mip < metadata.mipCount; mip++)
        {
            const width = Math.max(metadata.width >> mip, 1);
            const height = Math.max(metadata.height >> mip, 1);
            const depth = metadata.isVolume ? Math.max(metadata.depth >> mip, 1) : 1;
            total += getDdsLevelLayout(metadata.pixelFormat, width, height, depth).byteLength;
        }
    }

    return total;
}

/**
 * Lists the cube faces flagged in caps2.
 *
 * @param {number} caps2 Caps2 field.
 * @returns {string[]} Face names, or empty when the cube map flag is clear.
 */
function getDdsCubeFaces(caps2)
{
    if (!(caps2 & DDSCAPS2_CUBEMAP))
    {
        return [];
    }
    return DDS_CUBE_FACE_FLAGS
        .filter((entry) => !!(caps2 & entry[1]))
        .map((entry) => entry[0]);
}

/**
 * Computes row pitch, slice pitch and size of one mip.
 *
 * @param {string} pixelFormat Canonical pixel format name.
 * @param {number} width Mip width.
 * @param {number} height Mip height.
 * @param {number} depth Mip depth.
 * @returns {{rowPitch:number,slicePitch:number,byteLength:number}} The layout.
 * @throws {Error} With code `CJS_FORMAT_OUTPUT_NOT_SUPPORTED` for an unknown format.
 */
function getDdsLevelLayout(pixelFormat, width, height, depth)
{
    const blockBytes = pixelFormat.startsWith("bc1-") || pixelFormat.startsWith("bc4-") ? 8 :
        pixelFormat.startsWith("bc") ? 16 : 0;
    if (blockBytes)
    {
        const blocksWide = Math.max(Math.ceil(width / 4), 1);
        const blocksHigh = Math.max(Math.ceil(height / 4), 1);
        const rowPitch = blocksWide * blockBytes;
        const slicePitch = rowPitch * blocksHigh;
        return { rowPitch, slicePitch, byteLength: slicePitch * depth };
    }

    const bytesPerPixel = {
        "rgba32float": 16,
        "rgb32float": 12,
        "rgba16float": 8,
        "rg32float": 8,
        "rg16float": 4,
        "r32float": 4,
        "r16float": 2,
        "r16unorm": 2,
        "rgba8unorm": 4,
        "rgba8unorm-srgb": 4,
        "bgra8unorm": 4,
        "bgra8unorm-srgb": 4,
        "bgrx8unorm": 4,
        "bgrx8unorm-srgb": 4,
        "rgbx8unorm": 4,
        "bgr8unorm": 3,
        "l8a8unorm": 2,
        "l8unorm": 1,
        "a8unorm": 1,
        "rg8unorm": 2,
        "r8unorm": 1
    }[pixelFormat];
    if (!bytesPerPixel)
    {
        const error = new Error(`dds: cannot calculate subresource layout for ${pixelFormat || "unknown"}`);
        error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
        throw error;
    }
    const rowPitch = width * bytesPerPixel;
    const slicePitch = rowPitch * height;
    return { rowPitch, slicePitch, byteLength: slicePitch * depth };
}

/**
 * Converts an 8-bit uncompressed slice to RGBA8.
 *
 * @param {Uint8Array} source Slice pixels.
 * @param {{width:number,height:number,pixelFormat:string}} metadata Slice dimensions and pixel format.
 * @returns {Uint8Array} RGBA8 pixels.
 */
function decodeUncompressed(source, metadata)
{
    const rgba = new Uint8Array(metadata.width * metadata.height * 4);
    // Legacy luminance/alpha pixels are packed too: L8/A8 use one byte,
    // L8A8 uses two. A four-byte stride skips samples and blacks out most
    // of the decoded surface (including planet height maps).
    const bytesPerPixel = metadata.pixelFormat === "bgr8unorm" ? 3 :
        [ "rg8unorm", "l8a8unorm" ].includes(metadata.pixelFormat) ? 2 :
            [ "r8unorm", "l8unorm", "a8unorm" ].includes(metadata.pixelFormat) ? 1 : 4;
    for (let pixel = 0; pixel < metadata.width * metadata.height; pixel++)
    {
        const sourceOffset = pixel * bytesPerPixel;
        const outputOffset = pixel * 4;
        if (metadata.pixelFormat.startsWith("bgra") || metadata.pixelFormat.startsWith("bgrx"))
        {
            rgba[outputOffset] = source[sourceOffset + 2];
            rgba[outputOffset + 1] = source[sourceOffset + 1];
            rgba[outputOffset + 2] = source[sourceOffset];
            rgba[outputOffset + 3] = metadata.pixelFormat.startsWith("bgrx") ? 255 : source[sourceOffset + 3];
        }
        else if (metadata.pixelFormat === "bgr8unorm")
        {
            rgba[outputOffset] = source[sourceOffset + 2];
            rgba[outputOffset + 1] = source[sourceOffset + 1];
            rgba[outputOffset + 2] = source[sourceOffset];
            rgba[outputOffset + 3] = 255;
        }
        else if (metadata.pixelFormat.startsWith("rgbx"))
        {
            // Fourth byte is padding, not alpha.
            rgba[outputOffset] = source[sourceOffset];
            rgba[outputOffset + 1] = source[sourceOffset + 1];
            rgba[outputOffset + 2] = source[sourceOffset + 2];
            rgba[outputOffset + 3] = 255;
        }
        else if (metadata.pixelFormat === "l8unorm" || metadata.pixelFormat === "l8a8unorm")
        {
            // Luminance replicates its one channel across RGB.
            const luminance = source[sourceOffset];
            rgba[outputOffset] = luminance;
            rgba[outputOffset + 1] = luminance;
            rgba[outputOffset + 2] = luminance;
            rgba[outputOffset + 3] = metadata.pixelFormat === "l8a8unorm" ? source[sourceOffset + 1] : 255;
        }
        else if (metadata.pixelFormat === "a8unorm")
        {
            rgba[outputOffset] = 0;
            rgba[outputOffset + 1] = 0;
            rgba[outputOffset + 2] = 0;
            rgba[outputOffset + 3] = source[sourceOffset];
        }
        else if (metadata.pixelFormat === "rg8unorm")
        {
            rgba[outputOffset] = source[sourceOffset];
            rgba[outputOffset + 1] = source[sourceOffset + 1];
            rgba[outputOffset + 2] = 0;
            rgba[outputOffset + 3] = 255;
        }
        else
        {
            rgba[outputOffset] = source[sourceOffset];
            rgba[outputOffset + 1] = bytesPerPixel > 1 ? source[sourceOffset + 1] : source[sourceOffset];
            rgba[outputOffset + 2] = bytesPerPixel > 2 ? source[sourceOffset + 2] : source[sourceOffset];
            rgba[outputOffset + 3] = bytesPerPixel > 3 ? source[sourceOffset + 3] : 255;
        }
    }
    return rgba;
}

/**
 * Converts a 16- or 32-bit float uncompressed slice to RGBA float.
 *
 * @param {Uint8Array} source Slice pixels.
 * @param {{width:number,height:number,pixelFormat:string}} metadata Slice dimensions and pixel format.
 * @returns {Float32Array} RGBA float pixels.
 */
function decodeFloatUncompressed(source, metadata)
{
    const rgba = new Float32Array(metadata.width * metadata.height * 4);
    const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
    const bytesPerPixel = {
        "rgba32float": 16,
        "rgb32float": 12,
        "rgba16float": 8,
        "rg32float": 8,
        "rg16float": 4,
        "r32float": 4,
        "r16float": 2
    }[metadata.pixelFormat];

    for (let pixel = 0; pixel < metadata.width * metadata.height; pixel++)
    {
        const sourceOffset = pixel * bytesPerPixel;
        const outputOffset = pixel * 4;
        let red, green, blue, alpha;
        if (metadata.pixelFormat === "rgba32float")
        {
            red = view.getFloat32(sourceOffset, true);
            green = view.getFloat32(sourceOffset + 4, true);
            blue = view.getFloat32(sourceOffset + 8, true);
            alpha = view.getFloat32(sourceOffset + 12, true);
        }
        else if (metadata.pixelFormat === "rgb32float")
        {
            red = view.getFloat32(sourceOffset, true);
            green = view.getFloat32(sourceOffset + 4, true);
            blue = view.getFloat32(sourceOffset + 8, true);
            alpha = 1;
        }
        else if (metadata.pixelFormat === "rgba16float")
        {
            red = halfToFloat(view.getUint16(sourceOffset, true));
            green = halfToFloat(view.getUint16(sourceOffset + 2, true));
            blue = halfToFloat(view.getUint16(sourceOffset + 4, true));
            alpha = halfToFloat(view.getUint16(sourceOffset + 6, true));
        }
        else if (metadata.pixelFormat === "rg32float")
        {
            red = view.getFloat32(sourceOffset, true);
            green = view.getFloat32(sourceOffset + 4, true);
            blue = 0;
            alpha = 1;
        }
        else if (metadata.pixelFormat === "rg16float")
        {
            red = halfToFloat(view.getUint16(sourceOffset, true));
            green = halfToFloat(view.getUint16(sourceOffset + 2, true));
            blue = 0;
            alpha = 1;
        }
        else
        {
            red = metadata.pixelFormat === "r16float"
                ? halfToFloat(view.getUint16(sourceOffset, true))
                : view.getFloat32(sourceOffset, true);
            green = red;
            blue = red;
            alpha = 1;
        }
        rgba[outputOffset] = red;
        rgba[outputOffset + 1] = green;
        rgba[outputOffset + 2] = blue;
        rgba[outputOffset + 3] = alpha;
    }
    return rgba;
}

/**
 * Reports whether a pixel format decodes to float RGBA.
 *
 * @param {*} pixelFormat Canonical pixel format name.
 * @returns {boolean} True for BC6H and the float formats.
 */
function isFloatPixelFormat(pixelFormat)
{
    return typeof pixelFormat === "string" && (pixelFormat.startsWith("bc6h-") ||
        [ "rgba32float", "rgb32float", "rgba16float", "rg32float", "rg16float", "r32float",
            "r16float" ].includes(pixelFormat));
}

/**
 * Converts IEEE 754 half-precision bits to a number.
 *
 * @param {number} value 16-bit half bits.
 * @returns {number} The value.
 */
function halfToFloat(value)
{
    const sign = (value & 0x8000) ? -1 : 1;
    const exponent = (value >>> 10) & 0x1f;
    const mantissa = value & 0x03ff;
    if (exponent === 0)
    {
        return sign * Math.pow(2, -14) * (mantissa / 1024);
    }
    if (exponent === 0x1f)
    {
        return mantissa === 0 ? sign * Infinity : NaN;
    }
    return sign * Math.pow(2, exponent - 15) * (1 + mantissa / 1024);
}

/**
 * Decodes BC1 blocks to RGBA8.
 *
 * @param {Uint8Array} source Block data.
 * @param {number} width Slice width.
 * @param {number} height Slice height.
 * @param {number} rowPitch Bytes per block row.
 * @returns {Uint8Array} RGBA8 pixels.
 */
function decodeBc1(source, width, height, rowPitch)
{
    const rgba = new Uint8Array(width * height * 4);
    for (let blockY = 0; blockY < Math.ceil(height / 4); blockY++)
    {
        for (let blockX = 0; blockX < Math.ceil(width / 4); blockX++)
        {
            const blockOffset = blockY * rowPitch + blockX * 8;
            const c0 = source[blockOffset] | (source[blockOffset + 1] << 8);
            const c1 = source[blockOffset + 2] | (source[blockOffset + 3] << 8);
            const colors = decodeBc1Colors(c0, c1);
            const indices = source[blockOffset + 4] |
                (source[blockOffset + 5] << 8) |
                (source[blockOffset + 6] << 16) |
                (source[blockOffset + 7] << 24);
            for (let y = 0; y < 4; y++)
            {
                for (let x = 0; x < 4; x++)
                {
                    const outputX = blockX * 4 + x;
                    const outputY = blockY * 4 + y;
                    if (outputX >= width || outputY >= height) continue;
                    const color = colors[(indices >>> (2 * (y * 4 + x))) & 3];
                    rgba.set(color, (outputY * width + outputX) * 4);
                }
            }
        }
    }
    return rgba;
}

/**
 * Decodes BC2 blocks (explicit 4-bit alpha) to RGBA8.
 *
 * @param {Uint8Array} source Block data.
 * @param {number} width Slice width.
 * @param {number} height Slice height.
 * @param {number} rowPitch Bytes per block row.
 * @returns {Uint8Array} RGBA8 pixels.
 */
function decodeBc2(source, width, height, rowPitch)
{
    return decodeBcAlphaColor(source, width, height, rowPitch, (blockOffset, x, y) =>
    {
        const alphaNibble = (source[blockOffset + y * 2 + Math.floor(x / 2)] >>> ((x % 2) * 4)) & 0x0f;
        return alphaNibble * 17;
    }, 8);
}

/**
 * Decodes BC3 blocks (interpolated alpha) to RGBA8.
 *
 * @param {Uint8Array} source Block data.
 * @param {number} width Slice width.
 * @param {number} height Slice height.
 * @param {number} rowPitch Bytes per block row.
 * @returns {Uint8Array} RGBA8 pixels.
 */
function decodeBc3(source, width, height, rowPitch)
{
    return decodeBcAlphaColor(source, width, height, rowPitch, (blockOffset, x, y) =>
    {
        const alpha0 = source[blockOffset], alpha1 = source[blockOffset + 1];
        const alphaValues = alpha0 > alpha1
            ? [ alpha0, alpha1,
                Math.round((6 * alpha0 + alpha1) / 7),
                Math.round((5 * alpha0 + 2 * alpha1) / 7),
                Math.round((4 * alpha0 + 3 * alpha1) / 7),
                Math.round((3 * alpha0 + 4 * alpha1) / 7),
                Math.round((2 * alpha0 + 5 * alpha1) / 7),
                Math.round((alpha0 + 6 * alpha1) / 7) ]
            : [ alpha0, alpha1,
                Math.round((4 * alpha0 + alpha1) / 5),
                Math.round((3 * alpha0 + 2 * alpha1) / 5),
                Math.round((2 * alpha0 + 3 * alpha1) / 5),
                Math.round((alpha0 + 4 * alpha1) / 5),
                0, 255 ];
        let alphaBits = 0n;
        for (let i = 0; i < 6; i++) alphaBits |= BigInt(source[blockOffset + 2 + i]) << BigInt(i * 8);
        return alphaValues[Number((alphaBits >> BigInt((y * 4 + x) * 3)) & 7n)];
    }, 8);
}

/**
 * Decodes BC4 blocks to greyscale RGBA8.
 *
 * @param {Uint8Array} source Block data.
 * @param {number} width Slice width.
 * @param {number} height Slice height.
 * @param {number} rowPitch Bytes per block row.
 * @param {boolean} signed Whether the endpoints are SNORM.
 * @returns {Uint8Array} RGBA8 pixels.
 */
function decodeBc4(source, width, height, rowPitch, signed)
{
    const rgba = new Uint8Array(width * height * 4);
    forEachBcPixel(width, height, rowPitch, 8, (blockOffset, x, y, outputOffset) =>
    {
        const value = decodeBc4Value(source, blockOffset, x, y, signed);
        rgba[outputOffset] = value;
        rgba[outputOffset + 1] = value;
        rgba[outputOffset + 2] = value;
        rgba[outputOffset + 3] = 255;
    });
    return rgba;
}

/**
 * Decodes BC5 blocks to red/green RGBA8.
 *
 * @param {Uint8Array} source Block data.
 * @param {number} width Slice width.
 * @param {number} height Slice height.
 * @param {number} rowPitch Bytes per block row.
 * @param {boolean} signed Whether the endpoints are SNORM.
 * @returns {Uint8Array} RGBA8 pixels.
 */
function decodeBc5(source, width, height, rowPitch, signed)
{
    const rgba = new Uint8Array(width * height * 4);
    forEachBcPixel(width, height, rowPitch, 16, (blockOffset, x, y, outputOffset) =>
    {
        rgba[outputOffset] = decodeBc4Value(source, blockOffset, x, y, signed);
        rgba[outputOffset + 1] = decodeBc4Value(source, blockOffset + 8, x, y, signed);
        rgba[outputOffset + 2] = 0;
        rgba[outputOffset + 3] = 255;
    });
    return rgba;
}

/**
 * Decodes one texel of a BC4 channel block.
 *
 * @param {Uint8Array} source Block data.
 * @param {number} blockOffset Byte offset of the 8-byte channel block.
 * @param {number} x Texel column in the block.
 * @param {number} y Texel row in the block.
 * @param {boolean} signed Whether the endpoints are SNORM.
 * @returns {number} The value as a byte (SNORM remapped to 0-255).
 */
function decodeBc4Value(source, blockOffset, x, y, signed)
{
    const endpoint0 = signed ? decodeSnormByte(source[blockOffset]) : source[blockOffset];
    const endpoint1 = signed ? decodeSnormByte(source[blockOffset + 1]) : source[blockOffset + 1];
    const values = endpoint0 > endpoint1
        ? [ endpoint0, endpoint1,
            (6 * endpoint0 + endpoint1) / 7,
            (5 * endpoint0 + 2 * endpoint1) / 7,
            (4 * endpoint0 + 3 * endpoint1) / 7,
            (3 * endpoint0 + 4 * endpoint1) / 7,
            (2 * endpoint0 + 5 * endpoint1) / 7,
            (endpoint0 + 6 * endpoint1) / 7 ]
        : [ endpoint0, endpoint1,
            (4 * endpoint0 + endpoint1) / 5,
            (3 * endpoint0 + 2 * endpoint1) / 5,
            (2 * endpoint0 + 3 * endpoint1) / 5,
            (endpoint0 + 4 * endpoint1) / 5,
            signed ? -1 : 0,
            signed ? 1 : 255 ];
    let bits = 0n;
    for (let i = 0; i < 6; i++) bits |= BigInt(source[blockOffset + 2 + i]) << BigInt(i * 8);
    const value = values[Number((bits >> BigInt((y * 4 + x) * 3)) & 7n)];
    return signed ? Math.max(0, Math.min(255, Math.round((value + 1) * 127.5))) : Math.round(value);
}

/**
 * Converts an SNORM8 byte to -1..1.
 *
 * @param {number} value Unsigned byte holding the two's-complement value.
 * @returns {number} The normalized value.
 */
function decodeSnormByte(value)
{
    const signed = value > 127 ? value - 256 : value;
    return Math.max(-1, signed / 127);
}

/**
 * Calls `callback` for every in-bounds texel of every block.
 *
 * @param {number} width Slice width.
 * @param {number} height Slice height.
 * @param {number} rowPitch Bytes per block row.
 * @param {number} blockBytes Bytes per block.
 * @param {(blockOffset:number, x:number, y:number, outputOffset:number) => void} callback
 *     Receives the block offset, texel position in the block and RGBA8 output offset.
 */
function forEachBcPixel(width, height, rowPitch, blockBytes, callback)
{
    for (let blockY = 0; blockY < Math.ceil(height / 4); blockY++)
    {
        for (let blockX = 0; blockX < Math.ceil(width / 4); blockX++)
        {
            const blockOffset = blockY * rowPitch + blockX * blockBytes;
            for (let y = 0; y < 4; y++)
            {
                for (let x = 0; x < 4; x++)
                {
                    const outputX = blockX * 4 + x;
                    const outputY = blockY * 4 + y;
                    if (outputX < width && outputY < height)
                    {
                        callback(blockOffset, x, y, (outputY * width + outputX) * 4);
                    }
                }
            }
        }
    }
}

/**
 * Decodes 16-byte blocks that pair an alpha block with a four-colour BC1 block.
 *
 * @param {Uint8Array} source Block data.
 * @param {number} width Slice width.
 * @param {number} height Slice height.
 * @param {number} rowPitch Bytes per block row.
 * @param {(blockOffset:number, x:number, y:number) => number} alphaAt Alpha for one texel.
 * @param {number} [colorOffset=0] Byte offset of the colour block within the block.
 * @returns {Uint8Array} RGBA8 pixels.
 */
function decodeBcAlphaColor(source, width, height, rowPitch, alphaAt, colorOffset = 0)
{
    const rgba = new Uint8Array(width * height * 4);
    for (let blockY = 0; blockY < Math.ceil(height / 4); blockY++)
    {
        for (let blockX = 0; blockX < Math.ceil(width / 4); blockX++)
        {
            const blockOffset = blockY * rowPitch + blockX * 16;
            const colorOffsetInBlock = blockOffset + colorOffset;
            const c0 = source[colorOffsetInBlock] | (source[colorOffsetInBlock + 1] << 8);
            const c1 = source[colorOffsetInBlock + 2] | (source[colorOffsetInBlock + 3] << 8);
            const colors = decodeBc1Colors(c0, c1, true);
            const indices = source[colorOffsetInBlock + 4] |
                (source[colorOffsetInBlock + 5] << 8) |
                (source[colorOffsetInBlock + 6] << 16) |
                (source[colorOffsetInBlock + 7] << 24);
            for (let y = 0; y < 4; y++)
            {
                for (let x = 0; x < 4; x++)
                {
                    const outputX = blockX * 4 + x;
                    const outputY = blockY * 4 + y;
                    if (outputX >= width || outputY >= height) continue;
                    const color = colors[(indices >>> (2 * (y * 4 + x))) & 3];
                    const outputOffset = (outputY * width + outputX) * 4;
                    rgba[outputOffset] = color[0];
                    rgba[outputOffset + 1] = color[1];
                    rgba[outputOffset + 2] = color[2];
                    rgba[outputOffset + 3] = alphaAt(blockOffset, x, y);
                }
            }
        }
    }
    return rgba;
}

/**
 * Builds the four-entry BC1 palette from two RGB565 endpoints.
 *
 * @param {number} c0 First endpoint.
 * @param {number} c1 Second endpoint.
 * @param {boolean} [forceFourColor=false] Always use the four-colour mode, as BC2/BC3 do.
 * @returns {Array<number[]>} Four `[r, g, b, a]` entries.
 */
function decodeBc1Colors(c0, c1, forceFourColor = false)
{
    const first = decode565(c0);
    const second = decode565(c1);
    const colors = [ first, second ];
    if (c0 > c1 || forceFourColor)
    {
        colors.push([
            Math.round((2 * first[0] + second[0]) / 3),
            Math.round((2 * first[1] + second[1]) / 3),
            Math.round((2 * first[2] + second[2]) / 3),
            255
        ], [
            Math.round((first[0] + 2 * second[0]) / 3),
            Math.round((first[1] + 2 * second[1]) / 3),
            Math.round((first[2] + 2 * second[2]) / 3),
            255
        ]);
    }
    else
    {
        colors.push([
            Math.round((first[0] + second[0]) / 2),
            Math.round((first[1] + second[1]) / 2),
            Math.round((first[2] + second[2]) / 2),
            255
        ], [ 0, 0, 0, 0 ]);
    }
    return colors;
}

/**
 * Expands an RGB565 value to RGBA8 with rounding.
 *
 * @param {number} value RGB565 value.
 * @returns {number[]} `[r, g, b, 255]`.
 */
function decode565(value)
{
    return [
        Math.round(((value >>> 11) & 0x1f) * 255 / 31),
        Math.round(((value >>> 5) & 0x3f) * 255 / 63),
        Math.round((value & 0x1f) * 255 / 31),
        255
    ];
}

/**
 * The floating-point `D3DFORMAT` enumerators, which a legacy DDS stores as a
 * NUMBER in the four-character-code field rather than as four characters.
 *
 * That is the whole trap. `DDPF_FOURCC` is set and the field reads `114`, which
 * as text is `"r\0\0\0"` and matches nothing, so a reader that only compares
 * character codes reports an unrecognized format for a file whose format is
 * perfectly ordinary. Every one of these six is a plain uncompressed surface.
 *
 * Two were mapped when BC6H support landed and the other four were not, so
 * `A16B16G16R16F` and `A32B32G32R32F` loaded while their one- and two-channel
 * siblings did not. Found 2026-08-16 on
 * `res:/dx9/model/ship/amarr/battleship/ab3/effects/ab3_traffic.dds`, a 256x9
 * `R32F` gradient.
 */
const LEGACY_D3DFMT_PIXEL_FORMATS = {
    111: "r16float",
    112: "rg16float",
    113: "rgba16float",
    114: "r32float",
    115: "rg32float",
    116: "rgba32float"
};

/**
 * Maps the DX10 format, FourCC or RGB masks to a canonical pixel format name.
 *
 * @param {{pfFlags:number,fourCc:string,fourCcCode:number,rgbBitCount:number,rBitMask:number,gBitMask:number,bBitMask:number,aBitMask:number,dxgiFormat:number}} format
 *     Pixel format fields.
 * @returns {string} The pixel format name, or "" when unrecognized.
 */
function getDdsPixelFormat(format)
{
    if (format.dxgiFormat) return DXGI_PIXEL_FORMATS[format.dxgiFormat] || "";
    if ((format.pfFlags & DDS_FOURCC) && format.fourCc)
    {
        return FOURCC_PIXEL_FORMATS[format.fourCc] || LEGACY_D3DFMT_PIXEL_FORMATS[format.fourCcCode] || "";
    }
    if (format.pfFlags & DDS_RGB)
    {
        if (format.rgbBitCount === 32 &&
            format.rBitMask === 0x000000ff &&
            format.gBitMask === 0x0000ff00 &&
            format.bBitMask === 0x00ff0000 &&
            format.aBitMask === 0xff000000) return "rgba8unorm";
        if (format.rgbBitCount === 32 &&
            format.rBitMask === 0x00ff0000 &&
            format.gBitMask === 0x0000ff00 &&
            format.bBitMask === 0x000000ff &&
            format.aBitMask === 0xff000000) return "bgra8unorm";
        // D3DFMT_X8R8G8B8 / D3DFMT_X8B8G8R8: 32bpp with no alpha channel.
        // DDPF_ALPHAPIXELS is clear and the alpha mask is zero, so the fourth
        // byte is padding and reads as opaque.
        if (format.rgbBitCount === 32 &&
            format.rBitMask === 0x00ff0000 &&
            format.gBitMask === 0x0000ff00 &&
            format.bBitMask === 0x000000ff &&
            !format.aBitMask) return "bgrx8unorm";
        if (format.rgbBitCount === 32 &&
            format.rBitMask === 0x000000ff &&
            format.gBitMask === 0x0000ff00 &&
            format.bBitMask === 0x00ff0000 &&
            !format.aBitMask) return "rgbx8unorm";
        if (format.rgbBitCount === 24 &&
            format.rBitMask === 0x00ff0000 &&
            format.gBitMask === 0x0000ff00 &&
            format.bBitMask === 0x000000ff) return "bgr8unorm";
    }
    // Single-channel masks are authored both ways: some declare DDPF_LUMINANCE,
    // others DDPF_RGB with only a red mask. Both mean one channel replicated
    // across RGB, which is not the same as r8unorm (that samples as red only).
    if ((format.pfFlags & DDS_RGB) &&
        format.rgbBitCount === 8 &&
        format.rBitMask === 0x000000ff &&
        !format.gBitMask &&
        !format.bBitMask &&
        !format.aBitMask) return "l8unorm";
    if (format.pfFlags & DDS_LUMINANCE)
    {
        if (format.rgbBitCount === 8 && !(format.pfFlags & DDS_ALPHAPIXELS)) return "l8unorm";
        if (format.rgbBitCount === 16 && (format.pfFlags & DDS_ALPHAPIXELS)) return "l8a8unorm";
    }
    // D3DFMT_A8: alpha only.
    if ((format.pfFlags & DDS_ALPHA) && format.rgbBitCount === 8) return "a8unorm";
    return "";
}





