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
 * Normalizes reader options against their supported defaults for the PNG format
 * reader.
 */
export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsImageFormat")
{
    const values = { ...DEFAULT_VALUES, ...(base || {}), ...(options || {}) };
    values.inputType = normalizeInputType(values.inputType);
    values.emit = normalizeEmit(values.emit, values.inputType, readerName);
    return values;
}

/** Normalizes the requested input representation for the PNG format reader. */
export function normalizeInputType(inputType)
{
    if (!inputType) return "";
    const value = String(inputType).replace(/^\./u, "").toLowerCase();
    return value === "jpg" ? "jpeg" : value;
}

/** Normalizes the requested output representation for the PNG format reader. */
export function normalizeEmit(emit, inputType, readerName)
{
    if (emit === undefined || emit === null) return OUTPUT_RAW;
    if (emit === OUTPUT_JSON && inputType) return DEBUG_OUTPUTS[inputType] || OUTPUT_JSON;
    if ([ OUTPUT_IMAGE, OUTPUT_RGBA, OUTPUT_RAW, OUTPUT_JSON ].includes(emit)) return emit;
    if (Object.values(DEBUG_OUTPUTS).includes(emit)) return emit;
    throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(emit)}`);
}

/** Returns a byte view over the supplied binary input for the PNG format reader. */
export function toBytes(input)
{
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError("Image input must be Uint8Array, ArrayBuffer, or DataView");
}

/** Inspects input using normalized format options for the PNG format reader. */
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
 * Reports whether input is supported under normalized format options for the PNG
 * format reader.
 */
export function probeSupportWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    try
    {
        const metadata = inspectWithValues(input, values, expectedType);
        const pngSupport = metadata.sourceFormat === "png" ? pngRgbaSupport(metadata) : null;
        const variants = [
            {
                kind: "rgba",
                payloadType: "rgba",
                codec: "rgba8unorm",
                supported: pngSupport?.supported === true,
                reason: pngSupport?.reason || `${metadata.sourceFormat.toUpperCase()} RGBA decode is not implemented yet.`,
                meta: { async: true }
            },
            rawVariant(metadata)
        ];

        return {
            format: metadata.sourceFormat,
            source: values.source || "buffer",
            supported: metadata.sourceFormat ? (variants.some((variant) => variant.kind === "rgba" && variant.supported) ? "full" : "partial") : "none",
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

/** Reads input using normalized format options for the PNG format reader. */
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

    const error = new Error(`${metadata.sourceFormat}: emit "${values.emit}" is not implemented yet`);
    error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
    error.sourceFormat = metadata.sourceFormat;
    error.emit = values.emit;
    throw error;
}

/**
 * Reads input asynchronously using normalized format options for the PNG format
 * reader.
 */
export async function readWithValuesAsync(input, values = DEFAULT_VALUES, expectedType = "")
{
    const bytes = toBytes(input);
    const metadata = inspectWithValues(bytes, values, expectedType);

    if (values.emit === OUTPUT_RAW || values.emit === OUTPUT_JSON || values.emit === DEBUG_OUTPUTS[metadata.sourceFormat])
    {
        return readWithValues(bytes, values, expectedType);
    }

    if ((values.emit === OUTPUT_RGBA || values.emit === OUTPUT_IMAGE) && metadata.sourceFormat === "png")
    {
        return decodePngToRgba(bytes, metadata);
    }

    return readWithValues(bytes, values, expectedType);
}

/** Converts a parsed payload into a JSON-safe value for the PNG format reader. */
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
 * Inspects the supplied bytes without decoding their payload for the PNG format
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
 * Reports whether the supplied bytes begin with a PNG signature for the PNG
 * format reader.
 */
export function isPNG(bytes)
{
    return bytes.byteLength >= 24 &&
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
}

/**
 * Reports whether the supplied bytes begin with a JPEG signature for the PNG
 * format reader.
 */
export function isJPEG(bytes)
{
    return bytes.byteLength >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

/**
 * Reports whether the supplied bytes begin with a DDS signature for the PNG
 * format reader.
 */
export function isDDS(bytes)
{
    return bytes.byteLength >= 128 && bytes[0] === 0x44 && bytes[1] === 0x44 && bytes[2] === 0x53 && bytes[3] === 0x20;
}

/**
 * Reports whether the supplied bytes have a supported TGA header for the PNG
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
    const chunks = readPngChunkSummary(bytes);
    return {
        sourceFormat: "png",
        width: readU32BE(bytes, 16),
        height: readU32BE(bytes, 20),
        bitDepth,
        colorType,
        channels: pngChannels(colorType),
        pixelFormat: `png-${bitDepth}-${colorType}`,
        isCompressed: false,
        compressionMethod: bytes[26],
        filterMethod: bytes[27],
        interlaceMethod: bytes[28],
        ...chunks
    };
}

async function decodePngToRgba(bytes, metadata)
{
    const support = pngRgbaSupport(metadata);
    if (!support.supported)
    {
        throwPngUnsupported(metadata, support.reason);
    }

    const chunks = readPngChunks(bytes);
    metadata.__pngPalette = chunks.palette;
    metadata.__pngTransparency = chunks.trns;
    if (chunks.trns && metadata.colorType === 0)
    {
        metadata.__pngTransparentGray = metadata.bitDepth === 16
            ? (chunks.trns[0] << 8) | chunks.trns[1]
            : chunks.trns[1];
    }
    const compressed = concatBytes(chunks.idat);
    const inflated = new Uint8Array(await new Response(
        new Blob([ compressed ]).stream().pipeThrough(new DecompressionStream("deflate"))
    ).arrayBuffer());
    const channels = pngChannels(metadata.colorType);
    const rgba = new Uint8Array(metadata.width * metadata.height * 4);
    if (metadata.interlaceMethod === 0)
    {
        const bytesPerSample = metadata.bitDepth >= 8 ? Math.ceil(metadata.bitDepth / 8) : 1;
        const rowBytes = Math.ceil(metadata.width * channels * metadata.bitDepth / 8);
        const filterBytesPerPixel = Math.max(1, channels * bytesPerSample);
        const expectedLength = metadata.height * (rowBytes + 1);
        if (inflated.byteLength < expectedLength)
        {
            throwPngUnsupported(metadata, "PNG image data is truncated.");
        }

        const rows = unfilterPngRows(inflated, metadata.height, rowBytes, filterBytesPerPixel);
        for (let y = 0; y < metadata.height; y++)
        {
            decodePngRow(rows, y * rowBytes, rgba, y * metadata.width * 4, metadata, metadata.width);
        }
    }
    else
    {
        decodeAdam7Rows(inflated, rgba, metadata);
    }

    return {
        payloadType: OUTPUT_RGBA,
        sourceFormat: "png",
        mimeType: "image/png",
        width: metadata.width,
        height: metadata.height,
        pixelFormat: "rgba8unorm",
        strideBytes: metadata.width * 4,
        origin: "top-left",
        colorSpace: chunks.srgb ? "srgb" : "unknown",
        alphaMode: [ 4, 6 ].includes(metadata.colorType) || chunks.trns ? "straight" : "opaque",
        metadata,
        data: rgba
    };
}

function rawVariant(metadata)
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

function pngRgbaSupport(metadata)
{
    if (metadata.idatChunkCount < 1 || metadata.idatBytes < 1)
    {
        return { supported: false, reason: "PNG has no IDAT image data for RGBA decode." };
    }
    if (!metadata.hasIend)
    {
        return { supported: false, reason: "PNG stream has no complete IEND chunk." };
    }
    const depths = {
        0: [ 1, 2, 4, 8, 16 ],
        2: [ 8, 16 ],
        3: [ 1, 2, 4, 8 ],
        4: [ 8, 16 ],
        6: [ 8, 16 ]
    };
    if (!Object.hasOwn(depths, metadata.colorType) || !depths[metadata.colorType].includes(metadata.bitDepth))
    {
        return { supported: false, reason: "PNG color type and bit depth are unsupported by the RGBA decoder." };
    }
    if (![ 0, 1 ].includes(metadata.interlaceMethod))
    {
        return { supported: false, reason: "PNG interlace method is unsupported by the RGBA decoder." };
    }
    if (metadata.compressionMethod !== 0 || metadata.filterMethod !== 0)
    {
        return { supported: false, reason: "PNG compression/filter methods are unsupported by the RGBA decoder." };
    }
    if (typeof DecompressionStream !== "function" || typeof Blob !== "function" || typeof Response !== "function")
    {
        return { supported: false, reason: "PNG async RGBA decode requires platform DecompressionStream support." };
    }
    return { supported: true, reason: "Use readAsync/readWithValuesAsync for platform deflate decode." };
}

function readPngChunks(bytes)
{
    const chunks = { idat: [], palette: null, trns: null, srgb: false };
    let offset = 8;
    while (offset + 12 <= bytes.byteLength)
    {
        const length = readU32BE(bytes, offset);
        const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
        const start = offset + 8;
        const end = start + length;
        if (end + 4 > bytes.byteLength) break;
        const data = bytes.subarray(start, end);
        if (type === "IDAT") chunks.idat.push(data);
        else if (type === "PLTE") chunks.palette = data;
        else if (type === "tRNS") chunks.trns = data;
        else if (type === "sRGB") chunks.srgb = true;
        offset = end + 4;
        if (type === "IEND") break;
    }
    return chunks;
}

function readPngChunkSummary(bytes)
{
    let cursor = 8;
    let chunkCount = 0;
    let idatChunkCount = 0;
    let idatBytes = 0;
    let hasPalette = false;
    let hasTransparency = false;
    let hasSrgb = false;
    let hasIend = false;
    let chunksComplete = true;
    let pngOffset = null;
    let physicalPixelDimensions = null;
    while (cursor + 12 <= bytes.byteLength)
    {
        const length = readU32BE(bytes, cursor);
        const type = String.fromCharCode(bytes[cursor + 4], bytes[cursor + 5], bytes[cursor + 6], bytes[cursor + 7]);
        const end = cursor + 8 + length;
        if (end + 4 > bytes.byteLength)
        {
            chunksComplete = false;
            break;
        }
        chunkCount++;
        if (type === "IDAT")
        {
            idatChunkCount++;
            idatBytes += length;
        }
        else if (type === "PLTE") hasPalette = true;
        else if (type === "tRNS") hasTransparency = true;
        else if (type === "sRGB") hasSrgb = true;
        else if (type === "oFFs" && length === 9)
        {
            pngOffset = {
                x: readI32BE(bytes, cursor + 8),
                y: readI32BE(bytes, cursor + 12),
                unit: bytes[cursor + 16]
            };
        }
        else if (type === "pHYs" && length === 9)
        {
            physicalPixelDimensions = {
                x: readU32BE(bytes, cursor + 8),
                y: readU32BE(bytes, cursor + 12),
                unit: bytes[cursor + 16]
            };
        }
        else if (type === "IEND") hasIend = true;
        cursor = end + 4;
        if (type === "IEND") break;
    }
    return {
        chunkCount,
        idatChunkCount,
        idatBytes,
        hasPalette,
        hasTransparency,
        hasSrgb,
        hasIend,
        chunksComplete,
        offset: pngOffset,
        physicalPixelDimensions
    };
}

function concatBytes(chunks)
{
    const length = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks)
    {
        output.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return output;
}

function unfilterPngRows(inflated, height, rowBytes, bytesPerPixel)
{
    const rows = new Uint8Array(height * rowBytes);
    let inputOffset = 0;
    for (let y = 0; y < height; y++)
    {
        const filter = inflated[inputOffset++];
        const rowOffset = y * rowBytes;
        const previousOffset = (y - 1) * rowBytes;
        for (let x = 0; x < rowBytes; x++)
        {
            const raw = inflated[inputOffset++];
            const left = x >= bytesPerPixel ? rows[rowOffset + x - bytesPerPixel] : 0;
            const up = y > 0 ? rows[previousOffset + x] : 0;
            const upLeft = y > 0 && x >= bytesPerPixel ? rows[previousOffset + x - bytesPerPixel] : 0;
            let value = raw;
            if (filter === 1) value = raw + left;
            else if (filter === 2) value = raw + up;
            else if (filter === 3) value = raw + Math.floor((left + up) / 2);
            else if (filter === 4) value = raw + paeth(left, up, upLeft);
            else if (filter !== 0) throw new Error(`png: unsupported filter type ${filter}`);
            rows[rowOffset + x] = value & 0xff;
        }
    }
    return rows;
}

function decodePngRow(rows, rowOffset, output, outputOffset, metadata, rowWidth, xStep = 1)
{
    const channels = pngChannels(metadata.colorType);
    const bitDepth = metadata.bitDepth;
    for (let x = 0; x < rowWidth; x++)
    {
        const samples = [];
        for (let channel = 0; channel < channels; channel++)
        {
            samples.push(readPngSample(rows, rowOffset, x * channels + channel, bitDepth));
        }
        const out = outputOffset + x * xStep * 4;
        if (metadata.colorType === 0)
        {
            const gray = scalePngSample(samples[0], bitDepth);
            output[out] = gray;
            output[out + 1] = gray;
            output[out + 2] = gray;
            output[out + 3] = pngTransparentGray(metadata, samples[0]) ? 0 : 255;
        }
        else if (metadata.colorType === 2)
        {
            output[out] = scalePngSample(samples[0], bitDepth);
            output[out + 1] = scalePngSample(samples[1], bitDepth);
            output[out + 2] = scalePngSample(samples[2], bitDepth);
            output[out + 3] = 255;
        }
        else if (metadata.colorType === 3)
        {
            const index = samples[0];
            const palette = metadata.__pngPalette || [];
            output[out] = palette[index * 3] || 0;
            output[out + 1] = palette[index * 3 + 1] || 0;
            output[out + 2] = palette[index * 3 + 2] || 0;
            output[out + 3] = metadata.__pngTransparency?.[index] ?? 255;
        }
        else if (metadata.colorType === 4)
        {
            const gray = scalePngSample(samples[0], bitDepth);
            output[out] = gray;
            output[out + 1] = gray;
            output[out + 2] = gray;
            output[out + 3] = scalePngSample(samples[1], bitDepth);
        }
        else
        {
            output[out] = scalePngSample(samples[0], bitDepth);
            output[out + 1] = scalePngSample(samples[1], bitDepth);
            output[out + 2] = scalePngSample(samples[2], bitDepth);
            output[out + 3] = scalePngSample(samples[3], bitDepth);
        }
    }
}

function decodeAdam7Rows(inflated, output, metadata)
{
    const passes = [
        [ 0, 0, 8, 8 ],
        [ 4, 0, 8, 8 ],
        [ 0, 4, 4, 8 ],
        [ 2, 0, 4, 4 ],
        [ 0, 2, 2, 4 ],
        [ 1, 0, 2, 2 ],
        [ 0, 1, 1, 2 ]
    ];
    const channels = pngChannels(metadata.colorType);
    const bytesPerSample = metadata.bitDepth >= 8 ? Math.ceil(metadata.bitDepth / 8) : 1;
    const filterBytesPerPixel = Math.max(1, channels * bytesPerSample);
    let offset = 0;

    for (const [ xStart, yStart, xStep, yStep ] of passes)
    {
        const passWidth = Math.max(0, Math.ceil((metadata.width - xStart) / xStep));
        const passHeight = Math.max(0, Math.ceil((metadata.height - yStart) / yStep));
        if (passWidth === 0 || passHeight === 0) continue;

        const rowBytes = Math.ceil(passWidth * channels * metadata.bitDepth / 8);
        const expectedLength = passHeight * (rowBytes + 1);
        if (offset + expectedLength > inflated.byteLength)
        {
            throwPngUnsupported(metadata, "PNG Adam7 image data is truncated.");
        }

        const rows = unfilterPngRows(inflated.subarray(offset, offset + expectedLength), passHeight, rowBytes, filterBytesPerPixel);
        for (let y = 0; y < passHeight; y++)
        {
            const destinationY = yStart + y * yStep;
            const destinationX = xStart;
            const outputOffset = (destinationY * metadata.width + destinationX) * 4;
            decodePngRow(rows, y * rowBytes, output, outputOffset, metadata, passWidth, xStep);
        }
        offset += expectedLength;
    }

    if (offset !== inflated.byteLength)
    {
        throwPngUnsupported(metadata, "PNG Adam7 image data has trailing bytes.");
    }
}

function readPngSample(rows, rowOffset, sampleIndex, bitDepth)
{
    if (bitDepth >= 8)
    {
        const bytesPerSample = bitDepth / 8;
        const offset = rowOffset + sampleIndex * bytesPerSample;
        return bytesPerSample === 1 ? rows[offset] : (rows[offset] << 8) | rows[offset + 1];
    }
    const perByte = 8 / bitDepth;
    const offset = rowOffset + Math.floor(sampleIndex / perByte);
    const shift = (perByte - 1 - (sampleIndex % perByte)) * bitDepth;
    return (rows[offset] >>> shift) & ((1 << bitDepth) - 1);
}

function scalePngSample(value, bitDepth)
{
    const max = (1 << Math.min(bitDepth, 16)) - 1;
    return Math.round(value * 255 / max);
}

function pngTransparentGray(metadata, value)
{
    return metadata.__pngTransparentGray !== undefined && value === metadata.__pngTransparentGray;
}

function paeth(a, b, c)
{
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function throwPngUnsupported(metadata, message)
{
    const error = new Error(`png: ${message}`);
    error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
    error.sourceFormat = metadata.sourceFormat;
    throw error;
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

function readI32BE(bytes, offset)
{
    return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getInt32(0, false);
}

function readU32LE(bytes, offset)
{
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] * 0x1000000)) >>> 0;
}

function capitalize(value)
{
    return value ? value[0].toUpperCase() + value.slice(1) : "Image";
}
