import { readWwiseVar } from "./WwiseCursor.js";
import { toJsonWithByteSummary as toJsonValue } from "../../../format/jsonPolicies.js";
import { asUint8Array, readFourCc } from "#utils/bytes";
import { parseEventAction } from "./eventAction.js";
import { parseGlobalSettings } from "./globalSettings.js";

export const OUTPUT_RAW = "raw";
export const OUTPUT_JSON = "json";
export const OUTPUT_BNK_JSON = "bnkJson";
export const OUTPUT_MEDIA = "media";

/**
 * Normalized BNK reader values.
 *
 * @typedef {object} BnkValues
 * @property {string} emit Output to emit: "raw", "bnkJson" or "media".
 * @property {string} inputType Lowercase input type without a leading dot.
 * @property {string} source Source label copied into inspection and probe results.
 */

/**
 * One chunk header found by the chunk walk.
 *
 * @typedef {object} BnkChunk
 * @property {string} id Chunk FourCC.
 * @property {number} offset Byte offset of the chunk header.
 * @property {number} dataOffset Byte offset of the chunk body.
 * @property {number} size Body byte size.
 * @property {boolean} [truncated] Set when the body runs past the end of the bytes.
 */

/**
 * One embedded media entry from the DIDX index.
 *
 * @typedef {object} BnkMediaEntry
 * @property {number} id Media id.
 * @property {number} offset Byte offset within the DATA chunk.
 * @property {number} absoluteOffset Byte offset within the bank, or 0 without a DATA chunk.
 * @property {number} length Byte length.
 * @property {boolean} available Whether the bytes lie inside the DATA chunk and the bank.
 */

/**
 * One HIRC object with its version-stable typed fields.
 *
 * @typedef {object} BnkHircEntry
 * @property {number} type HIRC type id.
 * @property {string} typeName Advisory type name.
 * @property {number} id Object id.
 * @property {number} offset Byte offset of the object body, at its id.
 * @property {number} size Body byte size, including the id.
 * @property {Uint8Array} payload View over the body after the id.
 * @property {number[]} [actionIds] Event action ids (type 4).
 * @property {number} [actionType] Event action type (type 3).
 * @property {number} [targetId] Event action target id (type 3).
 * @property {object|null} [action] Decoded event action (type 3).
 * @property {number} [pluginId] Sound plugin id (type 2).
 * @property {number} [pluginType] Sound plugin type (type 2).
 * @property {number} [streamType] Sound stream type (type 2).
 * @property {number} [sourceId] Sound source id (type 2).
 * @property {number} [inMemoryMediaSize] Sound in-memory media size (type 2).
 * @property {number} [sourceBits] Sound source bits (type 2).
 * @property {Array<{pluginId: number, pluginType: number, streamType: number, sourceId: number, inMemoryMediaSize: number}>} [sources] Music track sources (type 11).
 */

/**
 * Soundbank metadata from `inspectBNK`; `inspectWithValues` adds
 * `byteLength` and `source`.
 *
 * @typedef {object} BnkInspection
 * @property {string} sourceFormat Always "bnk".
 * @property {number} bankVersion BKHD bank version.
 * @property {number} bankId BKHD bank id.
 * @property {number} languageId BKHD language id.
 * @property {BnkMediaEntry[]} media Embedded media entries.
 * @property {BnkHircEntry[]} hirc HIRC objects.
 * @property {Array<{bankId: number, name: string}>} names Referenced bank names from STID.
 * @property {object|null} globalSettings Decoded STMG global settings, or null.
 * @property {BnkChunk[]} chunks Chunk headers in file order.
 * @property {number} mediaCount Number of media entries.
 * @property {number} hircCount Number of HIRC objects.
 * @property {number} [byteLength] Total byte length of the bank.
 * @property {string} [source] Source label.
 */

/**
 * One embedded media payload.
 *
 * @typedef {object} BnkMediaItem
 * @property {number} id Media id.
 * @property {number} length Byte length.
 * @property {boolean} isWem Whether the payload starts with a RIFF/RIFX WAVE header.
 * @property {Uint8Array} bytes View over the payload; not a copy.
 */

/**
 * Support report returned by `probeSupportWithValues`.
 *
 * @typedef {object} BnkProbeReport
 * @property {string} format Always "bnk".
 * @property {string} source Source label.
 * @property {string} supported "partial" for a soundbank, otherwise "none".
 * @property {number} confidence 1 for a soundbank, otherwise 0.
 * @property {string} preferredOutput Suggested output, or "" when unsupported.
 * @property {string} reason Explanation.
 * @property {BnkInspection|null} metadata Inspection result, or null.
 * @property {object[]} variants Output variants with their support.
 * @property {string[]} warnings Warnings.
 * @property {string[]} errors Error messages.
 */

/**
 * Result of `readWithValues` for the "raw" and "media" outputs; "bnkJson"
 * returns the `BnkInspection` itself.
 *
 * @typedef {object} BnkReadResult
 * @property {string} sourceFormat Always "bnk".
 * @property {BnkInspection} metadata Inspection result.
 * @property {string} [mimeType] "application/octet-stream" for the raw output.
 * @property {Uint8Array} [bytes] The bank bytes, for the raw output.
 * @property {BnkMediaItem[]} [items] Embedded media, for the media output.
 */

/**
 * One Wwise graph point, read without inferring curve meaning.
 *
 * @typedef {object} BnkCurvePoint
 * @property {number} from Finite x value.
 * @property {number} to Finite y value.
 * @property {number} interpolation Interpolation id, 0 to 9.
 */

/**
 * One v150 initial RTPC.
 *
 * @typedef {object} BnkInitialRtpc
 * @property {number} controlId Control id.
 * @property {number} controlType Control type, 0 to 4.
 * @property {number} accumulation Accumulation mode, 0 to 6.
 * @property {number} parameterId Parameter id.
 * @property {number} curveId Curve id.
 * @property {number} scaling Curve scaling: 0, 2, 3 or 4.
 * @property {BnkCurvePoint[]} points Curve points.
 */

/**
 * Outcome of one exact SFX object parse.
 *
 * @typedef {object} BnkParseResult
 * @property {object|null} node Decoded object, or null when the parse failed.
 * @property {number} [anchor] Byte offset where the type-specific tail starts, for an anchored parse.
 * @property {string} reason Failure reason, or "" on success.
 */

export const DEFAULT_VALUES = {
    emit: OUTPUT_RAW,
    inputType: "bnk",
    source: ""
};

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

/** Version-qualified HIRC names for Wwise bank versions 128 through 154. */
export const HIRC_V150_TYPE_NAMES = {
    ...HIRC_TYPE_NAMES,
    16: "fx-share-set",
    17: "fx-custom",
    18: "auxiliary-bus",
    19: "lfo",
    20: "envelope",
    21: "audio-device",
    22: "time-modulator"
};

/**
 * Normalizes reader options against their supported defaults for the BNK format
 * reader.
 *
 * @param {Partial<BnkValues>|null} [base=DEFAULT_VALUES] Values the options are applied over.
 * @param {Partial<BnkValues>|null} [options={}] Option overrides.
 * @param {string} [readerName="CjsBnkFormat"] Reader name used in errors.
 * @returns {BnkValues} A new values record.
 */
export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsBnkFormat")
{
    const values = { ...DEFAULT_VALUES, ...(base || {}), ...(options || {}) };
    values.inputType = values.inputType ? String(values.inputType).replace(/^\./u, "").toLowerCase() : "bnk";
    values.emit = normalizeEmit(values.emit, readerName);
    return values;
}

/**
 * Normalizes the requested output representation for the BNK format reader.
 *
 * @param {string|null|undefined} emit Requested output.
 * @param {string} readerName Reader name used in errors.
 * @returns {string} The output; "raw" when none is given.
 * @throws {TypeError} When the output is not known.
 */
export function normalizeEmit(emit, readerName)
{
    if (emit === undefined || emit === null) return OUTPUT_RAW;
    if ([ OUTPUT_RAW, OUTPUT_BNK_JSON, OUTPUT_MEDIA ].includes(emit)) return emit;
    throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(emit)}`);
}

/**
 * Test for a Wwise soundbank BKHD signature.
 *
 * @param {Uint8Array} bytes Candidate bytes.
 * @returns {boolean} True when the bank header chunk is present.
 */
export function isBNK(bytes)
{
    return bytes.byteLength >= 8 && readFourCc(bytes, 0) === "BKHD";
}

/**
 * Inspect Wwise soundbank bytes without copying media payloads.
 *
 * Walks the chunk sequence and decodes the bank header (BKHD), embedded media
 * index (DIDX/DATA), global settings (STMG), object hierarchy listing (HIRC),
 * and referenced bank names (STID). Unknown chunks are recorded, never
 * rejected; a truncated trailing chunk stops the walk and is flagged.
 *
 * Wwise soundbanks are written little-endian on all platforms EVE ships on;
 * this reader assumes little-endian data.
 *
 * @param {Uint8Array} bytes Soundbank bytes.
 * @returns {BnkInspection} Soundbank metadata.
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
        globalSettings: null,
        chunks: []
    };

    let dataChunkOffset = 0;
    let dataChunkSize = 0;
    let mediaIndex = [];
    let globalSettingsPayload = null;
    let duplicateGlobalSettings = false;
    let offset = 0;

    while (offset + 8 <= bytes.byteLength)
    {
        const id = readFourCc(bytes, offset);
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
        if (id === "STMG")
        {
            if (globalSettingsPayload)
            {
                duplicateGlobalSettings = true;
            }
            else
            {
                globalSettingsPayload = bytes.subarray(
                    dataOffset,
                    dataOffset + size,
                );
            }
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

    if (globalSettingsPayload && !duplicateGlobalSettings)
    {
        info.globalSettings = parseGlobalSettings(
            globalSettingsPayload,
            { bankVersion: info.bankVersion },
        );
    }

    info.mediaCount = info.media.length;
    info.hircCount = info.hirc.length;
    return info;
}

/**
 * Reads the DIDX media index.
 *
 * @param {Uint8Array} bytes Soundbank bytes.
 * @param {number} dataOffset Byte offset of the DIDX body.
 * @param {number} size DIDX body byte size.
 * @returns {Array<{id: number, offset: number, length: number}>} Media entries with offsets relative to DATA.
 */
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

/**
 * Reads the HIRC object listing and decodes each object's typed fields.
 *
 * @param {Uint8Array} bytes Soundbank bytes.
 * @param {number} dataOffset Byte offset of the HIRC body.
 * @param {number} size HIRC body byte size.
 * @param {number} bankVersion BKHD bank version.
 * @returns {BnkHircEntry[]} The objects read before the listing ends or runs short.
 */
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
            typeName: hircTypeName(type, bankVersion),
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
 * Returns the advisory name of a HIRC type for a bank version.
 *
 * @param {number} type HIRC type id.
 * @param {number} bankVersion BKHD bank version.
 * @returns {string} The name, or `hirc-type-<n>` for an unknown id.
 */
function hircTypeName(type, bankVersion)
{
    const names = bankVersion >= 128 && bankVersion <= 154
        ? HIRC_V150_TYPE_NAMES
        : HIRC_TYPE_NAMES;

    return names[type] || `hirc-type-${type}`;
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
 *   u32 inMemoryMediaSize, u8 sourceBits` (streamType 0 = bank data,
 *   1 = streaming prefetch, 2 = streamed). Only plugin type 1 is
 *   codec-backed WEM media.
 * - music-track (11): `u8 flags, u32 sourceCount`, then per source the same
 *   plugin/stream/source/size quad as sound -> `sources`.
 *
 * Deeper structures (container children, positioning, RTPC curves) remain
 * undecoded; consumers interpret `payload` themselves.
 *
 * @param {BnkHircEntry} entry HIRC object to extend in place.
 * @param {number} bankVersion BKHD bank version.
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
        entry.action = parseEventAction(body, { bankVersion });
    }
    else if (entry.type === 2 && body.byteLength >= 13)
    {
        entry.pluginId = readU32(body, 0);
        entry.pluginType = entry.pluginId & 0x0f;
        entry.streamType = body[4];
        entry.sourceId = readU32(body, 5);
        entry.inMemoryMediaSize = readU32(body, 9);
        if (body.byteLength >= 14)
        {
            entry.sourceBits = body[13];
        }
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
 * Reads the STID referenced-bank name table.
 *
 * @param {Uint8Array} bytes Soundbank bytes.
 * @param {number} dataOffset Byte offset of the STID body.
 * @param {number} size STID body byte size.
 * @returns {Array<{bankId: number, name: string}>} The names read before the table ends or runs short.
 */
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

/**
 * Inspects input using normalized format options for the BNK format reader.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
 * @param {BnkValues} [values=DEFAULT_VALUES] Normalized values; `source` labels the result.
 * @returns {BnkInspection} Soundbank metadata with `byteLength` and `source`.
 * @throws {TypeError} When the bytes do not start with a BKHD chunk.
 */
export function inspectWithValues(input, values = DEFAULT_VALUES)
{
    const bytes = asUint8Array(input, "Bnk input");
    if (!isBNK(bytes))
    {
        throw new TypeError("CjsBnkFormat: expected a Wwise soundbank starting with a BKHD chunk");
    }
    return {
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
 * @param {BnkInspection} metadata Inspection result for those bytes.
 * @param {number} [mediaId] Optional single media id filter.
 * @returns {BnkMediaItem[]} Extracted media items.
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
                (readFourCc(payload, 0) === "RIFF" || readFourCc(payload, 0) === "RIFX") &&
                readFourCc(payload, 8) === "WAVE",
            bytes: payload
        });
    }
    return items;
}

/**
 * Reports whether input is supported under normalized format options for the BNK
 * format reader.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input Candidate soundbank bytes.
 * @param {BnkValues} [values=DEFAULT_VALUES] Normalized values; `source` labels the report.
 * @returns {BnkProbeReport} The support report; inspection errors are reported, not thrown.
 */
export function probeSupportWithValues(input, values = DEFAULT_VALUES)
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
            preferredOutput: extractable ? OUTPUT_MEDIA : "raw",
            reason: extractable
                ? "Soundbank recognized; embedded media can be extracted undecoded."
                : "Soundbank recognized; it carries no extractable embedded media.",
            metadata,
            variants: [
                {
                    kind: "raw",
                    codec: "wwise-soundbank",
                    mimeType: "application/octet-stream",
                    supported: true,
                },
                {
                    kind: OUTPUT_MEDIA,
                    codec: "wem",
                    supported: extractable,
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
            preferredOutput: "",
            reason: error.message,
            metadata: null,
            variants: [],
            warnings: [],
            errors: [ error.message ]
        };
    }
}

/**
 * Reads input using normalized format options for the BNK format reader.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
 * @param {BnkValues} [values=DEFAULT_VALUES] Normalized values; `emit` selects the output.
 * @returns {BnkReadResult|BnkInspection} The raw bank, the media items, or the inspection for "bnkJson".
 */
export function readWithValues(input, values = DEFAULT_VALUES)
{
    const bytes = asUint8Array(input, "Bnk input");
    const metadata = inspectWithValues(bytes, values);
    if (values.emit === OUTPUT_BNK_JSON) return metadata;
    if (values.emit === OUTPUT_MEDIA)
    {
        return {
            sourceFormat: "bnk",
            metadata,
            items: extractMedia(bytes, metadata)
        };
    }
    return {
        sourceFormat: "bnk",
        mimeType: "application/octet-stream",
        metadata,
        bytes
    };
}

/** The shared JSON policy for this reader, under the name its callers use. */
export { toJsonValue };

/**
 * Decodes bytes as one character per byte.
 *
 * @param {Uint8Array} bytes Source bytes.
 * @param {number} offset Byte offset of the first character.
 * @param {number} length Character count.
 * @returns {string} The string.
 */
function asciiString(bytes, offset, length)
{
    let value = "";
    for (let i = 0; i < length; i++) value += String.fromCharCode(bytes[offset + i]);
    return value;
}


/**
 * Reads a little-endian unsigned 32-bit integer.
 *
 * @param {Uint8Array} bytes Source bytes.
 * @param {number} offset Byte offset.
 * @returns {number} The value.
 */
function readU32(bytes, offset)
{
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] * 0x1000000)) >>> 0;
}

export { readWwiseVar };
