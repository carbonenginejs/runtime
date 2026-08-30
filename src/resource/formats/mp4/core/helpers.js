import { readFourCc, readU16BE, readU32BE } from "#utils/bytes";
export const OUTPUT_VIDEO = "video";
export const OUTPUT_RAW = "raw";
export const OUTPUT_JSON = "json";

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_RAW,
    inputType: "",
    source: ""
});

const DEBUG_OUTPUTS = Object.freeze({
    mp4: "mp4Json",
    m4a: "mp4Json",
    webm: "webmJson"
});

/**
 * Normalizes reader options against their supported defaults for the MP4 format
 * reader.
 */
export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsVideoFormat")
{
    const values = { ...DEFAULT_VALUES, ...(base || {}), ...(options || {}) };
    values.inputType = values.inputType ? String(values.inputType).replace(/^\./u, "").toLowerCase() : "";
    values.emit = normalizeEmit(values.emit, values.inputType, readerName);
    return values;
}

/** Normalizes the requested output representation for the MP4 format reader. */
export function normalizeEmit(emit, inputType, readerName)
{
    if (emit === undefined || emit === null) return OUTPUT_RAW;
    if (emit === OUTPUT_JSON && inputType) return DEBUG_OUTPUTS[inputType] || OUTPUT_JSON;
    if ([ OUTPUT_VIDEO, OUTPUT_RAW, OUTPUT_JSON ].includes(emit)) return emit;
    if (Object.values(DEBUG_OUTPUTS).includes(emit)) return emit;
    throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(emit)}`);
}

/** Returns a byte view over the supplied binary input for the MP4 format reader. */
export function toBytes(input)
{
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError("Video input must be Uint8Array, ArrayBuffer, or DataView");
}

/** Inspects input using normalized format options for the MP4 format reader. */
export function inspectWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    const bytes = toBytes(input);
    const metadata = inspectBytes(bytes);
    if (expectedType && metadata.sourceFormat && metadata.sourceFormat !== expectedType)
    {
        throw new TypeError(`CjsVideoFormat: expected ${expectedType}, got ${metadata.sourceFormat}`);
    }
    return {
        payloadType: "video",
        mediaTypes: [ "video" ],
        byteLength: bytes.byteLength,
        sourceFormat: expectedType || values.inputType || metadata.sourceFormat,
        ...metadata
    };
}

/**
 * Reports whether input is supported under normalized format options for the MP4
 * format reader.
 */
export function probeSupportWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    try
    {
        const metadata = inspectWithValues(input, values, expectedType);
        const codecs = getTrackCodecSummary(metadata);
        const mimeType = getMediaMimeType(metadata);
        return {
            format: metadata.sourceFormat,
            source: values.source || "buffer",
            supported: metadata.sourceFormat ? "partial" : "none",
            confidence: metadata.sourceFormat ? 1 : 0,
            preferredOutput: "video",
            reason: metadata.sourceFormat ? "Container/header recognized." : "Unrecognized video format.",
            metadata,
            variants: [
                {
                    kind: "raw",
                    payloadType: "raw",
                    codec: metadata.sourceFormat,
                    mimeType,
                    supported: true,
                },
                {
                    kind: "container",
                    payloadType: "video",
                    codec: metadata.sourceFormat,
                    mimeType,
                    codecs: codecs.codecs,
                    videoCodecs: codecs.videoCodecs,
                    audioCodecs: codecs.audioCodecs,
                    supported: true,
                },
                {
                    kind: "decoded",
                    payloadType: "video-frame",
                    codec: "frames",
                    supported: false,
                    reason: "Video decode is not implemented in this package."
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
            preferredOutput: "",
            reason: error.message,
            metadata: null,
            variants: [],
            warnings: [],
            errors: [ error.message ]
        };
    }
}

/** Reads input using normalized format options for the MP4 format reader. */
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
    if (values.emit === OUTPUT_JSON || values.emit === DEBUG_OUTPUTS[metadata.sourceFormat]) return metadata;

    if (values.emit === OUTPUT_VIDEO && metadata.sourceFormat === "mp4")
    {
        const codecs = getTrackCodecSummary(metadata);
        const mimeType = getMediaMimeType(metadata);
        return {
            payloadType: OUTPUT_VIDEO,
            sourceFormat: "mp4",
            container: metadata.container,
            mimeType,
            codecs: codecs.codecs,
            videoCodecs: codecs.videoCodecs,
            audioCodecs: codecs.audioCodecs,
            duration: metadata.duration || 0,
            durationTimescale: metadata.durationTimescale || 1,
            tracks: metadata.tracks || [],
            metadata,
            sourceBytes: bytes
        };
    }

    const error = new Error(`${metadata.sourceFormat}: emit "${values.emit}" is not implemented yet`);
    error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
    error.sourceFormat = metadata.sourceFormat;
    error.emit = values.emit;
    throw error;
}

function getTrackCodecSummary(metadata)
{
    const tracks = Array.isArray(metadata.tracks) ? metadata.tracks : [];
    return {
        codecs: uniqueTrackCodecs(tracks),
        videoCodecs: uniqueTrackCodecs(tracks.filter((track) => track.type === "video")),
        audioCodecs: uniqueTrackCodecs(tracks.filter((track) => track.type === "audio"))
    };
}

function uniqueTrackCodecs(tracks)
{
    return [ ...new Set(tracks.map((track) => track.codec).filter(Boolean)) ];
}

function getMediaMimeType(metadata)
{
    const tracks = Array.isArray(metadata.tracks) ? metadata.tracks : [];
    return tracks.some((track) => track.type === "video") ? "video/mp4" : "audio/mp4";
}

/**
 * Inspects the supplied bytes without decoding their payload for the MP4 format
 * reader.
 */
export function inspectBytes(bytes)
{
    if (isMP4(bytes)) return inspectMP4(bytes);
    if (isWebM(bytes)) return inspectWebM();
    return { sourceFormat: "" };
}

/**
 * Reports whether the supplied bytes have an ISO base-media header for the MP4
 * format reader.
 */
export function isMP4(bytes)
{
    return bytes.byteLength >= 12 && readFourCc(bytes, 4) === "ftyp";
}

/**
 * Reports whether the supplied bytes have a WebM EBML header for the MP4 format
 * reader.
 */
export function isWebM(bytes)
{
    return bytes.byteLength >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
}

/** Converts a parsed payload into a JSON-safe value for the MP4 format reader. */
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

function inspectMP4(bytes)
{
    const boxes = readMp4Boxes(bytes, 0, bytes.byteLength);
    const ftyp = boxes.find((box) => box.type === "ftyp");
    const moov = boxes.find((box) => box.type === "moov");
    const movie = moov ? inspectMp4Movie(bytes, moov) : { duration: 0, durationTimescale: 1, tracks: [] };
    return {
        sourceFormat: "mp4",
        brand: ftyp ? readFourCc(bytes, ftyp.dataStart) : readFourCc(bytes, 8),
        compatibleBrands: ftyp ? readMp4Brands(bytes, ftyp) : [],
        container: "isobmff",
        ...movie
    };
}

function inspectMp4Movie(bytes, moov)
{
    const mvhd = findMp4Child(bytes, moov, "mvhd");
    const movieTiming = mvhd ? readMp4Timing(bytes, mvhd) : { duration: 0, durationTimescale: 1 };
    const tracks = findMp4Children(bytes, moov, "trak").map((trak) => inspectMp4Track(bytes, trak));
    return { ...movieTiming, tracks };
}

function inspectMp4Track(bytes, trak)
{
    const tkhd = findMp4Child(bytes, trak, "tkhd");
    const mdia = findMp4Child(bytes, trak, "mdia");
    const mdhd = mdia ? findMp4Child(bytes, mdia, "mdhd") : null;
    const hdlr = mdia ? findMp4Child(bytes, mdia, "hdlr") : null;
    const minf = mdia ? findMp4Child(bytes, mdia, "minf") : null;
    const stbl = minf ? findMp4Child(bytes, minf, "stbl") : null;
    const stsd = stbl ? findMp4Child(bytes, stbl, "stsd") : null;
    const sampleTable = stbl ? readMp4SampleTable(bytes, stbl) : null;
    const timing = mdhd ? readMp4Timing(bytes, mdhd) : { duration: 0, durationTimescale: 1 };
    const handler = hdlr && hdlr.dataLength >= 12 ? readFourCc(bytes, hdlr.dataStart + 8) : "";
    const sample = stsd ? readMp4SampleEntry(bytes, stsd) : null;
    const track = {
        id: tkhd ? readMp4TrackId(bytes, tkhd) : 0,
        type: handler === "vide" ? "video" : handler === "soun" ? "audio" : handler || "unknown",
        handler,
        codec: sample?.codec || "",
        duration: timing.duration,
        durationTimescale: timing.durationTimescale,
        language: mdhd ? readMp4Language(bytes, mdhd) : "und"
    };
    if (sample?.width) track.width = sample.width;
    if (sample?.height) track.height = sample.height;
    if (sample?.channels) track.channels = sample.channels;
    if (sample?.sampleRate) track.sampleRate = sample.sampleRate;
    if (sampleTable) track.sampleTable = sampleTable;
    return track;
}

function readMp4SampleTable(bytes, stbl)
{
    const stts = findMp4Child(bytes, stbl, "stts");
    const stsc = findMp4Child(bytes, stbl, "stsc");
    const stsz = findMp4Child(bytes, stbl, "stsz");
    const stco = findMp4Child(bytes, stbl, "stco");
    const co64 = findMp4Child(bytes, stbl, "co64");
    const stss = findMp4Child(bytes, stbl, "stss");
    const ctts = findMp4Child(bytes, stbl, "ctts");
    if (!stts && !stsc && !stsz && !stco && !co64 && !stss && !ctts) return null;

    const timing = stts ? readMp4TimeToSample(bytes, stts) : { entryCount: 0, sampleCount: 0, duration: 0 };
    const composition = ctts ? readMp4CompositionOffsets(bytes, ctts) : { entryCount: 0, sampleCount: 0, minOffset: 0, maxOffset: 0 };
    const sizes = stsz ? readMp4SampleSizes(bytes, stsz) : { sampleCount: 0, bytes: 0, fixedSize: 0 };
    return {
        sampleCount: sizes.sampleCount || timing.sampleCount,
        sampleBytes: sizes.bytes,
        fixedSampleBytes: sizes.fixedSize,
        decodeTimeEntries: timing.entryCount,
        decodeDuration: timing.duration,
        compositionTimeEntries: composition.entryCount,
        compositionSampleCount: composition.sampleCount,
        compositionOffsetMin: composition.minOffset,
        compositionOffsetMax: composition.maxOffset,
        chunkCount: stco ? readMp4Count(bytes, stco, 4) : co64 ? readMp4Count(bytes, co64, 4) : 0,
        chunkOffsetType: stco ? "stco" : co64 ? "co64" : "",
        sampleToChunkEntries: stsc ? readMp4Count(bytes, stsc, 4) : 0,
        keyframeCount: stss ? readMp4Count(bytes, stss, 4) : 0
    };
}

function readMp4TimeToSample(bytes, box)
{
    const entryCount = readMp4Count(bytes, box, 4);
    let sampleCount = 0;
    let duration = 0;
    for (let index = 0; index < entryCount; index++)
    {
        const offset = box.dataStart + 8 + index * 8;
        if (offset + 8 > box.end) break;
        const count = readU32BE(bytes, offset);
        const delta = readU32BE(bytes, offset + 4);
        sampleCount += count;
        duration += count * delta;
    }
    return { entryCount, sampleCount, duration };
}

function readMp4CompositionOffsets(bytes, box)
{
    const version = bytes[box.dataStart];
    const entryCount = readMp4Count(bytes, box, 4);
    let sampleCount = 0;
    let minOffset = 0;
    let maxOffset = 0;
    for (let index = 0; index < entryCount; index++)
    {
        const offset = box.dataStart + 8 + index * 8;
        if (offset + 8 > box.end) break;
        const count = readU32BE(bytes, offset);
        const compositionOffset = version === 1 ? readI32BE(bytes, offset + 4) : readU32BE(bytes, offset + 4);
        sampleCount += count;
        minOffset = index === 0 ? compositionOffset : Math.min(minOffset, compositionOffset);
        maxOffset = index === 0 ? compositionOffset : Math.max(maxOffset, compositionOffset);
    }
    return { entryCount, sampleCount, minOffset, maxOffset };
}

function readMp4SampleSizes(bytes, box)
{
    const fixedSize = readU32BE(bytes, box.dataStart + 4);
    const sampleCount = readU32BE(bytes, box.dataStart + 8);
    if (fixedSize !== 0) return { sampleCount, bytes: fixedSize * sampleCount, fixedSize };

    let total = 0;
    for (let index = 0; index < sampleCount; index++)
    {
        const offset = box.dataStart + 12 + index * 4;
        if (offset + 4 > box.end) break;
        total += readU32BE(bytes, offset);
    }
    return { sampleCount, bytes: total, fixedSize: 0 };
}

function readMp4Count(bytes, box, offset)
{
    return box.dataStart + offset + 4 <= box.end ? readU32BE(bytes, box.dataStart + offset) : 0;
}

function readMp4Timing(bytes, box)
{
    const version = bytes[box.dataStart];
    const offset = version === 1 ? 20 : 12;
    const durationOffset = version === 1 ? 28 : 16;
    return {
        durationTimescale: readU32BE(bytes, box.dataStart + offset) || 1,
        duration: version === 1 ? readU64BE(bytes, box.dataStart + durationOffset) : readU32BE(bytes, box.dataStart + durationOffset)
    };
}

function readMp4TrackId(bytes, box)
{
    return readU32BE(bytes, box.dataStart + (bytes[box.dataStart] === 1 ? 20 : 12));
}

function readMp4Language(bytes, box)
{
    const offset = box.dataStart + (bytes[box.dataStart] === 1 ? 32 : 20);
    const value = readU16BE(bytes, offset) & 0x7fff;
    if (!value) return "und";
    return String.fromCharCode(
        ((value >>> 10) & 0x1f) + 0x60,
        ((value >>> 5) & 0x1f) + 0x60,
        (value & 0x1f) + 0x60
    );
}

function readMp4SampleEntry(bytes, stsd)
{
    if (stsd.dataLength < 16) return null;
    const entryCount = readU32BE(bytes, stsd.dataStart + 4);
    if (!entryCount) return null;
    const entry = readMp4Boxes(bytes, stsd.dataStart + 8, stsd.end)[0];
    if (!entry) return null;
    const result = { codec: readFourCc(bytes, entry.start + 4) };
    if (result.codec === "avc1" || result.codec === "avc3" || result.codec === "hvc1" || result.codec === "hev1" || result.codec === "vp09" || result.codec === "av01")
    {
        result.width = readU16BE(bytes, entry.dataStart + 16);
        result.height = readU16BE(bytes, entry.dataStart + 18);
    }
    else if ([ "mp4a", "ac-3", "ec-3", "Opus" ].includes(result.codec))
    {
        result.channels = readU16BE(bytes, entry.dataStart + 8);
        result.sampleRate = readU32BE(bytes, entry.dataStart + 16) >>> 16;
    }
    return result;
}

function readMp4Brands(bytes, ftyp)
{
    const brands = [];
    for (let offset = ftyp.dataStart + 8; offset + 4 <= ftyp.end; offset += 4)
    {
        brands.push(readFourCc(bytes, offset));
    }
    return brands;
}

function readMp4Boxes(bytes, start, end)
{
    const boxes = [];
    let offset = start;
    while (offset + 8 <= end)
    {
        let size = readU32BE(bytes, offset);
        const type = readFourCc(bytes, offset + 4);
        let headerSize = 8;
        if (size === 1 && offset + 16 <= end)
        {
            size = readU64BE(bytes, offset + 8);
            headerSize = 16;
        }
        if (size === 0) size = end - offset;
        if (size < headerSize || offset + size > end) break;
        boxes.push({ type, start: offset, dataStart: offset + headerSize, dataLength: size - headerSize, end: offset + size });
        offset += size;
    }
    return boxes;
}

function findMp4Child(bytes, parent, type)
{
    return readMp4Boxes(bytes, parent.dataStart, parent.end).find((box) => box.type === type) || null;
}

function findMp4Children(bytes, parent, type)
{
    return readMp4Boxes(bytes, parent.dataStart, parent.end).filter((box) => box.type === type);
}

function inspectWebM()
{
    return {
        sourceFormat: "webm",
        container: "ebml"
    };
}


function readI32BE(bytes, offset)
{
    return readU32BE(bytes, offset) | 0;
}

function readU64BE(bytes, offset)
{
    return readU32BE(bytes, offset) * 0x100000000 + readU32BE(bytes, offset + 4);
}
