export const OUTPUT_RAW = "raw";
export const OUTPUT_JSON = "json";
export const OUTPUT_BNK_JSON = "bnkJson";
export const OUTPUT_MEDIA = "media";

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_RAW,
    inputType: "bnk",
    source: ""
});

/**
 * Advisory names for classic HIRC object type ids.
 *
 * Type ids shifted in later Wwise releases, so these names are hints for
 * debugging and inventory work, not a version-exact schema. Unknown ids are
 * reported as `hirc-type-<n>`.
 */
export const HIRC_TYPE_NAMES = Object.freeze({
    1: "settings",
    2: "sound",
    3: "event-action",
    4: "event",
    5: "random-sequence-container",
    6: "switch-container",
    7: "actor-mixer",
    8: "audio-bus",
    9: "blend-container",
    10: "music-segment",
    11: "music-track",
    12: "music-switch-container",
    13: "music-playlist-container",
    14: "attenuation",
    15: "dialogue-event",
    16: "motion-bus",
    17: "motion-fx",
    18: "effect",
    19: "auxiliary-bus",
    20: "lfo",
    21: "envelope",
    22: "audio-device"
});

/**
 * Normalizes reader options against their supported defaults for the BNK format
 * reader.
 */
export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsBnkFormat")
{
    const values = { ...DEFAULT_VALUES, ...(base || {}), ...(options || {}) };
    values.inputType = values.inputType ? String(values.inputType).replace(/^\./u, "").toLowerCase() : "bnk";
    values.emit = normalizeEmit(values.emit, readerName);
    return values;
}

/** Normalizes the requested output representation for the BNK format reader. */
export function normalizeEmit(emit, readerName)
{
    if (emit === undefined || emit === null) return OUTPUT_RAW;
    if (emit === OUTPUT_JSON) return OUTPUT_BNK_JSON;
    if ([ OUTPUT_RAW, OUTPUT_BNK_JSON, OUTPUT_MEDIA ].includes(emit)) return emit;
    throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(emit)}`);
}

/** Returns a byte view over the supplied binary input for the BNK format reader. */
export function toBytes(input)
{
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError("Bnk input must be Uint8Array, ArrayBuffer, or DataView");
}

/**
 * Test for a Wwise soundbank BKHD signature.
 *
 * @param {Uint8Array} bytes Candidate bytes.
 * @returns {boolean} True when the bank header chunk is present.
 */
export function isBNK(bytes)
{
    return bytes.byteLength >= 8 && fourCc(bytes, 0) === "BKHD";
}

/**
 * Inspect Wwise soundbank bytes without copying media payloads.
 *
 * Walks the chunk sequence and decodes the bank header (BKHD), embedded media
 * index (DIDX/DATA), object hierarchy listing (HIRC), and referenced bank
 * names (STID). Unknown chunks are recorded, never rejected; a truncated
 * trailing chunk stops the walk and is flagged.
 *
 * Wwise soundbanks are written little-endian on all platforms EVE ships on;
 * this reader assumes little-endian data.
 *
 * @param {Uint8Array} bytes Soundbank bytes.
 * @returns {object} Soundbank metadata.
 */
export function inspectBNK(bytes)
{
    const info = {
        sourceFormat: "bnk",
        bankVersion: 0,
        bankId: 0,
        languageId: 0,
        media: [],
        hirc: [],
        names: [],
        chunks: []
    };

    let dataChunkOffset = 0;
    let dataChunkSize = 0;
    let mediaIndex = [];
    let offset = 0;

    while (offset + 8 <= bytes.byteLength)
    {
        const id = fourCc(bytes, offset);
        const size = readU32(bytes, offset + 4);
        const dataOffset = offset + 8;
        if (dataOffset + size > bytes.byteLength)
        {
            info.chunks.push({ id, offset, dataOffset, size, truncated: true });
            break;
        }
        info.chunks.push({ id, offset, dataOffset, size });

        if (id === "BKHD" && size >= 12)
        {
            info.bankVersion = readU32(bytes, dataOffset);
            info.bankId = readU32(bytes, dataOffset + 4);
            info.languageId = readU32(bytes, dataOffset + 8);
        }
        if (id === "DIDX")
        {
            mediaIndex = readMediaIndex(bytes, dataOffset, size);
        }
        if (id === "DATA")
        {
            dataChunkOffset = dataOffset;
            dataChunkSize = size;
        }
        if (id === "HIRC")
        {
            info.hirc = readHircListing(
                bytes,
                dataOffset,
                size,
                info.bankVersion,
            );
        }
        if (id === "STID")
        {
            info.names = readNameTable(bytes, dataOffset, size);
        }

        offset = dataOffset + size;
    }

    info.media = mediaIndex.map((entry) =>
    {
        const absoluteOffset = dataChunkOffset + entry.offset;
        const available = dataChunkOffset > 0 &&
            entry.offset + entry.length <= dataChunkSize &&
            absoluteOffset + entry.length <= bytes.byteLength;
        return {
            id: entry.id,
            offset: entry.offset,
            absoluteOffset: dataChunkOffset > 0 ? absoluteOffset : 0,
            length: entry.length,
            available
        };
    });

    info.mediaCount = info.media.length;
    info.hircCount = info.hirc.length;
    return info;
}

function readMediaIndex(bytes, dataOffset, size)
{
    const entries = [];
    const count = Math.floor(size / 12);
    for (let i = 0; i < count; i++)
    {
        const entryOffset = dataOffset + i * 12;
        entries.push({
            id: readU32(bytes, entryOffset),
            offset: readU32(bytes, entryOffset + 4),
            length: readU32(bytes, entryOffset + 8)
        });
    }
    return entries;
}

function readHircListing(bytes, dataOffset, size, bankVersion)
{
    const entries = [];
    if (size < 4) return entries;
    const count = readU32(bytes, dataOffset);
    const end = dataOffset + size;
    let offset = dataOffset + 4;

    for (let i = 0; i < count; i++)
    {
        if (offset + 9 > end) break;
        const type = bytes[offset];
        const entrySize = readU32(bytes, offset + 1);
        const payloadOffset = offset + 5;
        if (entrySize < 4 || payloadOffset + entrySize > end) break;
        const entry = {
            type,
            typeName: HIRC_TYPE_NAMES[type] || `hirc-type-${type}`,
            id: readU32(bytes, payloadOffset),
            offset: payloadOffset,
            size: entrySize,
            // View over the object body AFTER the leading u32 id; not a copy.
            payload: bytes.subarray(payloadOffset + 4, payloadOffset + entrySize)
        };
        decodeHircFields(entry, bankVersion);
        entries.push(entry);
        offset = payloadOffset + entrySize;
    }

    return entries;
}

/**
 * Decode the version-stable typed fields of common HIRC object types in
 * place. Field layouts verified by hexdump against EVE soundbanks (bank
 * generator version 150 / Wwise 2022.1); every read is bounds-checked, and a
 * body too short for its type's layout simply keeps the raw payload only.
 *
 * - event (4): version >122 uses Wwise's MSB-first base-128 action count;
 *   older banks use `u8 actionCount`; both are followed by u32 action ids.
 * - event-action (3): `u16 actionType` (high byte = family: 0x04 play,
 *   0x01 stop, 0x02 pause, 0x03 resume) + `u32 targetId`.
 * - sound (2): `u32 pluginId, u8 streamType, u32 sourceId,
 *   u32 inMemoryMediaSize` (streamType 0 = bank data, 1 = streaming
 *   prefetch, 2 = streamed). Only plugin type 1 is codec-backed WEM media.
 * - music-track (11): `u8 flags, u32 sourceCount`, then per source the same
 *   plugin/stream/source/size quad as sound -> `sources`.
 *
 * Deeper structures (container children, positioning, RTPC curves) remain
 * undecoded; consumers interpret `payload` themselves.
 */
function decodeHircFields(entry, bankVersion)
{
    const body = entry.payload;
    if (entry.type === 4 && body.byteLength >= 1)
    {
        const actionIds = [];
        const decoded = bankVersion > 122
            ? readWwiseVar(body, 0)
            : { value: body[0], nextOffset: 1 };
        const actionCount = decoded?.value ?? 0;
        const actionOffset = decoded?.nextOffset ?? body.byteLength;

        for (let i = 0;
            i < actionCount
            && actionOffset + i * 4 + 4 <= body.byteLength;
            i++)
        {
            actionIds.push(readU32(body, actionOffset + i * 4));
        }
        entry.actionIds = actionIds;
    }
    else if (entry.type === 3 && body.byteLength >= 6)
    {
        entry.actionType = body[0] | (body[1] << 8);
        entry.targetId = readU32(body, 2);
    }
    else if (entry.type === 2 && body.byteLength >= 13)
    {
        entry.pluginId = readU32(body, 0);
        entry.pluginType = entry.pluginId & 0x0f;
        entry.streamType = body[4];
        entry.sourceId = readU32(body, 5);
        entry.inMemoryMediaSize = readU32(body, 9);
    }
    else if (entry.type === 11 && body.byteLength >= 5)
    {
        const sources = [];
        const sourceCount = readU32(body, 1);
        for (let i = 0; i < sourceCount; i++)
        {
            const at = 5 + i * 14;
            if (at + 13 > body.byteLength) break;
            sources.push({
                pluginId: readU32(body, at),
                pluginType: readU32(body, at) & 0x0f,
                streamType: body[at + 4],
                sourceId: readU32(body, at + 5),
                inMemoryMediaSize: readU32(body, at + 9)
            });
        }
        entry.sources = sources;
    }
}

/**
 * Reads Wwise's MSB-first base-128 unsigned integer.
 *
 * @returns {{value:number,nextOffset:number}|null} Decoded value and next
 * offset, or null for truncated, overflowed, or non-canonical input.
 */
export function readWwiseVar(bytes, offset = 0)
{
    let at = Number(offset);
    let value = 0;
    let count = 0;

    if (!Number.isSafeInteger(at) || at < 0)
    {
        return null;
    }

    while (at < bytes.byteLength && count < 5)
    {
        const byte = bytes[at++];

        if (count === 0 && byte === 0x80)
        {
            return null;
        }
        if (value > 0x01ffffff)
        {
            return null;
        }

        value = value * 128 + (byte & 0x7f);
        count++;

        if ((byte & 0x80) === 0)
        {
            return value <= 0xffffffff
                ? { value: value >>> 0, nextOffset: at }
                : null;
        }
    }

    return null;
}

function readNameTable(bytes, dataOffset, size)
{
    const names = [];
    if (size < 8) return names;
    const count = readU32(bytes, dataOffset + 4);
    const end = dataOffset + size;
    let offset = dataOffset + 8;

    for (let i = 0; i < count; i++)
    {
        if (offset + 5 > end) break;
        const bankId = readU32(bytes, offset);
        const length = bytes[offset + 4];
        if (offset + 5 + length > end) break;
        names.push({
            bankId,
            name: asciiString(bytes, offset + 5, length)
        });
        offset += 5 + length;
    }

    return names;
}

/** Inspects input using normalized format options for the BNK format reader. */
export function inspectWithValues(input, values = DEFAULT_VALUES)
{
    const bytes = toBytes(input);
    if (!isBNK(bytes))
    {
        throw new TypeError("CjsBnkFormat: expected a Wwise soundbank starting with a BKHD chunk");
    }
    return {
        payloadType: "audio",
        mediaTypes: [ "audio" ],
        byteLength: bytes.byteLength,
        source: values.source || "buffer",
        ...inspectBNK(bytes)
    };
}

/**
 * Extract embedded media payloads as views over the soundbank bytes.
 *
 * Returned `bytes` are subarray views, not copies; callers that outlive the
 * source buffer should copy them.
 *
 * @param {Uint8Array} bytes Soundbank bytes.
 * @param {object} metadata Inspection result for those bytes.
 * @param {number} [mediaId] Optional single media id filter.
 * @returns {Array<object>} Extracted media items.
 */
export function extractMedia(bytes, metadata, mediaId)
{
    const items = [];
    for (const entry of metadata.media)
    {
        if (mediaId !== undefined && entry.id !== mediaId) continue;
        if (!entry.available) continue;
        const payload = bytes.subarray(entry.absoluteOffset, entry.absoluteOffset + entry.length);
        items.push({
            id: entry.id,
            length: entry.length,
            isWem: payload.length >= 12 &&
                (fourCc(payload, 0) === "RIFF" || fourCc(payload, 0) === "RIFX") &&
                fourCc(payload, 8) === "WAVE",
            bytes: payload
        });
    }
    return items;
}

/**
 * Reports whether input is supported under normalized format options for the BNK
 * format reader.
 */
export function isSupportedWithValues(input, values = DEFAULT_VALUES)
{
    try
    {
        const metadata = inspectWithValues(input, values);
        const extractable = metadata.media.some((entry) => entry.available);
        return {
            format: "bnk",
            source: values.source || "buffer",
            supported: "partial",
            confidence: 1,
            preferred: extractable ? OUTPUT_MEDIA : "raw",
            reason: extractable
                ? "Soundbank recognized; embedded media can be extracted undecoded."
                : "Soundbank recognized; it carries no extractable embedded media.",
            metadata,
            variants: [
                {
                    kind: "raw",
                    payloadType: "raw",
                    codec: "wwise-soundbank",
                    mimeType: "application/octet-stream",
                    supported: true,
                    containerOnly: true,
                    isDecoded: false,
                    pcmDecodeSupported: false
                },
                {
                    kind: OUTPUT_MEDIA,
                    payloadType: OUTPUT_MEDIA,
                    codec: "wem",
                    supported: extractable,
                    containerOnly: true,
                    isDecoded: false,
                    reason: extractable ? "" : "No DIDX/DATA media entries are present."
                }
            ],
            warnings: [],
            errors: []
        };
    }
    catch (error)
    {
        return {
            format: "bnk",
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

/** Reads input using normalized format options for the BNK format reader. */
export function readWithValues(input, values = DEFAULT_VALUES)
{
    const bytes = toBytes(input);
    const metadata = inspectWithValues(bytes, values);
    if (values.emit === OUTPUT_BNK_JSON) return metadata;
    if (values.emit === OUTPUT_MEDIA)
    {
        return {
            payloadType: OUTPUT_MEDIA,
            sourceFormat: "bnk",
            containerOnly: true,
            isDecoded: false,
            metadata,
            items: extractMedia(bytes, metadata)
        };
    }
    return {
        payloadType: "raw",
        sourceFormat: "bnk",
        mimeType: "application/octet-stream",
        containerOnly: true,
        isDecoded: false,
        pcmDecodeSupported: false,
        metadata,
        bytes
    };
}

/** Converts a parsed payload into a JSON-safe value for the BNK format reader. */
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

function asciiString(bytes, offset, length)
{
    let value = "";
    for (let i = 0; i < length; i++) value += String.fromCharCode(bytes[offset + i]);
    return value;
}

function fourCc(bytes, offset, length = 4)
{
    let value = "";
    for (let i = 0; i < length; i++) value += String.fromCharCode(bytes[offset + i] || 0);
    return value;
}

function readU32(bytes, offset)
{
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] * 0x1000000)) >>> 0;
}
