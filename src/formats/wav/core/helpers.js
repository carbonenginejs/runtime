export const OUTPUT_AUDIO = "audio";
export const OUTPUT_PCM = "pcm";
export const OUTPUT_RAW = "raw";
export const OUTPUT_JSON = "json";

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_RAW,
    inputType: "",
    source: ""
});

const DEBUG_OUTPUTS = Object.freeze({
    wav: "wavJson",
    mp3: "mp3Json"
});

/**
 * Normalizes reader options against their supported defaults for the WAV format
 * reader.
 */
export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsAudioFormat")
{
    const values = { ...DEFAULT_VALUES, ...(base || {}), ...(options || {}) };
    values.inputType = normalizeInputType(values.inputType);
    values.emit = normalizeEmit(values.emit, values.inputType, readerName);
    return values;
}

/** Normalizes the requested input representation for the WAV format reader. */
export function normalizeInputType(inputType)
{
    return inputType ? String(inputType).replace(/^\./u, "").toLowerCase() : "";
}

/** Normalizes the requested output representation for the WAV format reader. */
export function normalizeEmit(emit, inputType, readerName)
{
    if (emit === undefined || emit === null) return OUTPUT_RAW;
    if (emit === OUTPUT_JSON && inputType) return DEBUG_OUTPUTS[inputType] || OUTPUT_JSON;
    if ([ OUTPUT_AUDIO, OUTPUT_PCM, OUTPUT_RAW, OUTPUT_JSON ].includes(emit)) return emit;
    if (Object.values(DEBUG_OUTPUTS).includes(emit)) return emit;
    throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(emit)}`);
}

/** Returns a byte view over the supplied binary input for the WAV format reader. */
export function toBytes(input)
{
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError("Audio input must be Uint8Array, ArrayBuffer, or DataView");
}

/** Inspects input using normalized format options for the WAV format reader. */
export function inspectWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    const bytes = toBytes(input);
    const metadata = inspectBytes(bytes);
    if (expectedType && metadata.sourceFormat && metadata.sourceFormat !== expectedType)
    {
        throw new TypeError(`CjsAudioFormat: expected ${expectedType}, got ${metadata.sourceFormat}`);
    }
    return {
        payloadType: "audio",
        mediaTypes: [ "audio" ],
        byteLength: bytes.byteLength,
        sourceFormat: expectedType || values.inputType || metadata.sourceFormat,
        ...metadata
    };
}

/**
 * Reports whether input is supported under normalized format options for the WAV
 * format reader.
 */
export function isSupportedWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    try
    {
        const metadata = inspectWithValues(input, values, expectedType);
        const canEmitPcm = metadata.sourceFormat === "wav" && canEmitWavPcm(metadata);
        const mimeType = getAudioMimeType(metadata);
        return {
            format: metadata.sourceFormat,
            source: values.source || "buffer",
            supported: metadata.sourceFormat ? (canEmitPcm ? "full" : "partial") : "none",
            confidence: metadata.sourceFormat ? 1 : 0,
            preferred: canEmitPcm ? "pcm" : "",
            reason: metadata.sourceFormat ? "Container/header recognized." : "Unrecognized audio format.",
            metadata,
            variants: [
                {
                    kind: "raw",
                    payloadType: "raw",
                    codec: metadata.audioFormat || metadata.sourceFormat,
                    mimeType,
                    supported: true,
                    containerOnly: true,
                    isDecoded: false,
                    pcmDecodeSupported: canEmitPcm
                },
                {
                    kind: "pcm",
                    codec: metadata.sampleFormat || "pcm",
                    supported: canEmitPcm,
                    payloadType: canEmitPcm ? "pcm" : "pcm",
                    reason: canEmitPcm ? "" : "Only WAV PCM/IEEE-float data chunks can be emitted as PCM."
                }
            ],
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

/** Reads input using normalized format options for the WAV format reader. */
export function readWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    const bytes = toBytes(input);
    const metadata = inspectWithValues(bytes, values, expectedType);
    if (values.emit === OUTPUT_RAW)
    {
        return {
            payloadType: "raw",
            sourceFormat: metadata.sourceFormat,
            mimeType: getAudioMimeType(metadata),
            containerOnly: true,
            isDecoded: false,
            pcmDecodeSupported: metadata.sourceFormat === "wav" && canEmitWavPcm(metadata),
            metadata,
            bytes
        };
    }
    if (values.emit === OUTPUT_JSON || values.emit === DEBUG_OUTPUTS[metadata.sourceFormat]) return metadata;
    if ((values.emit === OUTPUT_PCM || values.emit === OUTPUT_AUDIO) && metadata.sourceFormat === "wav")
    {
        return readWavPcm(bytes, metadata, values.emit);
    }

    const error = new Error(`${metadata.sourceFormat}: emit "${values.emit}" is not implemented yet`);
    error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
    error.sourceFormat = metadata.sourceFormat;
    error.emit = values.emit;
    throw error;
}

function getAudioMimeType(metadata)
{
    if (metadata.sourceFormat === "mp3") return "audio/mpeg";
    return "audio/wav";
}

/** Converts a parsed payload into a JSON-safe value for the WAV format reader. */
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

/**
 * Inspects the supplied bytes without decoding their payload for the WAV format
 * reader.
 */
export function inspectBytes(bytes)
{
    if (isWAV(bytes)) return inspectWAV(bytes);
    if (isMP3(bytes)) return inspectMP3(bytes);
    return { sourceFormat: "", audioFormat: "" };
}

/**
 * Reports whether the supplied bytes have a RIFF/WAVE header for the WAV format
 * reader.
 */
export function isWAV(bytes)
{
    return bytes.byteLength >= 12 && fourCc(bytes, 0) === "RIFF" && fourCc(bytes, 8) === "WAVE";
}

/**
 * Reports whether the supplied bytes have a supported MP3 header for the WAV
 * format reader.
 */
export function isMP3(bytes)
{
    return bytes.byteLength >= 3 &&
        (fourCc(bytes, 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
}

function inspectWAV(bytes)
{
    let offset = 12;
    const info = {
        sourceFormat: "wav",
        audioFormat: "wav",
        sampleRate: 0,
        channels: 0,
        bitsPerSample: 0,
        byteRate: 0,
        blockAlign: 0,
        dataOffset: 0,
        dataBytes: 0,
        containerFormatTag: 0,
        validBitsPerSample: 0,
        channelMask: 0,
        channelLayout: "unspecified",
        durationSeconds: 0
    };
    while (offset + 8 <= bytes.byteLength)
    {
        const id = fourCc(bytes, offset), size = readU32LE(bytes, offset + 4), dataOffset = offset + 8;
        if (id === "fmt " && dataOffset + 16 <= bytes.byteLength)
        {
            const containerFormatTag = readU16LE(bytes, dataOffset);
            info.containerFormatTag = containerFormatTag;
            info.formatTag = containerFormatTag;
            info.channels = readU16LE(bytes, dataOffset + 2);
            info.sampleRate = readU32LE(bytes, dataOffset + 4);
            info.byteRate = readU32LE(bytes, dataOffset + 8);
            info.blockAlign = readU16LE(bytes, dataOffset + 12);
            info.bitsPerSample = readU16LE(bytes, dataOffset + 14);
            info.validBitsPerSample = info.bitsPerSample;
            if (containerFormatTag === 0xfffe && size >= 40 && dataOffset + 40 <= bytes.byteLength)
            {
                info.validBitsPerSample = readU16LE(bytes, dataOffset + 18) || info.bitsPerSample;
                info.channelMask = readU32LE(bytes, dataOffset + 20);
                info.subFormatTag = readU16LE(bytes, dataOffset + 24);
                info.formatTag = info.subFormatTag;
                info.channelLayout = channelLayoutFromMask(info.channelMask, info.channels);
            }
            info.sampleFormat = wavSampleFormat(info.formatTag, info.bitsPerSample);
        }
        if (id === "data")
        {
            info.dataOffset = dataOffset;
            info.dataBytes = size;
        }
        offset = dataOffset + size + (size & 1);
    }
    info.frameCount = info.blockAlign ? Math.floor(info.dataBytes / info.blockAlign) : 0;
    info.durationSeconds = info.sampleRate ? info.frameCount / info.sampleRate : 0;
    return info;
}

function inspectMP3(bytes)
{
    return {
        sourceFormat: "mp3",
        audioFormat: "mp3",
        hasId3: fourCc(bytes, 0, 3) === "ID3"
    };
}

function fourCc(bytes, offset, length = 4)
{
    let value = "";
    for (let i = 0; i < length; i++) value += String.fromCharCode(bytes[offset + i] || 0);
    return value;
}

function readU16LE(bytes, offset)
{
    return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32LE(bytes, offset)
{
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] * 0x1000000)) >>> 0;
}

function canEmitWavPcm(metadata)
{
    return metadata.dataOffset > 0 &&
        [ 1, 3 ].includes(metadata.formatTag) &&
        metadata.channels > 0 &&
        metadata.sampleRate > 0 &&
        isSupportedWavSampleWidth(metadata);
}

function readWavPcm(bytes, metadata, emit)
{
    if (!canEmitWavPcm(metadata))
    {
        const error = new Error("wav: only PCM and IEEE-float WAV data chunks can be emitted as PCM");
        error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
        error.sourceFormat = metadata.sourceFormat;
        throw error;
    }

    const end = metadata.dataOffset + metadata.dataBytes;
    if (end > bytes.byteLength)
    {
        const error = new Error("wav: data chunk is truncated");
        error.code = "CJS_FORMAT_TRUNCATED";
        error.sourceFormat = metadata.sourceFormat;
        throw error;
    }

    const data = decodeWavSamples(bytes, metadata, end);

    return {
        payloadType: emit === OUTPUT_AUDIO ? OUTPUT_AUDIO : OUTPUT_PCM,
        sourceFormat: "wav",
        containerOnly: false,
        isDecoded: true,
        pcmDecodeSupported: true,
        audioFormat: metadata.sampleFormat,
        sampleFormat: metadata.sampleFormat,
        sampleRate: metadata.sampleRate,
        channels: metadata.channels,
        interleaving: "interleaved",
        channelLayout: metadata.channelLayout || "unspecified",
        bitsPerSample: metadata.bitsPerSample,
        blockAlign: metadata.blockAlign,
        frameCount: metadata.frameCount,
        durationSeconds: metadata.sampleRate ? metadata.frameCount / metadata.sampleRate : 0,
        metadata,
        data
    };
}

function decodeWavSamples(bytes, metadata, end)
{
    const bytesPerSample = metadata.bitsPerSample / 8;
    if (!Number.isInteger(bytesPerSample) || bytesPerSample <= 0 || metadata.dataBytes % bytesPerSample !== 0)
    {
        const error = new Error(`wav: unsupported sample width ${metadata.bitsPerSample}`);
        error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
        error.sourceFormat = metadata.sourceFormat;
        throw error;
    }

    const sampleCount = metadata.dataBytes / bytesPerSample;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (metadata.formatTag === 1)
    {
        if (metadata.bitsPerSample === 8) return Uint8Array.from(bytes.subarray(metadata.dataOffset, end));
        if (metadata.bitsPerSample === 16)
        {
            const data = new Int16Array(sampleCount);
            for (let i = 0; i < sampleCount; i++) data[i] = view.getInt16(metadata.dataOffset + i * 2, true);
            return data;
        }
        if (metadata.bitsPerSample === 24)
        {
            const data = new Int32Array(sampleCount);
            for (let i = 0; i < sampleCount; i++)
            {
                const offset = metadata.dataOffset + i * 3;
                let value = view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
                if (value & 0x800000) value |= 0xff000000;
                data[i] = value;
            }
            return data;
        }
        if (metadata.bitsPerSample === 32)
        {
            const data = new Int32Array(sampleCount);
            for (let i = 0; i < sampleCount; i++) data[i] = view.getInt32(metadata.dataOffset + i * 4, true);
            return data;
        }
    }
    if (metadata.formatTag === 3 && metadata.bitsPerSample === 32)
    {
        const data = new Float32Array(sampleCount);
        for (let i = 0; i < sampleCount; i++) data[i] = view.getFloat32(metadata.dataOffset + i * 4, true);
        return data;
    }
    if (metadata.formatTag === 3 && metadata.bitsPerSample === 64)
    {
        const data = new Float64Array(sampleCount);
        for (let i = 0; i < sampleCount; i++) data[i] = view.getFloat64(metadata.dataOffset + i * 8, true);
        return data;
    }

    const error = new Error(`wav: unsupported ${metadata.sampleFormat} sample data`);
    error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
    error.sourceFormat = metadata.sourceFormat;
    throw error;
}

function isSupportedWavSampleWidth(metadata)
{
    if (metadata.formatTag === 1) return [ 8, 16, 24, 32 ].includes(metadata.bitsPerSample);
    if (metadata.formatTag === 3) return [ 32, 64 ].includes(metadata.bitsPerSample);
    return false;
}

function wavSampleFormat(formatTag, bitsPerSample)
{
    if (formatTag === 3) return `float${bitsPerSample}`;
    if (formatTag === 1) return `pcm${bitsPerSample}`;
    return `wav-format-${formatTag}`;
}

function channelLayoutFromMask(mask, channels)
{
    const names = [
        [ 0x001, "front-left" ], [ 0x002, "front-right" ], [ 0x004, "front-center" ],
        [ 0x008, "low-frequency" ], [ 0x010, "back-left" ], [ 0x020, "back-right" ],
        [ 0x040, "front-left-of-center" ], [ 0x080, "front-right-of-center" ], [ 0x100, "back-center" ],
        [ 0x200, "side-left" ], [ 0x400, "side-right" ], [ 0x800, "top-center" ],
        [ 0x1000, "top-front-left" ], [ 0x2000, "top-front-center" ], [ 0x4000, "top-front-right" ],
        [ 0x8000, "top-back-left" ], [ 0x10000, "top-back-center" ], [ 0x20000, "top-back-right" ]
    ];
    const layout = names.filter(([ bit ]) => mask & bit).map(([ , name ]) => name);
    return layout.length === channels ? layout : layout.length ? layout : "unspecified";
}
