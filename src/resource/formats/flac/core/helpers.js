import { toJsonWithByteSummary as toJsonValue } from "../../../format/jsonPolicies.js";
import { asUint8Array, readU16BE, readU24BE, readU32BE, readU32LE } from "#utils/bytes";

export const OUTPUT_RAW = "raw";
export const OUTPUT_PCM = "pcm";
export const OUTPUT_JSON = "json";

export const DEFAULT_VALUES = {
    emit: OUTPUT_RAW,
    inputType: "",
    source: ""
};

const DEBUG_OUTPUT = "flacJson";

/**
 * Normalized FLAC reader options.
 *
 * @typedef {object} FlacValues
 * @property {string} emit Output to emit: "raw", "pcm", "json" or "flacJson".
 * @property {string} inputType Lower-case expected source type without a leading dot, or "".
 * @property {string} source Diagnostic source label, or "".
 */

/**
 * Stream metadata read from a FLAC file without decoding PCM.
 *
 * @typedef {object} FlacInspection
 * @property {number} byteLength Input length in bytes.
 * @property {"flac"} sourceFormat Always "flac".
 * @property {"flac"} container Always "flac".
 * @property {"flac"} audioFormat Always "flac".
 * @property {number} sampleRate Samples per second from STREAMINFO.
 * @property {number} channels Channel count from STREAMINFO.
 * @property {number} bitsPerSample Bits per sample from STREAMINFO.
 * @property {number} totalSamples Total samples per channel from STREAMINFO.
 * @property {number} durationSamples Same as `totalSamples`.
 * @property {number} durationSeconds `totalSamples / sampleRate`, or 0 without a sample rate.
 * @property {object} streamInfo STREAMINFO fields.
 * @property {?{vendor:string,comments:string[]}} comments Vorbis comment block, or null.
 * @property {Array<{sampleNumber:?number,offset:?number,numberSamples:number}>} seekTable Seek points.
 * @property {object[]} pictures PICTURE block fields.
 * @property {number} metadataBlockCount Number of metadata blocks read.
 * @property {boolean} hasLastMetadataBlock Whether a block flagged as last was reached.
 * @property {number} audioDataOffset Byte offset of the first audio frame.
 * @property {number} audioDataBytes Bytes from `audioDataOffset` to the end of input.
 * @property {object[]} metadataBlocks Every metadata block header with its parsed fields.
 */

/**
 * Normalizes reader options against their supported defaults for the FLAC format
 * reader.
 *
 * @param {Partial<FlacValues>|null} [base=DEFAULT_VALUES] Values to start from.
 * @param {Partial<FlacValues>|null} [options={}] Caller options layered over `base`.
 * @param {string} [options.emit] Output to emit.
 * @param {string} [options.inputType] Expected source type; a leading dot is removed.
 * @param {string} [readerName="CjsFlacFormat"] Name used in error messages.
 * @returns {FlacValues} The normalized values.
 * @throws {TypeError} When `emit` is not a supported output.
 */
export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsFlacFormat")
{
    const values = { ...DEFAULT_VALUES, ...(base || {}), ...(options || {}) };
    values.inputType = values.inputType ? String(values.inputType).replace(/^\./u, "").toLowerCase() : "";
    if (![ OUTPUT_RAW, OUTPUT_PCM, OUTPUT_JSON, DEBUG_OUTPUT ].includes(values.emit))
    {
        throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(values.emit)}`);
    }
    return values;
}

/**
 * Reports whether the bytes start with the FLAC `fLaC` signature.
 *
 * @param {Uint8Array} bytes File bytes.
 * @returns {boolean} True when the signature is present.
 */
export function isFLAC(bytes)
{
    return bytes.byteLength >= 4 && bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43;
}

/**
 * Inspects input using normalized format options for the FLAC format reader.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
 * @param {FlacValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @param {string} [expectedType=""] Expected source type; overrides `values.inputType`.
 * @returns {FlacInspection} The stream metadata.
 * @throws {TypeError} When the input is not a FLAC stream or the expected type is not "flac".
 */
export function inspectWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    const bytes = asUint8Array(input, "FLAC input");
    if (!isFLAC(bytes)) throw new TypeError("CjsFlacFormat: input is not a FLAC stream");
    const sourceFormat = expectedType || values.inputType || "flac";
    if (sourceFormat !== "flac") throw new TypeError(`CjsFlacFormat: expected ${sourceFormat}, got flac`);
    return { byteLength: bytes.byteLength, ...inspectBytes(bytes) };
}

/**
 * Reports whether input is supported under normalized format options for the
 * FLAC format reader.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
 * @param {FlacValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @param {string} [expectedType=""] Expected source type; overrides `values.inputType`.
 * @returns {object} Support report with `supported` "partial" and the inspection
 *     metadata, or `supported` "none" and the error message when inspection fails.
 */
export function probeSupportWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    try
    {
        const metadata = inspectWithValues(input, values, expectedType);
        return {
            format: "flac",
            source: values.source || "buffer",
            supported: "partial",
            confidence: 1,
            preferredOutput: "raw",
            reason: "FLAC metadata and raw source are recognized; PCM decoding remains a backend/decoder task.",
            metadata,
            variants: [
                {
                    kind: "raw",
                    codec: "flac",
                    mimeType: "audio/flac",
                    supported: true,
                },
                { kind: "pcm", codec: "pcm", supported: false, reason: "FLAC PCM decode/output is not implemented in this package." }
            ],
            warnings: [],
            errors: []
        };
    }
    catch (error)
    {
        return {
            format: expectedType || values.inputType || "flac",
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
 * Reads input using normalized format options for the FLAC format reader.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
 * @param {FlacValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @param {string} [expectedType=""] Expected source type; overrides `values.inputType`.
 * @returns {FlacInspection|{sourceFormat:"flac",mimeType:"audio/flac",metadata:FlacInspection,bytes:Uint8Array}}
 *     The inspection for "json"/"flacJson", otherwise the raw container bytes with metadata.
 * @throws {Error} With code `CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED` when `values.emit` is "pcm".
 */
export function readWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    const bytes = asUint8Array(input, "FLAC input");
    const metadata = inspectWithValues(bytes, values, expectedType);
    if (values.emit === OUTPUT_JSON || values.emit === DEBUG_OUTPUT) return metadata;
    if (values.emit === OUTPUT_PCM)
    {
        const error = new Error("flac: PCM decode/output is not implemented in this package");
        error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
        error.sourceFormat = "flac";
        error.emit = values.emit;
        throw error;
    }
    return {
        sourceFormat: "flac",
        mimeType: "audio/flac",
        metadata,
        bytes
    };
}

/** The shared JSON policy for this reader, under the name its callers use. */
export { toJsonValue };

/**
 * Walks the metadata blocks after the signature and summarises the stream.
 *
 * @param {Uint8Array} bytes File bytes starting with `fLaC`.
 * @returns {Omit<FlacInspection, "byteLength">} The stream metadata.
 * @throws {Error} When a block is truncated or there is no STREAMINFO block.
 */
function inspectBytes(bytes)
{
    const blocks = [];
    let offset = 4;
    let streamInfo = null;
    let comments = null;
    let seekTable = [];
    const pictures = [];
    let hasLastMetadataBlock = false;
    while (offset + 4 <= bytes.byteLength)
    {
        const header = bytes[offset];
        const type = header & 0x7f;
        const isLast = !!(header & 0x80);
        const length = readU24BE(bytes, offset + 1);
        const dataStart = offset + 4;
        const end = dataStart + length;
        if (end > bytes.byteLength) throw new Error(`FLAC metadata block ${type} is truncated`);
        const block = { type, isLast, offset, byteLength: length };
        if (type === 0)
        {
            if (length < 34) throw new Error("FLAC STREAMINFO block is truncated");
            streamInfo = readStreamInfo(bytes, dataStart);
            Object.assign(block, streamInfo);
        }
        else if (type === 4)
        {
            comments = readVorbisComment(bytes, dataStart, end);
            Object.assign(block, { vendor: comments.vendor, comments: comments.comments });
        }
        else if (type === 3)
        {
            seekTable = readSeekTable(bytes, dataStart, length);
            block.points = seekTable;
        }
        else if (type === 6)
        {
            const picture = readPicture(bytes, dataStart, end);
            pictures.push(picture);
            Object.assign(block, picture);
        }
        blocks.push(block);
        offset = end;
        if (isLast)
        {
            hasLastMetadataBlock = true;
            break;
        }
    }
    if (!streamInfo) throw new Error("FLAC stream has no STREAMINFO block");
    return {
        sourceFormat: "flac",
        container: "flac",
        audioFormat: "flac",
        sampleRate: streamInfo.sampleRate,
        channels: streamInfo.channels,
        bitsPerSample: streamInfo.bitsPerSample,
        totalSamples: streamInfo.totalSamples,
        durationSamples: streamInfo.totalSamples,
        durationSeconds: streamInfo.sampleRate ? streamInfo.totalSamples / streamInfo.sampleRate : 0,
        streamInfo,
        comments,
        seekTable,
        pictures,
        metadataBlockCount: blocks.length,
        hasLastMetadataBlock,
        audioDataOffset: offset,
        audioDataBytes: Math.max(0, bytes.byteLength - offset),
        metadataBlocks: blocks
    };
}

/**
 * Reads the 34-byte STREAMINFO block body.
 *
 * @param {Uint8Array} bytes File bytes.
 * @param {number} offset Byte offset of the block body.
 * @returns {{minBlockSize:number,maxBlockSize:number,minFrameSize:number,maxFrameSize:number,sampleRate:number,channels:number,bitsPerSample:number,totalSamples:number,md5:string}}
 *     The STREAMINFO fields; `md5` is lower-case hex.
 */
function readStreamInfo(bytes, offset)
{
    const sampleRate = bytes[offset + 10] * 4096 + bytes[offset + 11] * 16 + (bytes[offset + 12] >> 4);
    const channels = ((bytes[offset + 12] >> 1) & 0x07) + 1;
    const bitsPerSample = (((bytes[offset + 12] & 1) << 4) | (bytes[offset + 13] >> 4)) + 1;
    const totalSamples = (bytes[offset + 13] & 0x0f) * 0x100000000 + readU32BE(bytes, offset + 14);
    return {
        minBlockSize: readU16BE(bytes, offset),
        maxBlockSize: readU16BE(bytes, offset + 2),
        minFrameSize: readU24BE(bytes, offset + 4),
        maxFrameSize: readU24BE(bytes, offset + 7),
        sampleRate,
        channels,
        bitsPerSample,
        totalSamples,
        md5: Array.from(bytes.subarray(offset + 18, offset + 34), (value) => value.toString(16).padStart(2, "0")).join("")
    };
}

/**
 * Reads a VORBIS_COMMENT block body.
 *
 * @param {Uint8Array} bytes File bytes.
 * @param {number} start Byte offset of the block body.
 * @param {number} end Byte offset one past the block body.
 * @returns {{vendor:string,comments:string[]}} The vendor string and comment entries.
 * @throws {Error} When the block is truncated.
 */
function readVorbisComment(bytes, start, end)
{
    let offset = start;
    if (offset + 8 > end) throw new Error("FLAC Vorbis comment block is truncated");
    const vendorLength = readU32LE(bytes, offset);
    offset += 4;
    if (offset + vendorLength + 4 > end) throw new Error("FLAC Vorbis vendor string is truncated");
    const vendor = new TextDecoder().decode(bytes.subarray(offset, offset + vendorLength));
    offset += vendorLength;
    const count = readU32LE(bytes, offset);
    offset += 4;
    const result = [];
    for (let index = 0; index < count; index++)
    {
        if (offset + 4 > end) throw new Error("FLAC Vorbis comment list is truncated");
        const length = readU32LE(bytes, offset);
        offset += 4;
        if (offset + length > end) throw new Error("FLAC Vorbis comment is truncated");
        result.push(new TextDecoder().decode(bytes.subarray(offset, offset + length)));
        offset += length;
    }
    return { vendor, comments: result };
}

/**
 * Reads the 18-byte seek points of a SEEKTABLE block body.
 *
 * @param {Uint8Array} bytes File bytes.
 * @param {number} start Byte offset of the block body.
 * @param {number} length Block body length in bytes.
 * @returns {Array<{sampleNumber:?number,offset:?number,numberSamples:number}>} The seek points.
 * @throws {Error} When the length is not a multiple of 18.
 */
function readSeekTable(bytes, start, length)
{
    if (length % 18 !== 0) throw new Error("FLAC SEEKTABLE block has an invalid length");
    const points = [];
    for (let offset = start; offset < start + length; offset += 18)
    {
        points.push({
            sampleNumber: readU64BE(bytes, offset),
            offset: readU64BE(bytes, offset + 8),
            numberSamples: readU16BE(bytes, offset + 16)
        });
    }
    return points;
}

/**
 * Reads a PICTURE block body without copying the picture data.
 *
 * @param {Uint8Array} bytes File bytes.
 * @param {number} start Byte offset of the block body.
 * @param {number} end Byte offset one past the block body.
 * @returns {{pictureType:number,mimeType:string,description:string,width:number,height:number,colorDepth:number,colors:number,dataByteLength:number}}
 *     The picture fields.
 * @throws {Error} When the block is truncated.
 */
function readPicture(bytes, start, end)
{
    let offset = start;
    if (offset + 4 > end) throw new Error("FLAC picture block is truncated");
    const pictureType = readU32BE(bytes, offset);
    offset += 4;
    const mimeLength = readU32BE(bytes, offset);
    offset += 4;
    if (offset + mimeLength + 4 > end) throw new Error("FLAC picture MIME type is truncated");
    const mimeType = new TextDecoder().decode(bytes.subarray(offset, offset + mimeLength));
    offset += mimeLength;
    const descriptionLength = readU32BE(bytes, offset);
    offset += 4;
    if (offset + descriptionLength + 20 > end) throw new Error("FLAC picture description is truncated");
    const description = new TextDecoder().decode(bytes.subarray(offset, offset + descriptionLength));
    offset += descriptionLength;
    const width = readU32BE(bytes, offset);
    const height = readU32BE(bytes, offset + 4);
    const colorDepth = readU32BE(bytes, offset + 8);
    const colors = readU32BE(bytes, offset + 12);
    const dataLength = readU32BE(bytes, offset + 16);
    if (offset + 20 + dataLength > end) throw new Error("FLAC picture data is truncated");
    return { pictureType, mimeType, description, width, height, colorDepth, colors, dataByteLength: dataLength };
}

/**
 * Reads a big-endian 64-bit unsigned integer when it fits a safe integer.
 *
 * @param {Uint8Array} bytes File bytes.
 * @param {number} offset Byte offset.
 * @returns {?number} The value, or null when the high word exceeds 21 bits.
 */
function readU64BE(bytes, offset)
{
    const high = readU32BE(bytes, offset);
    const low = readU32BE(bytes, offset + 4);
    return high > 0x1fffff ? null : high * 0x100000000 + low;
}

