export const OUTPUT_IMAGE = "image";
export const OUTPUT_TEXTURE = "texture";
export const OUTPUT_RGBA = "rgba";
export const OUTPUT_RAW = "raw";
export const OUTPUT_JSON = "json";

import { canDecodeJpeg, decodeJpegToRgba } from "./jpeg.js";

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_RAW,
    inputType: "",
    source: ""
});

const DEBUG_OUTPUTS = Object.freeze({
    png: "pngJson",
    jpeg: "jpegJson",
    jpg: "jpegJson",
    tga: "tgaJson",
    dds: "ddsJson"
});

const IMAGE_MIME_TYPES = Object.freeze({
    png: "image/png",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    tga: "image/x-tga",
    dds: "image/vnd-ms.dds"
});

/**
 * Normalizes reader options against their supported defaults for the JPEG format
 * reader.
 */
export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsImageFormat")
{
    const values = { ...DEFAULT_VALUES, ...(base || {}), ...(options || {}) };
    values.inputType = normalizeInputType(values.inputType);
    values.emit = normalizeEmit(values.emit, values.inputType, readerName);
    return values;
}

/** Normalizes the requested input representation for the JPEG format reader. */
export function normalizeInputType(inputType)
{
    if (!inputType) return "";
    const value = String(inputType).replace(/^\./u, "").toLowerCase();
    return value === "jpg" ? "jpeg" : value;
}

/** Normalizes the requested output representation for the JPEG format reader. */
export function normalizeEmit(emit, inputType, readerName)
{
    if (emit === undefined || emit === null) return OUTPUT_RAW;
    if (emit === OUTPUT_JSON && inputType) return DEBUG_OUTPUTS[inputType] || OUTPUT_JSON;
    if ([ OUTPUT_IMAGE, OUTPUT_RGBA, OUTPUT_RAW, OUTPUT_JSON ].includes(emit)) return emit;
    if (Object.values(DEBUG_OUTPUTS).includes(emit)) return emit;
    throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(emit)}`);
}

/** Returns a byte view over the supplied binary input for the JPEG format reader. */
export function toBytes(input)
{
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError("Image input must be Uint8Array, ArrayBuffer, or DataView");
}

/** Inspects input using normalized format options for the JPEG format reader. */
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
 * Reports whether input is supported under normalized format options for the
 * JPEG format reader.
 */
export function probeSupportWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    try
    {
        const metadata = inspectWithValues(input, values, expectedType);
        const canDecode = metadata.sourceFormat === "jpeg" && canDecodeJpeg(metadata);
        const variants = [
            { kind: "rgba", payloadType: "rgba", codec: "rgba8unorm", supported: canDecode, reason: canDecode ? "" : jpegDecodeReason(metadata)},
            rawVariant(metadata, canDecode)
        ];

        return {
            format: metadata.sourceFormat,
            source: values.source || "buffer",
            supported: metadata.sourceFormat ? (variants.some(variant => variant.supported && variant.kind === "rgba") ? "full" : "partial") : "none",
            confidence: metadata.sourceFormat ? 1 : 0,
            preferredOutput: variants.find(v => v.supported)?.kind || "",
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

/** Reads input using normalized format options for the JPEG format reader. */
export function readWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    const bytes = toBytes(input);
    const metadata = inspectWithValues(bytes, values, expectedType);

    if (values.emit === OUTPUT_RAW)
    {
        return {
            payloadType: "raw",
            sourceFormat: metadata.sourceFormat,
            mimeType: imageMimeType(metadata.sourceFormat),
            metadata,
            bytes
        };
    }

    if (values.emit === OUTPUT_JSON || values.emit === DEBUG_OUTPUTS[metadata.sourceFormat])
    {
        return metadata;
    }

    if ((values.emit === OUTPUT_RGBA || values.emit === OUTPUT_IMAGE) && metadata.sourceFormat === "jpeg")
    {
        if (!canDecodeJpeg(metadata))
        {
            const error = new Error(`jpeg: ${jpegDecodeReason(metadata)}`);
            error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
            throw error;
        }
        return decodeJpegToRgba(bytes, metadata);
    }

    const error = new Error(`${metadata.sourceFormat}: emit "${values.emit}" is not implemented yet`);
    error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
    error.sourceFormat = metadata.sourceFormat;
    error.emit = values.emit;
    throw error;
}

function rawVariant(metadata, canDecode)
{
    return {
        kind: "raw",
        payloadType: "raw",
        codec: metadata.sourceFormat,
        mimeType: imageMimeType(metadata.sourceFormat),
        supported: true,
    };
}

function imageMimeType(sourceFormat)
{
    return IMAGE_MIME_TYPES[sourceFormat] || "application/octet-stream";
}

/** Converts a parsed payload into a JSON-safe value for the JPEG format reader. */
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
 * Inspects the supplied bytes without decoding their payload for the JPEG format
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
 * Reports whether the supplied bytes begin with a PNG signature for the JPEG
 * format reader.
 */
export function isPNG(bytes)
{
    return bytes.byteLength >= 24 &&
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
}

/**
 * Reports whether the supplied bytes begin with a JPEG signature for the JPEG
 * format reader.
 */
export function isJPEG(bytes)
{
    return bytes.byteLength >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

/**
 * Reports whether the supplied bytes begin with a JPEG signature accepted as JPG
 * for the JPEG format reader.
 */
export function isJPG(bytes)
{
    return isJPEG(bytes);
}

/**
 * Reports whether the supplied bytes begin with a DDS signature for the JPEG
 * format reader.
 */
export function isDDS(bytes)
{
    return bytes.byteLength >= 128 && bytes[0] === 0x44 && bytes[1] === 0x44 && bytes[2] === 0x53 && bytes[3] === 0x20;
}

/**
 * Reports whether the supplied bytes have a supported TGA header for the JPEG
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
    let frame = null;
    const summary = {
        appMarkerCount: 0,
        commentCount: 0,
        hasExif: false,
        hasIccProfile: false
    };
    while (offset + 9 < bytes.byteLength)
    {
        if (bytes[offset] !== 0xff)
        {
            offset++;
            continue;
        }
        const marker = bytes[offset + 1], length = readU16BE(bytes, offset + 2);
        const dataStart = offset + 4;
        const dataEnd = offset + 2 + length;
        if (marker >= 0xe0 && marker <= 0xef)
        {
            summary.appMarkerCount++;
            if (marker === 0xe1 && ascii(bytes, dataStart, Math.min(6, dataEnd - dataStart)) === "Exif\0\0") summary.hasExif = true;
            if (marker === 0xe2 && ascii(bytes, dataStart, Math.min(12, dataEnd - dataStart)) === "ICC_PROFILE\0") summary.hasIccProfile = true;
        }
        else if (marker === 0xfe)
        {
            summary.commentCount++;
        }
        if ([ 0xc0, 0xc1, 0xc2, 0xc3 ].includes(marker))
        {
            frame = {
                sourceFormat: "jpeg",
                width: readU16BE(bytes, offset + 7),
                height: readU16BE(bytes, offset + 5),
                channels: bytes[offset + 9],
                components: bytes[offset + 9],
                precision: bytes[offset + 4],
                marker,
                progressive: marker === 0xc2 || marker === 0xc3,
                pixelFormat: "jpeg-ycbcr",
                isCompressed: true
            };
        }
        if (marker === 0xda && frame)
        {
            const scanStart = offset + 4;
            const scanComponents = bytes[scanStart];
            const spectralStart = bytes[scanStart + 1 + scanComponents * 2];
            const spectralEnd = bytes[scanStart + 2 + scanComponents * 2];
            const successive = bytes[scanStart + 3 + scanComponents * 2];
            return {
                ...frame,
                ...summary,
                scanComponents,
                spectralStart,
                spectralEnd,
                successive,
                progressive: frame.progressive || spectralStart !== 0 || spectralEnd !== 63 || successive !== 0
            };
        }
        offset += Math.max(length + 2, 2);
    }
    return frame ? { ...frame, ...summary } : { sourceFormat: "jpeg", width: 0, height: 0, channels: 0, pixelFormat: "jpeg", isCompressed: true, ...summary };
}

function jpegDecodeReason(metadata)
{
    if (metadata.sourceFormat !== "jpeg") return `${metadata.sourceFormat.toUpperCase()} RGBA decode is not implemented yet.`;
    if (metadata.progressive) return "Progressive JPEG software decode is not implemented yet.";
    if (metadata.marker !== undefined && metadata.marker !== 0xc0 && metadata.marker !== 0xc1)
    {
        return "Only sequential baseline JPEG frames are supported by the software decoder.";
    }
    if (metadata.precision !== undefined && metadata.precision !== 8)
    {
        return `JPEG sample precision ${metadata.precision} is not supported by the software decoder.`;
    }
    if (metadata.components > 3) return "CMYK/YCCK JPEG software decode is not implemented yet.";
    return "JPEG baseline frame metadata is incomplete or unsupported.";
}

function inspectDDS(bytes)
{
    const fourCc = String.fromCharCode(bytes[84], bytes[85], bytes[86], bytes[87]).replace(/\0+$/u, "");
    return {
        sourceFormat: "dds",
        width: readU32LE(bytes, 16),
        height: readU32LE(bytes, 12),
        mipCount: Math.max(readU32LE(bytes, 28), 1),
        fourCc,
        textureFormat: fourCc || "dds-legacy",
        isCompressed: !!fourCc,
        hasMipMaps: readU32LE(bytes, 28) > 1
    };
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

function ascii(bytes, offset, length)
{
    return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function capitalize(value)
{
    return value ? value[0].toUpperCase() + value.slice(1) : "Image";
}
