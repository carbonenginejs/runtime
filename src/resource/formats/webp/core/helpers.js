import { toJsonWithByteSummary as toJsonValue } from "../../../format/jsonPolicies.js";
import { asUint8Array, readU16LE, readU24LE, readU32LE } from "#utils/bytes";

export const OUTPUT_RAW = "raw";
export const OUTPUT_JSON = "json";

export const DEFAULT_VALUES = {
    emit: OUTPUT_RAW,
    inputType: "webp",
    source: ""
};

/**
 * Normalized WebP reader options.
 *
 * @typedef {object} CjsWebpValues
 * @property {string} emit Output to emit: "raw", "json" or "webpJson".
 * @property {string} inputType Expected source format; "webp".
 * @property {string} source Source label reported in metadata; "" means "buffer".
 */

/**
 * WebP container metadata returned by inspectWithValues.
 *
 * @typedef {object} CjsWebpInspection
 * @property {string} sourceFormat Always "webp".
 * @property {string} container Always "riff".
 * @property {number} riffLength RIFF payload length from the file header.
 * @property {string} codec "vp8", "vp8l", "vp8x" or "webp".
 * @property {number} width Image width in pixels.
 * @property {number} height Image height in pixels.
 * @property {boolean} hasAlpha True when an alpha channel is signalled.
 * @property {boolean} animated True when animation chunks are present.
 * @property {number} animationFrameCount Number of ANMF frames.
 * @property {number} animationDurationMs Sum of frame durations.
 * @property {Array<{x: number, y: number, width: number, height: number, durationMs: number, flags: number}>} animationFrames ANMF frame headers.
 * @property {boolean} isCompressed Always true.
 * @property {Array<{type: string, byteOffset: number, byteLength: number}>} chunks RIFF chunk headers.
 * @property {number} byteLength Input byte length.
 * @property {string} source Source label, or "buffer".
 */

/**
 * Normalizes reader options against their supported defaults for the WebP format
 * reader.
 *
 * @param {CjsWebpValues} [base=DEFAULT_VALUES] Values to start from.
 * @param {object} [options={}] Overrides; only emit, inputType and source are accepted.
 * @param {string} [readerName="CjsWebpFormat"] Name used in error messages.
 * @returns {CjsWebpValues} The normalized values.
 * @throws {TypeError} When options is not an object, has an unknown key, or an unknown emit value.
 */
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

/**
 * Reports whether the supplied bytes have a RIFF/WebP header for the WebP format
 * reader.
 *
 * @param {Uint8Array} bytes Candidate bytes.
 * @returns {boolean} True when the RIFF/WEBP signature is present.
 */
export function isWebP(bytes)
{
    return bytes.byteLength >= 12 &&
        ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
}

/**
 * Inspects input using normalized format options for the WebP format reader.
 *
 * @param {Uint8Array|ArrayBuffer} input WebP file bytes.
 * @param {CjsWebpValues} [values=DEFAULT_VALUES] Normalized options; source is read.
 * @param {string} [expectedType="webp"] Required source format, or empty to skip the check.
 * @returns {CjsWebpInspection} The container metadata.
 * @throws {TypeError} When the input is not a RIFF WebP container or not the expected type.
 */
export function inspectWithValues(input, values = DEFAULT_VALUES, expectedType = "webp")
{
    const bytes = asUint8Array(input, "WebP input");
    if (!isWebP(bytes)) throw new TypeError("CjsWebpFormat: input is not a RIFF WebP container");
    const metadata = inspectWebP(bytes);
    if (expectedType && metadata.sourceFormat !== expectedType)
    {
        throw new TypeError(`CjsWebpFormat: expected ${expectedType}, got ${metadata.sourceFormat}`);
    }
    return { ...metadata, byteLength: bytes.byteLength, source: values.source || "buffer" };
}

/**
 * Reports whether input is supported under normalized format options for the
 * WebP format reader.
 *
 * @param {Uint8Array|ArrayBuffer} input Candidate bytes.
 * @param {CjsWebpValues} [values=DEFAULT_VALUES] Normalized options; source is read.
 * @returns {object} The support report: format, supported, confidence, metadata, variants, warnings and errors.
 */
export function probeSupportWithValues(input, values = DEFAULT_VALUES)
{
    try
    {
        const metadata = inspectWithValues(input, values);
        return {
            format: "webp",
            source: values.source || "buffer",
            supported: "partial",
            confidence: 1,
            preferredOutput: "raw",
            reason: "WebP container and image metadata are recognized; software RGBA decode is not implemented.",
            metadata,
            variants: [
                {
                    kind: "raw",
                    codec: "webp",
                    mimeType: "image/webp",
                    supported: true,
                },
                { kind: "rgba", codec: "rgba8unorm", supported: false, reason: "WebP software RGBA decode is not implemented yet." }
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
 * Reads input using normalized format options for the WebP format reader.
 *
 * @param {Uint8Array|ArrayBuffer} input WebP file bytes.
 * @param {CjsWebpValues} [values=DEFAULT_VALUES] Normalized options; emit and source are read.
 * @returns {{sourceFormat: string, mimeType: string, metadata: CjsWebpInspection, bytes: Uint8Array}|CjsWebpInspection} The raw record, or the metadata for JSON output.
 * @throws {Error} When the emit value is not implemented.
 */
export function readWithValues(input, values = DEFAULT_VALUES)
{
    const bytes = asUint8Array(input, "WebP input");
    const metadata = inspectWithValues(bytes, values);
    if (values.emit === OUTPUT_RAW)
    {
        return {
            sourceFormat: "webp",
            mimeType: "image/webp",
            metadata,
            bytes
        };
    }
    if (values.emit === OUTPUT_JSON || values.emit === "webpJson") return metadata;
    const error = new Error(`webp: emit "${values.emit}" is not implemented yet`);
    error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
    throw error;
}

/** The shared JSON policy for this reader, under the name its callers use. */
export { toJsonValue };

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


