import { decodeBc6h } from "./bc6h.js";
import { decodeBc7 } from "./bc7.js";

export const OUTPUT_IMAGE = "image";
export const OUTPUT_TEXTURE = "texture";
export const OUTPUT_RGBA = "rgba";
export const OUTPUT_RAW = "raw";
export const OUTPUT_JSON = "json";

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_RAW,
    inputType: "",
    source: ""
});

const DDS_HEADER_SIZE = 124;
const DDS_PIXELFORMAT_OFFSET = 76;
const DDS_FOURCC = 0x00000004;
const DDS_RGB = 0x00000040;
const DDS_ALPHAPIXELS = 0x00000001;
const DDS_ALPHA = 0x00000002;
const DDS_LUMINANCE = 0x00020000;
const DDSCAPS2_CUBEMAP = 0x00000200;
const DDSCAPS2_VOLUME = 0x00200000;

const DDS_CUBE_FACE_FLAGS = Object.freeze([
    [ "positive-x", 0x00000400 ],
    [ "negative-x", 0x00000800 ],
    [ "positive-y", 0x00001000 ],
    [ "negative-y", 0x00002000 ],
    [ "positive-z", 0x00004000 ],
    [ "negative-z", 0x00008000 ]
]);

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
    41: "r32float",
    54: "r16float",
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

const DEBUG_OUTPUTS = Object.freeze({
    png: "pngJson",
    jpeg: "jpegJson",
    jpg: "jpegJson",
    tga: "tgaJson",
    dds: "ddsJson"
});

/**
 * Normalizes reader options against their supported defaults for the DDS format
 * reader.
 */
export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsImageFormat")
{
    const values = { ...DEFAULT_VALUES, ...(base || {}), ...(options || {}) };
    values.inputType = normalizeInputType(values.inputType);
    values.emit = normalizeEmit(values.emit, values.inputType, readerName);
    return values;
}

/** Normalizes the requested input representation for the DDS format reader. */
export function normalizeInputType(inputType)
{
    if (!inputType) return "";
    const value = String(inputType).replace(/^\./u, "").toLowerCase();
    return value === "jpg" ? "jpeg" : value;
}

/** Normalizes the requested output representation for the DDS format reader. */
export function normalizeEmit(emit, inputType, readerName)
{
    if (emit === undefined || emit === null) return OUTPUT_RAW;
    if (emit === OUTPUT_JSON && inputType) return DEBUG_OUTPUTS[inputType] || OUTPUT_JSON;
    if ([ OUTPUT_IMAGE, OUTPUT_TEXTURE, OUTPUT_RGBA, OUTPUT_RAW, OUTPUT_JSON ].includes(emit)) return emit;
    if (Object.values(DEBUG_OUTPUTS).includes(emit)) return emit;
    throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(emit)}`);
}

/** Returns a byte view over the supplied binary input for the DDS format reader. */
export function toBytes(input)
{
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError("Image input must be Uint8Array, ArrayBuffer, or DataView");
}

/** Inspects input using normalized format options for the DDS format reader. */
export function inspectWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    const bytes = toBytes(input);
    const detected = inspectBytes(bytes);
    const sourceFormat = expectedType || values.inputType || detected.sourceFormat;

    if (expectedType && detected.sourceFormat && detected.sourceFormat !== expectedType)
    {
        throw new TypeError(`CjsFormat${capitalize(expectedType)}: expected ${expectedType}, got ${detected.sourceFormat}`);
    }

    return {
        payloadType: sourceFormat === "dds" ? "texture" : "image",
        mediaTypes: sourceFormat === "dds" ? [ "texture", "image" ] : [ "image" ],
        sourceFormat,
        byteLength: bytes.byteLength,
        ...detected
    };
}

/**
 * Reports whether input is supported under normalized format options for the DDS
 * format reader.
 */
export function isSupportedWithValues(input, values = DEFAULT_VALUES, expectedType = "")
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
                    payloadType: "texture",
                    codec: metadata.pixelFormat || metadata.textureFormat || "unknown",
                    supported: canEmitTexture && metadata.isCompressed,
                    nativeOnly: !!metadata.nativeTextureOnly,
                    reason: metadata.isCompressed ? textureUnsupportedReason : "DDS is not block-compressed."
                },
                {
                    kind: "texture",
                    payloadType: "texture",
                    codec: metadata.pixelFormat || metadata.textureFormat || "unknown",
                    supported: canEmitTexture,
                    reason: canEmitTexture ? "" : textureUnsupportedReason
                },
                {
                    kind: "rgba",
                    payloadType: "rgba",
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
                { kind: "raw", payloadType: "raw", codec: "dds", supported: true }
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
            preferred: preferredVariant?.codec || "",
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
            preferred: "",
            reason: error.message,
            metadata: null,
            variants: [],
            warnings: [],
            errors: [ error.message ]
        };
    }
}

/** Reads input using normalized format options for the DDS format reader. */
export function readWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    const bytes = toBytes(input);
    const metadata = inspectWithValues(bytes, values, expectedType);

    if (values.emit === OUTPUT_RAW)
    {
        return {
            payloadType: "raw",
            sourceFormat: metadata.sourceFormat,
            metadata,
            bytes
        };
    }

    if (values.emit === OUTPUT_JSON || values.emit === DEBUG_OUTPUTS[metadata.sourceFormat])
    {
        return metadata;
    }

    if (values.emit === OUTPUT_TEXTURE && metadata.sourceFormat === "dds")
    {
        return readDdsTexture(bytes, metadata);
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

/** Converts a parsed payload into a JSON-safe value for the DDS format reader. */
export function toJsonValue(value)
{
    if (value instanceof Uint8Array)
    {
        return { byteLength: value.byteLength };
    }
    if (Array.isArray(value)) return value.map(toJsonValue);
    if (value && typeof value === "object")
    {
        const output = {};
        for (const [ key, entry ] of Object.entries(value)) output[key] = toJsonValue(entry);
        return output;
    }
    return value;
}

/**
 * Inspects the supplied bytes without decoding their payload for the DDS format
 * reader.
 */
export function inspectBytes(bytes)
{
    if (isPNG(bytes)) return inspectPNG(bytes);
    if (isJPEG(bytes)) return inspectJPEG(bytes);
    if (isDDS(bytes)) return inspectDDS(bytes);
    if (isTGA(bytes)) return inspectTGA(bytes);
    return { sourceFormat: "", width: 0, height: 0 };
}

/**
 * Reports whether the supplied bytes begin with a PNG signature for the DDS
 * format reader.
 */
export function isPNG(bytes)
{
    return bytes.byteLength >= 24 &&
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
}

/**
 * Reports whether the supplied bytes begin with a JPEG signature for the DDS
 * format reader.
 */
export function isJPEG(bytes)
{
    return bytes.byteLength >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

/**
 * Reports whether the supplied bytes begin with a DDS signature for the DDS
 * format reader.
 */
export function isDDS(bytes)
{
    return bytes.byteLength >= DDS_HEADER_SIZE + 4 &&
        bytes[0] === 0x44 && bytes[1] === 0x44 && bytes[2] === 0x53 && bytes[3] === 0x20 &&
        readU32LE(bytes, 4) === DDS_HEADER_SIZE;
}

/**
 * Reports whether the supplied bytes have a supported TGA header for the DDS
 * format reader.
 */
export function isTGA(bytes)
{
    if (bytes.byteLength < 18) return false;
    const imageType = bytes[2], width = readU16LE(bytes, 12), height = readU16LE(bytes, 14), bpp = bytes[16];
    return width > 0 && height > 0 && [ 1, 2, 3, 9, 10, 11 ].includes(imageType) && [ 8, 16, 24, 32 ].includes(bpp);
}

function inspectPNG(bytes)
{
    const colorType = bytes[25], bitDepth = bytes[24];
    return {
        sourceFormat: "png",
        width: readU32BE(bytes, 16),
        height: readU32BE(bytes, 20),
        bitDepth,
        colorType,
        channels: pngChannels(colorType),
        pixelFormat: `png-${bitDepth}-${colorType}`,
        isCompressed: false
    };
}

function inspectJPEG(bytes)
{
    let offset = 2;
    while (offset + 9 < bytes.byteLength)
    {
        if (bytes[offset] !== 0xff)
        {
            offset++;
            continue;
        }
        const marker = bytes[offset + 1], length = readU16BE(bytes, offset + 2);
        if ([ 0xc0, 0xc1, 0xc2, 0xc3 ].includes(marker))
        {
            return {
                sourceFormat: "jpeg",
                width: readU16BE(bytes, offset + 7),
                height: readU16BE(bytes, offset + 5),
                channels: bytes[offset + 9],
                marker,
                pixelFormat: "jpeg-ycbcr",
                isCompressed: true
            };
        }
        offset += Math.max(length + 2, 2);
    }
    return { sourceFormat: "jpeg", width: 0, height: 0, channels: 0, pixelFormat: "jpeg", isCompressed: true };
}

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
    const isVolume = !!(caps2 & DDSCAPS2_VOLUME);
    const cubeFaces = getDdsCubeFaces(caps2);
    const hasDx10 = fourCc === "DX10" && bytes.byteLength >= 148;
    const dxgiFormat = hasDx10 ? readU32LE(bytes, 128) : 0;
    const resourceDimension = hasDx10 ? readU32LE(bytes, 132) : 0;
    const arraySize = hasDx10 ? readU32LE(bytes, 140) : 1;
    const dataOffset = hasDx10 ? 148 : 128;
    const pixelFormat = getDdsPixelFormat({ pfFlags, fourCc, fourCcCode, rgbBitCount, rBitMask, gBitMask, bBitMask, aBitMask, dxgiFormat });
    const width = readU32LE(bytes, 16);
    const height = readU32LE(bytes, 12);
    const depth = readU32LE(bytes, 24);
    const mipCount = Math.max(readU32LE(bytes, 28), 1);
    const dataBytes = Math.max(bytes.byteLength - dataOffset, 0);
    const expectedDataBytes = pixelFormat ? getDdsExpectedDataBytes({
        pixelFormat,
        width,
        height,
        depth,
        mipCount,
        arraySize,
        isCube,
        isVolume
    }) : null;

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
        dimension: isVolume ? "3d" : (isCube ? "cube" : "2d"),
        pixelFormat,
        textureFormat: pixelFormat || fourCc || "dds-legacy",
        isCompressed: COMPRESSED_PIXEL_FORMATS.has(pixelFormat),
        nativeTextureOnly: COMPRESSED_PIXEL_FORMATS.has(pixelFormat) && !canDecodeDdsToRgba({ pixelFormat }),
        hasAlpha: !!(pfFlags & DDS_ALPHAPIXELS) || /rgba|bgra/u.test(pixelFormat),
        hasMipMaps: readU32LE(bytes, 28) > 1
    };
}

function readDdsTexture(bytes, metadata)
{
    if (!metadata.pixelFormat)
    {
        const error = new Error("dds: texture format is not recognized yet");
        error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
        error.sourceFormat = metadata.sourceFormat;
        throw error;
    }

    const subresources = buildDdsSubresources(bytes, metadata);
    return {
        payloadType: OUTPUT_TEXTURE,
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
}

function canDecodeDdsToRgba(metadata)
{
    return [
        "rgba32float",
        "rgb32float",
        "rgba16float",
        "rg32float",
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
    const source = bytes.subarray(metadata.dataOffset + subresource.offset, metadata.dataOffset + subresource.offset + subresource.byteLength);
    const rgba = metadata.pixelFormat.startsWith("bc1-")
        ? decodeBc1(source, metadata.width, metadata.height, subresource.rowPitch)
        : metadata.pixelFormat.startsWith("bc2-")
            ? decodeBc2(source, metadata.width, metadata.height, subresource.rowPitch)
            : metadata.pixelFormat.startsWith("bc3-")
                ? decodeBc3(source, metadata.width, metadata.height, subresource.rowPitch)
                : metadata.pixelFormat.startsWith("bc4-")
                    ? decodeBc4(source, metadata.width, metadata.height, subresource.rowPitch, metadata.pixelFormat.endsWith("-snorm"))
                    : metadata.pixelFormat.startsWith("bc5-")
                        ? decodeBc5(source, metadata.width, metadata.height, subresource.rowPitch, metadata.pixelFormat.endsWith("-snorm"))
                        : metadata.pixelFormat.startsWith("bc6h-")
                            ? decodeBc6h(source, metadata.width, metadata.height, subresource.rowPitch, metadata.pixelFormat === "bc6h-rgb-float")
                            : metadata.pixelFormat.startsWith("bc7-")
                                ? decodeBc7(source, metadata.width, metadata.height, subresource.rowPitch)
                                : isFloatPixelFormat(metadata.pixelFormat)
                                    ? decodeFloatUncompressed(source, metadata)
                                    : decodeUncompressed(source, metadata);

    const isFloat = isFloatPixelFormat(metadata.pixelFormat);

    return {
        payloadType: OUTPUT_RGBA,
        sourceFormat: "dds",
        width: metadata.width,
        height: metadata.height,
        pixelFormat: isFloat ? "rgba32float" : "rgba8unorm",
        strideBytes: metadata.width * (isFloat ? 16 : 4),
        origin: "top-left",
        colorSpace: isFloat ? "linear" : (metadata.pixelFormat.endsWith("-srgb") ? "srgb" : "unknown"),
        alphaMode: metadata.hasAlpha ? "straight" : "opaque",
        metadata,
        data: rgba
    };
}

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
        "r32float": 4,
        "r16float": 2,
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

function decodeUncompressed(source, metadata)
{
    const rgba = new Uint8Array(metadata.width * metadata.height * 4);
    const bytesPerPixel = metadata.pixelFormat === "bgr8unorm" ? 3 :
        metadata.pixelFormat === "rg8unorm" ? 2 :
            metadata.pixelFormat === "r8unorm" ? 1 : 4;
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

function decodeFloatUncompressed(source, metadata)
{
    const rgba = new Float32Array(metadata.width * metadata.height * 4);
    const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
    const bytesPerPixel = {
        "rgba32float": 16,
        "rgb32float": 12,
        "rgba16float": 8,
        "rg32float": 8,
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

function isFloatPixelFormat(pixelFormat)
{
    return typeof pixelFormat === "string" && (pixelFormat.startsWith("bc6h-") ||
        [ "rgba32float", "rgb32float", "rgba16float", "rg32float", "r32float", "r16float" ].includes(pixelFormat));
}

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

function decodeBc2(source, width, height, rowPitch)
{
    return decodeBcAlphaColor(source, width, height, rowPitch, (blockOffset, x, y) =>
    {
        const alphaNibble = (source[blockOffset + y * 2 + Math.floor(x / 2)] >>> ((x % 2) * 4)) & 0x0f;
        return alphaNibble * 17;
    }, 8);
}

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

function decodeSnormByte(value)
{
    const signed = value > 127 ? value - 256 : value;
    return Math.max(-1, signed / 127);
}

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

function decode565(value)
{
    return [
        Math.round(((value >>> 11) & 0x1f) * 255 / 31),
        Math.round(((value >>> 5) & 0x3f) * 255 / 63),
        Math.round((value & 0x1f) * 255 / 31),
        255
    ];
}

function getDdsPixelFormat(format)
{
    if (format.dxgiFormat) return DXGI_PIXEL_FORMATS[format.dxgiFormat] || "";
    if ((format.pfFlags & DDS_FOURCC) && format.fourCc)
    {
        return FOURCC_PIXEL_FORMATS[format.fourCc] || {
            113: "rgba16float",
            116: "rgba32float"
        }[format.fourCcCode] || "";
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
    // D3DFMT_L8 / D3DFMT_A8L8: one channel replicated across RGB, which is
    // not the same as r8unorm (that samples as red only).
    if (format.pfFlags & DDS_LUMINANCE)
    {
        if (format.rgbBitCount === 8 && !(format.pfFlags & DDS_ALPHAPIXELS)) return "l8unorm";
        if (format.rgbBitCount === 16 && (format.pfFlags & DDS_ALPHAPIXELS)) return "l8a8unorm";
    }
    // D3DFMT_A8: alpha only.
    if ((format.pfFlags & DDS_ALPHA) && format.rgbBitCount === 8) return "a8unorm";
    return "";
}

function inspectTGA(bytes)
{
    return {
        sourceFormat: "tga",
        width: readU16LE(bytes, 12),
        height: readU16LE(bytes, 14),
        channels: Math.max(bytes[16] / 8, 1),
        imageType: bytes[2],
        pixelFormat: `tga-${bytes[16]}`,
        isCompressed: [ 9, 10, 11 ].includes(bytes[2])
    };
}

function pngChannels(colorType)
{
    if (colorType === 0) return 1;
    if (colorType === 2) return 3;
    if (colorType === 3) return 1;
    if (colorType === 4) return 2;
    if (colorType === 6) return 4;
    return 0;
}

function readU16BE(bytes, offset)
{
    return (bytes[offset] << 8) | bytes[offset + 1];
}

function readU16LE(bytes, offset)
{
    return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32BE(bytes, offset)
{
    return ((bytes[offset] * 0x1000000) + ((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3])) >>> 0;
}

function readU32LE(bytes, offset)
{
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] * 0x1000000)) >>> 0;
}

function capitalize(value)
{
    return value ? value[0].toUpperCase() + value.slice(1) : "Image";
}
