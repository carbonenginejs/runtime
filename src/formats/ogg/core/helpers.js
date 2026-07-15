import { decodeVorbis } from "./vorbis.js";

export const OUTPUT_RAW = "raw";
export const OUTPUT_JSON = "json";
export const OUTPUT_PCM = "pcm";
export const OUTPUT_AUDIO = "audio";

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_RAW,
    inputType: "ogg",
    source: ""
});

export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsOggFormat")
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
    if (![ OUTPUT_RAW, OUTPUT_JSON, "oggJson", "audio", "pcm" ].includes(values.emit))
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
    throw new TypeError("OGG input must be Uint8Array, ArrayBuffer, or a view");
}

export function isOGG(bytes)
{
    return bytes.byteLength >= 4 && ascii(bytes, 0, 4) === "OggS";
}

export function inspectWithValues(input, values = DEFAULT_VALUES, expectedType = "ogg")
{
    const bytes = toBytes(input);
    if (!isOGG(bytes)) throw new TypeError("CjsOggFormat: input is not an Ogg container");
    const metadata = inspectOgg(bytes);
    if (expectedType && metadata.sourceFormat !== expectedType)
    {
        throw new TypeError(`CjsOggFormat: expected ${expectedType}, got ${metadata.sourceFormat}`);
    }
    return { ...metadata, byteLength: bytes.byteLength, source: values.source || "buffer" };
}

export function isSupportedWithValues(input, values = DEFAULT_VALUES)
{
    try
    {
        const metadata = inspectWithValues(input, values);
        const mimeType = getOggMimeType(metadata);
        const variants = [
            {
                kind: "raw",
                payloadType: "raw",
                codec: "ogg",
                mimeType,
                supported: true,
                containerOnly: true,
                isDecoded: false,
                pcmDecodeSupported: false,
                frameDecodeSupported: false
            },
            {
                kind: "pcm",
                payloadType: "pcm",
                codec: metadata.codec === "vorbis" ? "float32" : "pcm",
                supported: metadata.codec === "vorbis",
                reason: metadata.codec === "vorbis" ? "" : "Only Ogg Vorbis PCM decode is implemented."
            }
        ];
        if (metadata.mediaType === "video")
        {
            variants.push({
                kind: "decoded",
                payloadType: "video-frame",
                codec: "frames",
                supported: false,
                reason: "OGG Theora frame decode is not implemented yet."
            });
        }
        const pcmSupported = metadata.codec === "vorbis";
        return {
            format: "ogg",
            source: values.source || "buffer",
            supported: "partial",
            confidence: 1,
            preferred: pcmSupported ? "pcm" : (metadata.sourceFormat ? "ogg" : ""),
            reason: pcmSupported
                ? "Ogg Vorbis recognized; PCM decode is supported."
                : "Ogg pages and codec headers are recognized; raw Ogg passthrough is available.",
            metadata,
            variants,
            warnings: [],
            errors: []
        };
    }
    catch (error)
    {
        return {
            format: "ogg",
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
            sourceFormat: "ogg",
            mimeType: getOggMimeType(metadata),
            containerOnly: true,
            isDecoded: false,
            pcmDecodeSupported: false,
            frameDecodeSupported: false,
            metadata,
            bytes
        };
    }
    if (values.emit === OUTPUT_JSON || values.emit === "oggJson") return metadata;
    if (values.emit === OUTPUT_PCM || values.emit === OUTPUT_AUDIO)
    {
        if (metadata.codec !== "vorbis")
        {
            const error = new Error(`ogg: PCM decode supports Vorbis only (found ${metadata.codec})`);
            error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
            throw error;
        }
        const decoded = decodeVorbis(bytes);
        const data = new Float32Array(decoded.sampleCount * decoded.channels);
        for (let channel = 0; channel < decoded.channels; channel++)
        {
            const samples = decoded.channelData[channel];
            for (let i = 0; i < decoded.sampleCount; i++)
            {
                data[i * decoded.channels + channel] = samples[i];
            }
        }
        return {
            payloadType: values.emit === OUTPUT_AUDIO ? OUTPUT_AUDIO : OUTPUT_PCM,
            sourceFormat: "ogg",
            codec: "vorbis",
            containerOnly: false,
            isDecoded: true,
            pcmDecodeSupported: true,
            audioFormat: "float32",
            sampleFormat: "float32",
            sampleRate: decoded.sampleRate,
            channels: decoded.channels,
            interleaving: "interleaved",
            frameCount: decoded.sampleCount,
            durationSeconds: decoded.sampleRate ? decoded.sampleCount / decoded.sampleRate : 0,
            vendor: decoded.vendor,
            comments: decoded.comments,
            loop: decoded.loop,
            channelData: decoded.channelData,
            metadata,
            data
        };
    }
    const error = new Error(`ogg: emit "${values.emit}" is not implemented yet`);
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

function getOggMimeType(metadata)
{
    if (metadata.mediaType === "video") return "video/ogg";
    if (metadata.mediaType === "audio") return "audio/ogg";
    return "application/ogg";
}

function inspectOgg(bytes)
{
    const streams = new Map();
    let offset = 0;
    let pageCount = 0;
    while (offset + 27 <= bytes.byteLength)
    {
        if (ascii(bytes, offset, 4) !== "OggS") throw new Error(`ogg: invalid page at byte ${offset}`);
        const version = bytes[offset + 4];
        if (version !== 0) throw new Error(`ogg: unsupported stream version ${version}`);
        const headerType = bytes[offset + 5];
        if (headerType & 0xf8) throw new Error(`ogg: reserved header flags at byte ${offset}`);
        const granulePosition = readU64LE(bytes, offset + 6);
        const serial = readU32LE(bytes, offset + 14);
        const sequence = readU32LE(bytes, offset + 18);
        const segmentCount = bytes[offset + 26];
        const tableOffset = offset + 27;
        const payloadOffset = tableOffset + segmentCount;
        if (payloadOffset > bytes.byteLength) throw new Error("ogg: truncated segment table");
        let payloadLength = 0;
        for (let i = 0; i < segmentCount; i++) payloadLength += bytes[tableOffset + i];
        if (payloadOffset + payloadLength > bytes.byteLength) throw new Error("ogg: truncated page payload");
        const pageLength = 27 + segmentCount + payloadLength;
        const expectedChecksum = readU32LE(bytes, offset + 22);
        if (computeOggCrc(bytes, offset, pageLength) !== expectedChecksum)
        {
            throw new Error(`ogg: page checksum mismatch at byte ${offset}`);
        }
        const stream = streams.get(serial) || {
            serial,
            pages: 0,
            firstPacket: [],
            packetBytes: 0,
            firstPacketComplete: false,
            packetOpen: false,
            codec: "",
            mediaType: "unknown",
            payloadBytes: 0
        };
        const continued = !!(headerType & 0x01);
        if (stream.pages === 0 && !(headerType & 0x02)) throw new Error(`ogg: first page of stream ${serial} is missing BOS`);
        if (stream.pages === 0 && continued) throw new Error(`ogg: first page of stream ${serial} is marked continued`);
        if (stream.eosSeen) throw new Error(`ogg: page follows EOS for stream ${serial}`);
        if (stream.pages > 0 && continued !== stream.packetOpen)
        {
            throw new Error(`ogg: continued-page state mismatch for stream ${serial}`);
        }
        if ((headerType & 0x02) && stream.pages !== 0) throw new Error(`ogg: BOS page is not first for stream ${serial}`);
        if (stream.lastSequence !== undefined && sequence !== stream.lastSequence + 1)
        {
            throw new Error(`ogg: page sequence mismatch for stream ${serial}`);
        }
        if (stream.pages === 0)
        {
            stream.firstSequence = sequence;
            stream.firstGranulePosition = granulePosition;
            stream.bos = !!(headerType & 0x02);
        }
        stream.pages++;
        stream.payloadBytes += payloadLength;
        collectFirstPacket(stream, bytes, payloadOffset, tableOffset, segmentCount);
        if ((headerType & 0x04) && stream.packetOpen) throw new Error(`ogg: EOS page leaves a packet continued for stream ${serial}`);
        stream.lastGranulePosition = granulePosition;
        stream.granulePosition = granulePosition;
        stream.lastSequence = sequence;
        stream.eos = !!(headerType & 0x04);
        stream.eosSeen = stream.eos;
        streams.set(serial, stream);
        pageCount++;
        offset = payloadOffset + payloadLength;
    }
    if (offset !== bytes.byteLength) throw new Error(`ogg: truncated trailing page at byte ${offset}`);
    if (!pageCount) throw new Error("ogg: no pages found");
    const tracks = Array.from(streams.values()).map(stream => decodeCodec(stream));
    const primary = tracks.find(track => track.mediaType !== "unknown") || tracks[0];
    return {
        payloadType: primary?.mediaType === "video" ? "video" : primary?.mediaType === "audio" ? "audio" : "container",
        mediaTypes: tracks.map(track => track.mediaType),
        sourceFormat: "ogg",
        pageCount,
        streamCount: tracks.length,
        codec: primary?.codec || "ogg",
        mediaType: primary?.mediaType || "unknown",
        tracks
    };
}

function computeOggCrc(bytes, offset, length)
{
    let crc = 0;
    for (let i = 0; i < length; i++)
    {
        const relative = i;
        const value = relative >= 22 && relative < 26 ? 0 : bytes[offset + relative];
        crc ^= value << 24;
        for (let bit = 0; bit < 8; bit++)
        {
            crc = (crc & 0x80000000) ? ((crc << 1) ^ 0x04c11db7) : (crc << 1);
        }
    }
    return crc >>> 0;
}

function collectFirstPacket(stream, bytes, payloadOffset, tableOffset, segmentCount)
{
    let cursor = payloadOffset;
    let lastLength = 0;
    for (let i = 0; i < segmentCount; i++)
    {
        const length = bytes[tableOffset + i];
        if (!stream.firstPacketComplete && stream.packetBytes < 64)
        {
            const copyLength = Math.min(length, 64 - stream.packetBytes);
            stream.firstPacket.push(...bytes.subarray(cursor, cursor + copyLength));
            stream.packetBytes += copyLength;
        }
        cursor += length;
        lastLength = length;
        if (length < 255)
        {
            if (!stream.firstPacketComplete) stream.firstPacketComplete = true;
        }
    }
    stream.packetOpen = segmentCount > 0 && lastLength === 255;
}

function decodeCodec(stream)
{
    const packet = Uint8Array.from(stream.firstPacket);
    if (matches(packet, [ 1, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73 ]))
    {
        if (packet.length < 30) throw new Error(`ogg: truncated Vorbis identification header for stream ${stream.serial}`);
        if (readU32LE(packet, 7) !== 0 || !packet[11] || !readU32LE(packet, 12))
        {
            throw new Error(`ogg: invalid Vorbis identification header for stream ${stream.serial}`);
        }
        stream.codec = "vorbis";
        stream.mediaType = "audio";
        stream.channels = packet[11] || 0;
        stream.sampleRate = readU32LE(packet, 12);
        stream.bitrateMaximum = readS32LE(packet, 16);
        stream.bitrateNominal = readS32LE(packet, 20);
        stream.bitrateMinimum = readS32LE(packet, 24);
        addAudioTiming(stream, 0);
    }
    else if (matches(packet, [ 0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64 ]))
    {
        if (packet.length < 19 || packet[8] !== 1 || !packet[9] || (packet[18] && packet.length < 21 + packet[9]))
        {
            throw new Error(`ogg: invalid OpusHead packet for stream ${stream.serial}`);
        }
        stream.codec = "opus";
        stream.mediaType = "audio";
        stream.channels = packet[9] || 0;
        stream.preSkip = readU16LE(packet, 10);
        stream.inputSampleRate = readU32LE(packet, 12);
        stream.sampleRate = 48000;
        stream.outputGain = readS16LE(packet, 16);
        stream.mappingFamily = packet[18] || 0;
        addAudioTiming(stream, stream.preSkip);
    }
    else if (matches(packet, [ 0x80, 0x74, 0x68, 0x65, 0x6f, 0x72, 0x61 ]))
    {
        if (packet.length < 42) throw new Error(`ogg: truncated Theora identification header for stream ${stream.serial}`);
        stream.codec = "theora";
        stream.mediaType = "video";
        stream.frameWidth = readU16BE(packet, 10) * 16;
        stream.frameHeight = readU16BE(packet, 12) * 16;
        stream.width = readU24BE(packet, 14);
        stream.height = readU24BE(packet, 17);
        stream.frameRateNumerator = readU32BE(packet, 22);
        stream.frameRateDenominator = readU32BE(packet, 26);
        stream.frameRate = stream.frameRateDenominator
            ? stream.frameRateNumerator / stream.frameRateDenominator
            : 0;
        stream.pixelAspectNumerator = readU24BE(packet, 30);
        stream.pixelAspectDenominator = readU24BE(packet, 33);
        stream.pixelAspectRatio = stream.pixelAspectDenominator
            ? stream.pixelAspectNumerator / stream.pixelAspectDenominator
            : 0;
        stream.colorSpace = packet[36] || 0;
    }
    delete stream.firstPacket;
    delete stream.packetBytes;
    delete stream.firstPacketComplete;
    delete stream.packetOpen;
    return stream;
}

function addAudioTiming(stream, preSkip)
{
    stream.granulePosition = stream.lastGranulePosition;
    const granule = typeof stream.lastGranulePosition === "number"
        ? stream.lastGranulePosition
        : typeof stream.lastGranulePosition === "string" && /^\d+$/u.test(stream.lastGranulePosition)
            ? Number(stream.lastGranulePosition)
            : null;
    if (granule === null || !Number.isSafeInteger(granule)) return;
    stream.durationSamples = Math.max(0, granule - preSkip);
    stream.durationSeconds = stream.sampleRate ? stream.durationSamples / stream.sampleRate : 0;
}

function matches(bytes, signature)
{
    return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes, offset, length)
{
    return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function readU16LE(bytes, offset)
{
    return (bytes[offset] || 0) | ((bytes[offset + 1] || 0) << 8);
}

function readU16BE(bytes, offset)
{
    return ((bytes[offset] || 0) << 8) | (bytes[offset + 1] || 0);
}

function readU24BE(bytes, offset)
{
    return ((bytes[offset] || 0) * 0x10000) + ((bytes[offset + 1] || 0) << 8) + (bytes[offset + 2] || 0);
}

function readS16LE(bytes, offset)
{
    const value = readU16LE(bytes, offset);
    return value & 0x8000 ? value - 0x10000 : value;
}

function readU32LE(bytes, offset)
{
    return ((bytes[offset] || 0) | ((bytes[offset + 1] || 0) << 8) | ((bytes[offset + 2] || 0) << 16) | ((bytes[offset + 3] || 0) * 0x1000000)) >>> 0;
}

function readU32BE(bytes, offset)
{
    return (((bytes[offset] || 0) * 0x1000000) + ((bytes[offset + 1] || 0) << 16) + ((bytes[offset + 2] || 0) << 8) + (bytes[offset + 3] || 0)) >>> 0;
}

function readS32LE(bytes, offset)
{
    return readU32LE(bytes, offset) | 0;
}

function readU64LE(bytes, offset)
{
    let value = 0n;
    for (let i = 7; i >= 0; i--) value = (value << 8n) | BigInt(bytes[offset + i] || 0);
    if (value === 0xffffffffffffffffn) return null;
    return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
}
