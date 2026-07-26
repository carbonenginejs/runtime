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
 * Normalizes reader options against their supported defaults for the TGA format
 * reader.
 */
export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsImageFormat")
{
    const values = { ...DEFAULT_VALUES, ...(base || {}), ...(options || {}) };
    values.inputType = normalizeInputType(values.inputType);
    values.emit = normalizeEmit(values.emit, values.inputType, readerName);
    return values;
}

/** Normalizes the requested input representation for the TGA format reader. */
export function normalizeInputType(inputType)
{
    if (!inputType) return "";
    const value = String(inputType).replace(/^\./u, "").toLowerCase();
    return value === "jpg" ? "jpeg" : value;
}

/** Normalizes the requested output representation for the TGA format reader. */
export function normalizeEmit(emit, inputType, readerName)
{
    if (emit === undefined || emit === null) return OUTPUT_RAW;
    if (emit === OUTPUT_JSON && inputType) return DEBUG_OUTPUTS[inputType] || OUTPUT_JSON;
    if ([ OUTPUT_IMAGE, OUTPUT_RGBA, OUTPUT_RAW, OUTPUT_JSON ].includes(emit)) return emit;
    if (Object.values(DEBUG_OUTPUTS).includes(emit)) return emit;
    throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(emit)}`);
}

/** Returns a byte view over the supplied binary input for the TGA format reader. */
export function toBytes(input)
{
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError("Image input must be Uint8Array, ArrayBuffer, or DataView");
}

/** Inspects input using normalized format options for the TGA format reader. */
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
 * Reports whether input is supported under normalized format options for the TGA
 * format reader.
 */
export function isSupportedWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    try
    {
        const metadata = inspectWithValues(input, values, expectedType);
        const canDecodeTga = metadata.sourceFormat === "tga" && canDecodeTgaToRgba(metadata);
        let variants;
        if (metadata.sourceFormat === "tga")
        {
            variants = [
                {
                    kind: "rgba",
                    payloadType: "rgba",
                    codec: "rgba8unorm",
                    supported: canDecodeTga,
                    reason: canDecodeTga ? "" : "Only supported true-color, grayscale, and indexed TGA images are decoded to RGBA.",
                    containerOnly: false,
                    isDecoded: canDecodeTga,
                    rgbaDecodeSupported: canDecodeTga
                },
                rawVariant(metadata, canDecodeTga)
            ];
        }
        else
        {
            variants = [
                rawVariant(metadata, false),
                { kind: "rgba", payloadType: "rgba", codec: "rgba8unorm", supported: false, reason: `${metadata.sourceFormat.toUpperCase()} RGBA decode is not implemented yet.`, containerOnly: false, isDecoded: false, rgbaDecodeSupported: false }
            ];
        }

        return {
            format: metadata.sourceFormat,
            source: values.source || "buffer",
            supported: metadata.sourceFormat ? (variants.some(v => v.supported && v.kind === "rgba") ? "full" : "partial") : "none",
            confidence: metadata.sourceFormat ? 1 : 0,
            preferred: variants.find(v => v.supported)?.codec || "",
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

/** Reads input using normalized format options for the TGA format reader. */
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
            containerOnly: true,
            isDecoded: false,
            rgbaDecodeSupported: metadata.sourceFormat === "tga" && canDecodeTgaToRgba(metadata),
            metadata,
            bytes
        };
    }

    if (values.emit === OUTPUT_JSON || values.emit === DEBUG_OUTPUTS[metadata.sourceFormat])
    {
        return metadata;
    }

    if ((values.emit === OUTPUT_RGBA || values.emit === OUTPUT_IMAGE) && metadata.sourceFormat === "tga")
    {
        return decodeTgaToRgba(bytes, metadata);
    }

    const error = new Error(`${metadata.sourceFormat}: emit "${values.emit}" is not implemented yet`);
    error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
    error.sourceFormat = metadata.sourceFormat;
    error.emit = values.emit;
    throw error;
}

/** Converts a parsed payload into a JSON-safe value for the TGA format reader. */
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
 * Inspects the supplied bytes without decoding their payload for the TGA format
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
 * Reports whether the supplied bytes begin with a PNG signature for the TGA
 * format reader.
 */
export function isPNG(bytes)
{
    return bytes.byteLength >= 24 &&
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
}

/**
 * Reports whether the supplied bytes begin with a JPEG signature for the TGA
 * format reader.
 */
export function isJPEG(bytes)
{
    return bytes.byteLength >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

/**
 * Reports whether the supplied bytes begin with a DDS signature for the TGA
 * format reader.
 */
export function isDDS(bytes)
{
    return bytes.byteLength >= 128 && bytes[0] === 0x44 && bytes[1] === 0x44 && bytes[2] === 0x53 && bytes[3] === 0x20;
}

/**
 * Reports whether the supplied bytes have a supported TGA header for the TGA
 * format reader.
 */
export function isTGA(bytes)
{
    if (bytes.byteLength < 18) return false;
    const imageType = bytes[2], width = readU16LE(bytes, 12), height = readU16LE(bytes, 14), bpp = bytes[16];
    return width > 0 && height > 0 && [ 1, 2, 3, 9, 10, 11 ].includes(imageType) && [ 8, 15, 16, 24, 32 ].includes(bpp);
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
    const descriptor = bytes[17];
    const colorMapEntryBytes = Math.ceil(bytes[7] / 8);
    const colorMapBytes = readU16LE(bytes, 5) * colorMapEntryBytes;
    const imageDataOffset = 18 + bytes[0] + colorMapBytes;
    return {
        sourceFormat: "tga",
        idLength: bytes[0],
        colorMapType: bytes[1],
        colorMapFirst: readU16LE(bytes, 3),
        colorMapLength: readU16LE(bytes, 5),
        colorMapEntryBits: bytes[7],
        colorMapBytes,
        imageDataOffset,
        imageDataBytes: Math.max(0, bytes.byteLength - imageDataOffset),
        width: readU16LE(bytes, 12),
        height: readU16LE(bytes, 14),
        channels: Math.max(bytes[16] / 8, 1),
        imageType: bytes[2],
        bitsPerPixel: bytes[16],
        descriptor,
        alphaBits: descriptor & 0x0f,
        hasAlpha: bytes[16] === 32 || bytes[16] === 16 || bytes[7] === 32 || bytes[7] === 16,
        origin: getTgaOrigin(descriptor),
        pixelFormat: `tga-${bytes[16]}`,
        isCompressed: [ 9, 10, 11 ].includes(bytes[2])
    };
}

function canDecodeTgaToRgba(metadata)
{
    const indexed = [ 1, 9 ].includes(metadata.imageType);
    const direct = [ 2, 3, 10, 11 ].includes(metadata.imageType);
    return hasMinimumTgaDataForRgba(metadata) && (
        (direct && metadata.colorMapType === 0 && [ 8, 15, 16, 24, 32 ].includes(metadata.bitsPerPixel)) ||
        (indexed && metadata.colorMapType === 1 && metadata.colorMapLength > 0 &&
            [ 8, 15, 16, 24, 32 ].includes(metadata.colorMapEntryBits) && [ 8, 16 ].includes(metadata.bitsPerPixel))
    );
}

function hasMinimumTgaDataForRgba(metadata)
{
    if (metadata.byteLength < metadata.imageDataOffset) return false;
    if ([ 9, 10, 11 ].includes(metadata.imageType)) return metadata.imageDataBytes > 0;
    return metadata.imageDataBytes >= metadata.width * metadata.height * Math.ceil(metadata.bitsPerPixel / 8);
}

function decodeTgaToRgba(bytes, metadata)
{
    if (!canDecodeTgaToRgba(metadata))
    {
        throwUnsupported(metadata, "Only true-color, grayscale, and indexed TGA images can be decoded to RGBA.");
    }

    const bytesPerPixel = Math.ceil(metadata.bitsPerPixel / 8);
    const palette = metadata.colorMapType === 1 ? readTgaPalette(bytes, metadata) : null;
    const imageOffset = 18 + metadata.idLength + (palette ? metadata.colorMapLength * (metadata.colorMapEntryBits / 8) : 0);
    metadata.palette = palette;
    const pixelCount = metadata.width * metadata.height;
    const rgba = new Uint8Array(pixelCount * 4);

    let inputOffset = imageOffset;
    let pixelIndex = 0;

    if ([ 1, 2, 3 ].includes(metadata.imageType))
    {
        while (pixelIndex < pixelCount)
        {
            inputOffset = readTgaPixel(bytes, inputOffset, bytesPerPixel, metadata, rgba, pixelIndex++);
        }
    }
    else
    {
        while (pixelIndex < pixelCount)
        {
            const packet = bytes[inputOffset++];
            const count = (packet & 0x7f) + 1;
            if (packet & 0x80)
            {
                const pixel = readTgaPixelBytes(bytes, inputOffset, bytesPerPixel, metadata);
                inputOffset += bytesPerPixel;
                for (let i = 0; i < count && pixelIndex < pixelCount; i++) writeTgaPixel(rgba, pixelIndex++, pixel, metadata);
            }
            else
            {
                for (let i = 0; i < count && pixelIndex < pixelCount; i++)
                {
                    inputOffset = readTgaPixel(bytes, inputOffset, bytesPerPixel, metadata, rgba, pixelIndex++);
                }
            }
        }
    }

    return {
        payloadType: OUTPUT_RGBA,
        sourceFormat: "tga",
        mimeType: "image/x-tga",
        containerOnly: false,
        isDecoded: true,
        rgbaDecodeSupported: true,
        width: metadata.width,
        height: metadata.height,
        pixelFormat: "rgba8unorm",
        strideBytes: metadata.width * 4,
        origin: "top-left",
        colorSpace: "srgb",
        alphaMode: metadata.hasAlpha ? "straight" : "opaque",
        metadata,
        data: rgba
    };
}

function rawVariant(metadata, canDecode)
{
    return {
        kind: "raw",
        payloadType: "raw",
        codec: metadata.sourceFormat,
        mimeType: imageMimeType(metadata.sourceFormat),
        supported: true,
        containerOnly: true,
        isDecoded: false,
        rgbaDecodeSupported: metadata.sourceFormat === "tga" && canDecode === true
    };
}

function imageMimeType(sourceFormat)
{
    return IMAGE_MIME_TYPES[sourceFormat] || "application/octet-stream";
}

function readTgaPixel(bytes, offset, bytesPerPixel, metadata, rgba, pixelIndex)
{
    const pixel = readTgaPixelBytes(bytes, offset, bytesPerPixel, metadata);
    writeTgaPixel(rgba, pixelIndex, pixel, metadata);
    return offset + bytesPerPixel;
}

function readTgaPixelBytes(bytes, offset, bytesPerPixel, metadata)
{
    if (offset + bytesPerPixel > bytes.byteLength) throwUnsupported(metadata, "TGA pixel data is truncated.");

    if ([ 1, 9 ].includes(metadata.imageType))
    {
        const index = bytesPerPixel === 2 ? readU16LE(bytes, offset) : bytes[offset];
        return metadata.palette[index - metadata.colorMapFirst] || [ 0, 0, 0, 0 ];
    }

    if (metadata.imageType === 3 || metadata.imageType === 11)
    {
        const value = bytes[offset];
        return [ value, value, value, bytesPerPixel > 1 ? bytes[offset + 1] : 255 ];
    }

    if (bytesPerPixel === 2)
    {
        const value = readU16LE(bytes, offset);
        const r = ((value >>> 10) & 0x1f) * 255 / 31;
        const g = ((value >>> 5) & 0x1f) * 255 / 31;
        const b = (value & 0x1f) * 255 / 31;
        const a = metadata.bitsPerPixel === 15 || (metadata.descriptor & 0x0f) === 0
            ? 255
            : value & 0x8000 ? 255 : 0;
        return [ r, g, b, a ];
    }

    return [
        bytes[offset + 2],
        bytes[offset + 1],
        bytes[offset],
        bytesPerPixel === 4 ? bytes[offset + 3] : 255
    ];
}

function readTgaPalette(bytes, metadata)
{
    const entryBytes = Math.ceil(metadata.colorMapEntryBits / 8);
    const offset = 18 + metadata.idLength;
    const end = offset + metadata.colorMapLength * entryBytes;
    if (end > bytes.byteLength)
    {
        throwUnsupported(metadata, "TGA color map is truncated.");
    }

    const palette = [];
    for (let i = 0; i < metadata.colorMapLength; i++)
    {
        palette.push(readTgaColor(bytes, offset + i * entryBytes, entryBytes, metadata.colorMapEntryBits));
    }
    return palette;
}

function readTgaColor(bytes, offset, entryBytes, entryBits)
{
    if (entryBytes === 2)
    {
        const value = readU16LE(bytes, offset);
        return [
            Math.round(((value >>> 10) & 0x1f) * 255 / 31),
            Math.round(((value >>> 5) & 0x1f) * 255 / 31),
            Math.round((value & 0x1f) * 255 / 31),
            entryBits === 16 && (value & 0x8000) ? 255 : entryBits === 16 ? 0 : 255
        ];
    }
    return [
        bytes[offset + 2],
        bytes[offset + 1],
        bytes[offset],
        entryBits === 32 ? bytes[offset + 3] : 255
    ];
}

function writeTgaPixel(rgba, pixelIndex, pixel, metadata)
{
    const offset = getTgaOutputOffset(metadata, pixelIndex) * 4;
    rgba[offset] = pixel[0];
    rgba[offset + 1] = pixel[1];
    rgba[offset + 2] = pixel[2];
    rgba[offset + 3] = pixel[3];
}

function getTgaOutputOffset(metadata, pixelIndex)
{
    const xInput = pixelIndex % metadata.width;
    const yInput = Math.floor(pixelIndex / metadata.width);
    const x = metadata.origin.endsWith("right") ? metadata.width - 1 - xInput : xInput;
    const y = metadata.origin.startsWith("top") ? yInput : metadata.height - 1 - yInput;
    return y * metadata.width + x;
}

function getTgaOrigin(descriptor)
{
    const top = !!(descriptor & 0x20);
    const right = !!(descriptor & 0x10);
    return `${top ? "top" : "bottom"}-${right ? "right" : "left"}`;
}

function throwUnsupported(metadata, message)
{
    const error = new Error(`tga: ${message}`);
    error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
    error.sourceFormat = metadata.sourceFormat;
    throw error;
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
