import { CjsImageFormat } from "../../../format/CjsImageFormat.js";

import { asUint8Array, readU16BE, readU16LE, readU32BE, readU32LE } from "#utils/bytes";
export const OUTPUT_IMAGE = "image";
export const OUTPUT_TEXTURE = "texture";
export const OUTPUT_RGBA = "rgba";
export const OUTPUT_RAW = "raw";

import { canDecodeJpeg, decodeJpegToRgba } from "./jpeg.js";

/**
 * True when `bytes` opens with the JPEG start-of-image marker.
 *
 * @param {Uint8Array} bytes Candidate bytes.
 * @returns {boolean} Whether the marker matches.
 */
export function isJPEG(bytes)
{
    return bytes.byteLength >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

export const DEFAULT_VALUES = {
    emit: OUTPUT_RAW,
    inputType: "",
    source: ""
};



/**
 * Normalized JPEG reader options.
 *
 * @typedef {object} JpegValues
 * @property {string} emit Output to emit: "image", "rgba" or "raw".
 * @property {string} inputType Lower-case expected source type without a leading dot ("jpg" becomes "jpeg"), or "".
 * @property {string} source Diagnostic source label, or "".
 */

/**
 * Header metadata read from a JPEG file without decoding its scans.
 *
 * Frame fields are present only when a SOF0-SOF3 marker was found; scan fields only
 * when an SOS marker followed it.
 *
 * @typedef {object} JpegInspection
 * @property {string} sourceFormat "jpeg", the expected type, or "" for unrecognized bytes.
 * @property {number} [byteLength] Input length in bytes (set by `inspectWithValues`).
 * @property {number} width Frame width, or 0 when no frame header was found.
 * @property {number} height Frame height, or 0 when no frame header was found.
 * @property {number} [channels] Frame component count.
 * @property {number} [components] Frame component count.
 * @property {number} [precision] Sample precision in bits.
 * @property {number} [marker] SOF marker byte (0xc0-0xc3).
 * @property {boolean} [progressive] Whether the frame or first scan is progressive.
 * @property {string} [pixelFormat] "jpeg-ycbcr", or "jpeg" without a frame header.
 * @property {boolean} [isCompressed] Always true for JPEG.
 * @property {number} [appMarkerCount] Number of APPn segments before the first scan.
 * @property {number} [commentCount] Number of COM segments before the first scan.
 * @property {boolean} [hasExif] Whether an APP1 Exif segment was seen.
 * @property {boolean} [hasIccProfile] Whether an APP2 ICC_PROFILE segment was seen.
 * @property {number} [scanComponents] Component count of the first scan.
 * @property {number} [spectralStart] Spectral selection start of the first scan.
 * @property {number} [spectralEnd] Spectral selection end of the first scan.
 * @property {number} [successive] Successive approximation byte of the first scan.
 */

/**
 * RGBA8 image produced by the baseline software decoder.
 *
 * @typedef {object} JpegRgbaImage
 * @property {"jpeg"} sourceFormat Always "jpeg".
 * @property {"image/jpeg"} mimeType Always "image/jpeg".
 * @property {number} width Image width in pixels.
 * @property {number} height Image height in pixels.
 * @property {"rgba8unorm"} pixelFormat Always "rgba8unorm".
 * @property {Uint8Array} data Tightly packed RGBA8 pixels, top row first.
 * @property {number} strideBytes `width * 4`.
 * @property {"top-left"} origin Always "top-left".
 * @property {"srgb"} colorSpace Always "srgb".
 * @property {"opaque"} alphaMode Always "opaque".
 * @property {object} metadata The caller's metadata plus `decoder: "software-baseline"`.
 */

/**
 * One frame component tracked by the baseline decoder in `jpeg.js`.
 *
 * @typedef {object} JpegComponent
 * @property {number} id Component identifier.
 * @property {number} h Horizontal sampling factor.
 * @property {number} v Vertical sampling factor.
 * @property {number} quantizationId Quantization table id.
 * @property {number} dc DC Huffman table id set by the scan header.
 * @property {number} ac AC Huffman table id set by the scan header.
 * @property {number} previousDc DC predictor.
 * @property {?Uint8Array} plane Decoded samples, allocated by the scan decoder.
 * @property {number} planeWidth Plane width in samples.
 * @property {number} planeHeight Plane height in samples.
 */

/**
 * Huffman lookup built by the baseline decoder: index `length` (1-16) lists the
 * canonical codes of that bit length with their symbol values.
 *
 * @typedef {Array<Array<{code:number,value:number}>>} JpegHuffmanTable
 */

/**
 * Normalizes reader options against their supported defaults for the JPEG format
 * reader.
 *
 * @param {Partial<JpegValues>|null} [base=DEFAULT_VALUES] Values to start from.
 * @param {Partial<JpegValues>|null} [options={}] Caller options layered over `base`.
 * @param {string} [options.emit] Output to emit.
 * @param {string} [options.inputType] Expected source type.
 * @param {string} [readerName="CjsImageFormat"] Name used in error messages.
 * @returns {JpegValues} The normalized values.
 */
export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsImageFormat")
{
    const values = { ...DEFAULT_VALUES, ...(base || {}), ...(options || {}) };
    values.inputType = normalizeInputType(values.inputType);
    values.emit = normalizeEmit(values.emit, values.inputType, readerName);
    return values;
}

/**
 * Normalizes the requested input representation for the JPEG format reader.
 *
 * @param {?string} inputType Type or extension, with or without a leading dot.
 * @returns {string} Lower-case type with "jpg" mapped to "jpeg", or "" when empty.
 */
export function normalizeInputType(inputType)
{
    if (!inputType) return "";
    const value = String(inputType).replace(/^\./u, "").toLowerCase();
    return value === "jpg" ? "jpeg" : value;
}

/**
 * Normalizes the requested output representation for the JPEG format reader.
 *
 * @param {?string} emit Requested output.
 * @param {string} inputType Normalized input type.
 * @param {string} readerName Name used in error messages.
 * @returns {string} The emit value, or "raw" when none was given.
 * @throws {TypeError} When `emit` is not "image", "rgba" or "raw".
 */
export function normalizeEmit(emit, inputType, readerName)
{
    if (emit === undefined || emit === null) return OUTPUT_RAW;
    if ([ OUTPUT_IMAGE, OUTPUT_RGBA, OUTPUT_RAW].includes(emit)) return emit;
    throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(emit)}`);
}

/**
 * Inspects input using normalized format options for the JPEG format reader.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
 * @param {JpegValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @param {string} [expectedType=""] Required detected type, or "" to accept any.
 * @returns {JpegInspection} The header metadata with `byteLength`.
 * @throws {TypeError} When the detected type does not match `expectedType`.
 */
export function inspectWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    const bytes = asUint8Array(input, "Image input");
    const detected = inspectBytes(bytes);
    const sourceFormat = expectedType || values.inputType || detected.sourceFormat;

    if (expectedType && detected.sourceFormat !== expectedType)
    {
        throw new TypeError(`not a ${expectedType.toUpperCase()}`);
    }

    return {
        sourceFormat,
        byteLength: bytes.byteLength,
        ...detected
    };
}

/**
 * Reports whether input is supported under normalized format options for the
 * JPEG format reader.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
 * @param {JpegValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @param {string} [expectedType=""] Required detected type, or "" to accept any.
 * @returns {object} Support report: "full" when the RGBA decoder accepts the frame,
 *     "partial" for other recognized input, or "none" with the error message.
 */
export function probeSupportWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    try
    {
        const metadata = inspectWithValues(input, values, expectedType);
        const canDecode = metadata.sourceFormat === "jpeg" && canDecodeJpeg(metadata);
        const variants = [
            { kind: "rgba", codec: "rgba8unorm", supported: canDecode, reason: canDecode ? "" : jpegDecodeReason(metadata)},
            CjsImageFormat.rawVariant(metadata)
        ];

        return {
            format: metadata.sourceFormat,
            source: values.source || "buffer",
            supported: metadata.sourceFormat ? (variants.some(variant => variant.supported && variant.kind === "rgba") ? "full" : "partial") : "none",
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

/**
 * Reads input using normalized format options for the JPEG format reader.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
 * @param {JpegValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @param {string} [expectedType=""] Required detected type, or "" to accept any.
 * @returns {{sourceFormat:string,mimeType:string,metadata:JpegInspection,bytes:Uint8Array}|JpegRgbaImage}
 *     The raw bytes with metadata for "raw", or the decoded image for "rgba"/"image".
 * @throws {Error} With code `CJS_FORMAT_OUTPUT_NOT_SUPPORTED` when the decoder cannot
 *     handle the frame, or `CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED` for other outputs.
 */
export function readWithValues(input, values = DEFAULT_VALUES, expectedType = "")
{
    const bytes = asUint8Array(input, "Image input");
    const metadata = inspectWithValues(bytes, values, expectedType);

    if (values.emit === OUTPUT_RAW)
    {
        return {
            sourceFormat: metadata.sourceFormat,
            mimeType: CjsImageFormat.imageMimeType(metadata.sourceFormat),
            metadata,
            bytes
        };
    }

    if ((values.emit === OUTPUT_RGBA || values.emit === OUTPUT_IMAGE) && metadata.sourceFormat === "jpeg")
    {
        if (!canDecodeJpeg(metadata))
        {
            const error = new Error(`jpeg: ${jpegDecodeReason(metadata)}`);
            error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
            throw error;
        }
        return decodeJpegToRgba(bytes, metadata);
    }

    const error = new Error(`${metadata.sourceFormat}: emit "${values.emit}" is not implemented yet`);
    error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
    error.sourceFormat = metadata.sourceFormat;
    error.emit = values.emit;
    throw error;
}




/**
 * Inspects the supplied bytes without decoding their payload for the JPEG format
 * reader.
 *
 * @param {Uint8Array} bytes File bytes.
 * @returns {JpegInspection} JPEG header metadata, or `{ sourceFormat: "", width: 0, height: 0 }`
 *     when the bytes do not start with SOI.
 */
export function inspectBytes(bytes)
{
    return isJPEG(bytes) ? inspectJPEG(bytes) : { sourceFormat: "", width: 0, height: 0 };
}






/**
 * Walks the JPEG segments up to the first scan, collecting frame and marker metadata.
 *
 * @param {Uint8Array} bytes File bytes starting with SOI.
 * @returns {JpegInspection} The header metadata.
 */
function inspectJPEG(bytes)
{
    let offset = 2;
    let frame = null;
    const summary = {
        appMarkerCount: 0,
        commentCount: 0,
        hasExif: false,
        hasIccProfile: false
    };
    while (offset + 9 < bytes.byteLength)
    {
        if (bytes[offset] !== 0xff)
        {
            offset++;
            continue;
        }
        const marker = bytes[offset + 1], length = readU16BE(bytes, offset + 2);
        const dataStart = offset + 4;
        const dataEnd = offset + 2 + length;
        if (marker >= 0xe0 && marker <= 0xef)
        {
            summary.appMarkerCount++;
            if (marker === 0xe1 && ascii(bytes, dataStart, Math.min(6, dataEnd - dataStart)) === "Exif\0\0") summary.hasExif = true;
            if (marker === 0xe2 && ascii(bytes, dataStart, Math.min(12, dataEnd - dataStart)) === "ICC_PROFILE\0") summary.hasIccProfile = true;
        }
        else if (marker === 0xfe)
        {
            summary.commentCount++;
        }
        if ([ 0xc0, 0xc1, 0xc2, 0xc3 ].includes(marker))
        {
            frame = {
                sourceFormat: "jpeg",
                width: readU16BE(bytes, offset + 7),
                height: readU16BE(bytes, offset + 5),
                channels: bytes[offset + 9],
                components: bytes[offset + 9],
                precision: bytes[offset + 4],
                marker,
                progressive: marker === 0xc2 || marker === 0xc3,
                pixelFormat: "jpeg-ycbcr",
                isCompressed: true
            };
        }
        if (marker === 0xda && frame)
        {
            const scanStart = offset + 4;
            const scanComponents = bytes[scanStart];
            const spectralStart = bytes[scanStart + 1 + scanComponents * 2];
            const spectralEnd = bytes[scanStart + 2 + scanComponents * 2];
            const successive = bytes[scanStart + 3 + scanComponents * 2];
            return {
                ...frame,
                ...summary,
                scanComponents,
                spectralStart,
                spectralEnd,
                successive,
                progressive: frame.progressive || spectralStart !== 0 || spectralEnd !== 63 || successive !== 0
            };
        }
        offset += Math.max(length + 2, 2);
    }
    return frame ? { ...frame, ...summary } : { sourceFormat: "jpeg", width: 0, height: 0, channels: 0, pixelFormat: "jpeg", isCompressed: true, ...summary };
}

/**
 * Explains why the software decoder rejects a frame.
 *
 * @param {JpegInspection} metadata Header metadata.
 * @returns {string} A one-sentence reason.
 */
function jpegDecodeReason(metadata)
{
    if (metadata.sourceFormat !== "jpeg") return `${metadata.sourceFormat.toUpperCase()} RGBA decode is not implemented yet.`;
    if (metadata.progressive) return "Progressive JPEG software decode is not implemented yet.";
    if (metadata.marker !== undefined && metadata.marker !== 0xc0 && metadata.marker !== 0xc1)
    {
        return "Only sequential baseline JPEG frames are supported by the software decoder.";
    }
    if (metadata.precision !== undefined && metadata.precision !== 8)
    {
        return `JPEG sample precision ${metadata.precision} is not supported by the software decoder.`;
    }
    if (metadata.components > 3) return "CMYK/YCCK JPEG software decode is not implemented yet.";
    return "JPEG baseline frame metadata is incomplete or unsupported.";
}




/**
 * Reads bytes as a Latin-1 string.
 *
 * @param {Uint8Array} bytes File bytes.
 * @param {number} offset Byte offset.
 * @param {number} length Number of bytes.
 * @returns {string} The decoded string.
 */
function ascii(bytes, offset, length)
{
    return String.fromCharCode(...bytes.subarray(offset, offset + length));
}


