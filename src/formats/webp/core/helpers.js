export const OUTPUT_RAW = "raw";
export const OUTPUT_JSON = "json";

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_RAW,
    inputType: "webp",
    source: ""
});

export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsWebpFormat")
{
    if (!options || typeof options !== "object" || Array.isArray(options))
    {
        throw new TypeError(`${readerName}: options must be an object`);
    }
    const allowed = new Set([ "emit", "inputType", "source" ]);
    for (const key of Object.keys(options))
    {
        if (!allowed.has(key)) throw new TypeError(`${readerName}: unknown option ${JSON.stringify(key)}`);
    }
    const values = { ...DEFAULT_VALUES, ...(base || {}), ...options };
    if (![ OUTPUT_RAW, OUTPUT_JSON, "webpJson" ].includes(values.emit))
    {
        throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(values.emit)}`);
    }
    return values;
}

export function toBytes(input)
{
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError("WebP input must be Uint8Array, ArrayBuffer, or a view");
}

export function isWebP(bytes)
{
    return bytes.byteLength >= 12 &&
        ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
}

export function inspectWithValues(input, values = DEFAULT_VALUES, expectedType = "webp")
{
    const bytes = toBytes(input);
    if (!isWebP(bytes)) throw new TypeError("CjsWebpFormat: input is not a RIFF WebP container");
    const metadata = inspectWebP(bytes);
    if (expectedType && metadata.sourceFormat !== expectedType)
    {
        throw new TypeError(`CjsWebpFormat: expected ${expectedType}, got ${metadata.sourceFormat}`);
    }
    return { ...metadata, byteLength: bytes.byteLength, source: values.source || "buffer" };
}

export function isSupportedWithValues(input, values = DEFAULT_VALUES)
{
    try
    {
        const metadata = inspectWithValues(input, values);
        return {
            format: "webp",
            source: values.source || "buffer",
            supported: "partial",
            confidence: 1,
            preferred: "raw",
            reason: "WebP container and image metadata are recognized; software RGBA decode is not implemented.",
            metadata,
            variants: [
                {
                    kind: "raw",
                    payloadType: "raw",
                    codec: "webp",
                    mimeType: "image/webp",
                    supported: true,
                    containerOnly: true,
                    isDecoded: false,
                    rgbaDecodeSupported: false
                },
                { kind: "rgba", payloadType: "rgba", codec: "rgba8unorm", supported: false, reason: "WebP software RGBA decode is not implemented yet." }
            ],
            warnings: [],
            errors: []
        };
    }
    catch (error)
    {
        return {
            format: "webp",
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

export function readWithValues(input, values = DEFAULT_VALUES)
{
    const bytes = toBytes(input);
    const metadata = inspectWithValues(bytes, values);
    if (values.emit === OUTPUT_RAW)
    {
        return {
            payloadType: "raw",
            sourceFormat: "webp",
            mimeType: "image/webp",
            containerOnly: true,
            isDecoded: false,
            rgbaDecodeSupported: false,
            metadata,
            bytes
        };
    }
    if (values.emit === OUTPUT_JSON || values.emit === "webpJson") return metadata;
    const error = new Error(`webp: emit "${values.emit}" is not implemented yet`);
    error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
    throw error;
}

export function toJsonValue(value)
{
    if (value instanceof Uint8Array) return { byteLength: value.byteLength };
    if (Array.isArray(value)) return value.map(toJsonValue);
    if (value && typeof value === "object")
    {
        const output = {};
        for (const [ key, entry ] of Object.entries(value)) output[key] = toJsonValue(entry);
        return output;
    }
    return value;
}

function inspectWebP(bytes)
{
    const riffLength = readU32LE(bytes, 4);
    const chunks = [];
    let width = 0;
    let height = 0;
    let codec = "webp";
    let hasAlpha = false;
    let animated = false;
    const animationFrames = [];
    let offset = 12;
    while (offset + 8 <= bytes.byteLength)
    {
        const type = ascii(bytes, offset, 4);
        const size = readU32LE(bytes, offset + 4);
        const dataOffset = offset + 8;
        if (dataOffset + size > bytes.byteLength) throw new Error(`webp: ${type} chunk is truncated`);
        chunks.push({ type, byteOffset: dataOffset, byteLength: size });
        if (type === "VP8 ")
        {
            codec = "vp8";
            if (size >= 10 && bytes[dataOffset + 3] === 0x9d && bytes[dataOffset + 4] === 0x01 && bytes[dataOffset + 5] === 0x2a)
            {
                width = readU16LE(bytes, dataOffset + 6) & 0x3fff;
                height = readU16LE(bytes, dataOffset + 8) & 0x3fff;
            }
        }
        else if (type === "VP8L")
        {
            codec = "vp8l";
            if (size >= 5 && bytes[dataOffset] === 0x2f)
            {
                width = 1 + (bytes[dataOffset + 1] | ((bytes[dataOffset + 2] & 0x3f) << 8));
                height = 1 + ((bytes[dataOffset + 2] >>> 6) | (bytes[dataOffset + 3] << 2) | ((bytes[dataOffset + 4] & 0x0f) << 10));
                hasAlpha = true;
            }
        }
        else if (type === "VP8X")
        {
            codec = "vp8x";
            if (size >= 10)
            {
                const flags = bytes[dataOffset];
                hasAlpha = !!(flags & 0x10);
                animated = !!(flags & 0x02);
                width = 1 + readU24LE(bytes, dataOffset + 4);
                height = 1 + readU24LE(bytes, dataOffset + 7);
            }
        }
        else if (type === "ALPH") hasAlpha = true;
        else if (type === "ANIM") animated = true;
        else if (type === "ANMF")
        {
            animated = true;
            if (size >= 16)
            {
                animationFrames.push({
                    x: readU24LE(bytes, dataOffset),
                    y: readU24LE(bytes, dataOffset + 3),
                    width: 1 + readU24LE(bytes, dataOffset + 6),
                    height: 1 + readU24LE(bytes, dataOffset + 9),
                    durationMs: readU24LE(bytes, dataOffset + 12),
                    flags: bytes[dataOffset + 15]
                });
            }
        }
        offset = dataOffset + size + (size & 1);
    }
    return {
        payloadType: "image",
        mediaTypes: [ "image" ],
        sourceFormat: "webp",
        container: "riff",
        riffLength,
        codec,
        width,
        height,
        hasAlpha,
        animated,
        animationFrameCount: animationFrames.length,
        animationDurationMs: animationFrames.reduce((sum, frame) => sum + frame.durationMs, 0),
        animationFrames,
        isCompressed: true,
        chunks
    };
}

function ascii(bytes, offset, length)
{
    return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function readU16LE(bytes, offset)
{
    return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU24LE(bytes, offset)
{
    return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readU32LE(bytes, offset)
{
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] * 0x1000000)) >>> 0;
}
