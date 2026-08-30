import { asUint8Array, readFourCc, readU16LE, readU32BE, readU32LE } from "#utils/bytes";
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
 * Normalizes reader options against their supported defaults for the MP3 format
 * reader.
 */
export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsAudioFormat")
{
    const values = { ...DEFAULT_VALUES, ...(base || {}), ...(options || {}) };
    values.inputType = normalizeInputType(values.inputType);
    values.emit = normalizeEmit(values.emit, values.inputType, readerName);
    return values;
}

/** Normalizes the requested input representation for the MP3 format reader. */
export function normalizeInputType(inputType)
{
    return inputType ? String(inputType).replace(/^\./u, "").toLowerCase() : "";
}

/** Normalizes the requested output representation for the MP3 format reader. */
export function normalizeEmit(emit, inputType, readerName)
{
    if (emit === undefined || emit === null) return OUTPUT_RAW;
    if (emit === OUTPUT_JSON && inputType) return DEBUG_OUTPUTS[inputType] || OUTPUT_JSON;
    if ([ OUTPUT_AUDIO, OUTPUT_PCM, OUTPUT_RAW, OUTPUT_JSON ].includes(emit)) return emit;
    if (Object.values(DEBUG_OUTPUTS).includes(emit)) return emit;
    throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(emit)}`);
}

/** Returns a byte view over the supplied binary input for the MP3 format reader. *//** Inspects input using normalized format options for the MP3 format reader. */
export function inspectWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    const bytes = asUint8Array(input, "Audio input");
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
 * Reports whether input is supported under normalized format options for the MP3
 * format reader.
 */
export function probeSupportWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    try
    {
        const metadata = inspectWithValues(input, values, expectedType);
        const mimeType = getAudioMimeType(metadata);
        const variants = [
            {
                kind: "raw",
                payloadType: "raw",
                codec: metadata.audioFormat || metadata.sourceFormat,
                mimeType,
                supported: true,
            },
            { kind: "pcm", payloadType: "pcm", codec: "pcm", supported: false, reason: "MP3 PCM decode/output is not implemented yet." }
        ];
        return {
            format: metadata.sourceFormat,
            source: values.source || "buffer",
            supported: metadata.sourceFormat ? "partial" : "none",
            confidence: metadata.sourceFormat ? 1 : 0,
            preferredOutput: variants.find((variant) => variant.supported)?.kind || "",
            reason: metadata.sourceFormat ? "Container/header recognized." : "Unrecognized audio format.",
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

/** Reads input using normalized format options for the MP3 format reader. */
export function readWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    const bytes = asUint8Array(input, "Audio input");
    const metadata = inspectWithValues(bytes, values, expectedType);
    if (values.emit === OUTPUT_RAW)
    {
        return {
            payloadType: "raw",
            sourceFormat: metadata.sourceFormat,
            mimeType: getAudioMimeType(metadata),
            metadata,
            bytes
        };
    }
    if (values.emit === OUTPUT_JSON || values.emit === DEBUG_OUTPUTS[metadata.sourceFormat]) return metadata;

    const error = new Error(`${metadata.sourceFormat}: emit "${values.emit}" is not implemented yet`);
    error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
    error.sourceFormat = metadata.sourceFormat;
    error.emit = values.emit;
    throw error;
}

function getAudioMimeType(metadata)
{
    if (metadata.sourceFormat === "wav") return "audio/wav";
    return "audio/mpeg";
}

/** Converts a parsed payload into a JSON-safe value for the MP3 format reader. */
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
 * Inspects the supplied bytes without decoding their payload for the MP3 format
 * reader.
 */
export function inspectBytes(bytes)
{
    if (isWAV(bytes)) return inspectWAV(bytes);
    if (isMP3(bytes)) return inspectMP3(bytes);
    return { sourceFormat: "", audioFormat: "" };
}

/**
 * Reports whether the supplied bytes have a RIFF/WAVE header for the MP3 format
 * reader.
 */
export function isWAV(bytes)
{
    return bytes.byteLength >= 12 && readFourCc(bytes, 0) === "RIFF" && readFourCc(bytes, 8) === "WAVE";
}

/**
 * Reports whether the supplied bytes have a supported MP3 header for the MP3
 * format reader.
 */
export function isMP3(bytes)
{
    return bytes.byteLength >= 3 &&
        (readFourCc(bytes, 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
}

function inspectWAV(bytes)
{
    let offset = 12;
    const info = { sourceFormat: "wav", audioFormat: "wav", sampleRate: 0, channels: 0, bitsPerSample: 0, dataBytes: 0 };
    while (offset + 8 <= bytes.byteLength)
    {
        const id = readFourCc(bytes, offset), size = readU32LE(bytes, offset + 4), dataOffset = offset + 8;
        if (id === "fmt " && dataOffset + 16 <= bytes.byteLength)
        {
            info.formatTag = readU16LE(bytes, dataOffset);
            info.channels = readU16LE(bytes, dataOffset + 2);
            info.sampleRate = readU32LE(bytes, dataOffset + 4);
            info.bitsPerSample = readU16LE(bytes, dataOffset + 14);
        }
        if (id === "data") info.dataBytes = size;
        offset = dataOffset + size + (size & 1);
    }
    return info;
}

function inspectMP3(bytes)
{
    const frame = readMp3FrameHeader(bytes, findMp3FrameOffset(bytes));
    const id3 = readId3Header(bytes);
    const info = {
        sourceFormat: "mp3",
        audioFormat: "mp3",
        hasId3: !!id3,
        id3Version: id3?.version || 0,
        id3Revision: id3?.revision || 0,
        id3Flags: id3?.flags || 0,
        id3Size: id3?.size || 0,
        firstFrameOffset: frame?.offset || 0,
        version: frame?.version || "",
        layer: frame?.layer || "",
        bitrateKbps: frame?.bitrateKbps || 0,
        sampleRate: frame?.sampleRate || 0,
        channels: frame?.channels || 0,
        samplesPerFrame: frame?.samplesPerFrame || 0,
        frameLength: frame?.frameLength || 0,
        frameCount: 0,
        durationSeconds: 0,
        declaredFrameCount: 0,
        declaredByteCount: 0,
        vbrHeader: "",
        encoderDelay: 0,
        encoderPadding: 0
    };

    if (frame)
    {
        const vbr = readVbrHeader(bytes, frame);
        if (vbr)
        {
            info.declaredFrameCount = vbr.frameCount;
            info.declaredByteCount = vbr.byteCount;
            info.vbrHeader = vbr.kind;
            info.encoderDelay = vbr.encoderDelay;
            info.encoderPadding = vbr.encoderPadding;
        }
        let offset = frame.offset;
        while (offset + 4 <= bytes.byteLength && info.frameCount < 1000000)
        {
            const next = readMp3FrameHeader(bytes, offset);
            if (!next || next.frameLength <= 0) break;
            info.frameCount++;
            offset += next.frameLength;
        }
        const frameCount = info.declaredFrameCount || info.frameCount;
        const trimmedSamples = Math.max(0, frameCount * info.samplesPerFrame - info.encoderDelay - info.encoderPadding);
        info.durationSeconds = info.sampleRate ? trimmedSamples / info.sampleRate : 0;
    }

    return info;
}

function readId3Header(bytes)
{
    if (bytes.byteLength < 10 || readFourCc(bytes, 0, 3) !== "ID3") return null;
    return {
        version: bytes[3],
        revision: bytes[4],
        flags: bytes[5],
        size: (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9]
    };
}

function readVbrHeader(bytes, frame)
{
    const sideInfoLength = frame.version === "mpeg1"
        ? frame.channels === 1 ? 17 : 32
        : frame.channels === 1 ? 9 : 17;
    const xingOffset = frame.offset + 4 + sideInfoLength;
    for (const kind of [ "Xing", "Info" ])
    {
        if (readFourCc(bytes, xingOffset, 4) !== kind) continue;
        const flags = readU32BE(bytes, xingOffset + 4);
        const frameCount = (flags & 1) !== 0 ? readU32BE(bytes, xingOffset + 8) : 0;
        const byteCount = (flags & 2) !== 0 ? readU32BE(bytes, xingOffset + 12) : 0;
        const gapless = readLameGapless(bytes, xingOffset + 8 + ((flags & 1) !== 0 ? 4 : 0) + ((flags & 2) !== 0 ? 4 : 0) + ((flags & 4) !== 0 ? 100 : 0));
        return { kind, frameCount, byteCount, ...gapless };
    }

    const vbriOffset = frame.offset + 36;
    if (readFourCc(bytes, vbriOffset, 4) === "VBRI")
    {
        return {
            kind: "VBRI",
            frameCount: readU32BE(bytes, vbriOffset + 14),
            byteCount: readU32BE(bytes, vbriOffset + 10),
            encoderDelay: 0,
            encoderPadding: 0
        };
    }

    return null;
}

function readLameGapless(bytes, searchStart)
{
    const end = Math.min(bytes.byteLength - 3, searchStart + 160);
    for (let offset = searchStart; offset < end; offset++)
    {
        if (readFourCc(bytes, offset, 4) !== "LAME") continue;
        const value = (bytes[offset + 0x15] << 16) | (bytes[offset + 0x16] << 8) | bytes[offset + 0x17];
        return {
            encoderDelay: (value >>> 12) & 0xfff,
            encoderPadding: value & 0xfff
        };
    }
    return { encoderDelay: 0, encoderPadding: 0 };
}

function findMp3FrameOffset(bytes)
{
    let offset = 0;
    if (readFourCc(bytes, 0, 3) === "ID3" && bytes.byteLength >= 10)
    {
        const size = (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9];
        offset = 10 + size + (bytes[5] & 0x10 ? 10 : 0);
    }
    for (; offset + 4 <= bytes.byteLength; offset++)
    {
        if (readMp3FrameHeader(bytes, offset)) return offset;
    }
    return -1;
}

function readMp3FrameHeader(bytes, offset)
{
    if (offset < 0 || offset + 4 > bytes.byteLength) return null;
    const header = ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
    if (((header & 0xffe00000) >>> 0) !== 0xffe00000) return null;

    const versionBits = (header >>> 19) & 3;
    const layerBits = (header >>> 17) & 3;
    const bitrateIndex = (header >>> 12) & 0xf;
    const sampleRateIndex = (header >>> 10) & 3;
    const padding = (header >>> 9) & 1;
    const channelMode = (header >>> 6) & 3;
    if (versionBits === 1 || layerBits !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3)
    {
        return null;
    }

    const version = versionBits === 3 ? "mpeg1" : versionBits === 2 ? "mpeg2" : "mpeg2.5";
    const bitrateTable = version === "mpeg1"
        ? [ 0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320 ]
        : [ 0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160 ];
    const sampleRateTable = version === "mpeg1"
        ? [ 44100, 48000, 32000 ]
        : version === "mpeg2" ? [ 22050, 24000, 16000 ] : [ 11025, 12000, 8000 ];
    const bitrateKbps = bitrateTable[bitrateIndex];
    const sampleRate = sampleRateTable[sampleRateIndex];
    const samplesPerFrame = version === "mpeg1" ? 1152 : 576;
    const frameLength = Math.floor((version === "mpeg1" ? 144000 : 72000) * bitrateKbps / sampleRate) + padding;
    if (offset + frameLength > bytes.byteLength) return null;

    return {
        offset,
        version,
        layer: "layer3",
        bitrateKbps,
        sampleRate,
        channels: channelMode === 3 ? 1 : 2,
        samplesPerFrame,
        frameLength
    };
}



