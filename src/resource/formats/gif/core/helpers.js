import { toJsonWithByteSummary as toJsonValue } from "../../../format/jsonPolicies.js";
import { asUint8Array, readU16LE } from "#utils/bytes";

export const OUTPUT_IMAGE = "image";
export const OUTPUT_RGBA = "rgba";
export const OUTPUT_RAW = "raw";
export const OUTPUT_JSON = "json";

export const DEFAULT_VALUES = {
    emit: OUTPUT_RAW,
    inputType: "gif",
    source: ""
};

/**
 * Normalized GIF reader options.
 *
 * @typedef {object} GifValues
 * @property {string} emit Output to emit: "image", "rgba", "raw", "json" or "gifJson".
 * @property {string} inputType Expected source type.
 * @property {string} source Diagnostic source label, or "".
 */

/**
 * One image descriptor read by `inspectGif`, with its compressed LZW data.
 *
 * @typedef {object} GifFrame
 * @property {number} left Frame left offset on the logical screen.
 * @property {number} top Frame top offset on the logical screen.
 * @property {number} width Frame width in pixels.
 * @property {number} height Frame height in pixels.
 * @property {number} packed Image descriptor packed field byte.
 * @property {?{disposalMethod:number,userInput:boolean,transparent:boolean,delayCentiseconds:number,transparentIndex:number}} graphicsControl
 *     The graphics control extension preceding this frame, or null.
 * @property {?Array<number[]>} localPalette Local colour table as `[r, g, b]` entries, or null.
 * @property {number} lzwMinCodeSize LZW minimum code size.
 * @property {Uint8Array} compressed Concatenated LZW sub-block data.
 * @property {boolean} interlaced Whether rows are stored interlaced.
 */

/**
 * Header and frame metadata of a GIF file.
 *
 * @typedef {object} GifInspection
 * @property {"gif"} sourceFormat Always "gif".
 * @property {string} version "GIF87a" or "GIF89a".
 * @property {number} width Logical screen width.
 * @property {number} height Logical screen height.
 * @property {number} frameCount Number of image descriptors.
 * @property {boolean} animated Whether there is more than one frame.
 * @property {?number} loopCount NETSCAPE2.0/ANIMEXTS1.0 loop count, or null.
 * @property {boolean} hasGlobalPalette Whether a global colour table is present.
 * @property {number} backgroundColorIndex Background colour index.
 * @property {number} colorResolution Colour resolution in bits.
 * @property {boolean} lzwSupported Whether every frame has an LZW minimum code size of 2 to 8.
 * @property {?GifFrame} firstFrame First frame, or null.
 * @property {GifFrame[]} frames Every frame in file order.
 * @property {number} [byteLength] Input length in bytes (set by `inspectWithValues`).
 * @property {string} [source] Diagnostic source label (set by `inspectWithValues`).
 */

/**
 * Normalizes reader options against their supported defaults for the GIF format
 * reader.
 *
 * @param {Partial<GifValues>|null} [base=DEFAULT_VALUES] Values to start from.
 * @param {Partial<GifValues>} [options={}] Caller options layered over `base`.
 * @param {string} [options.emit] Output to emit.
 * @param {string} [options.inputType] Expected source type.
 * @param {string} [options.source] Diagnostic source label.
 * @param {string} [readerName="CjsGifFormat"] Name used in error messages.
 * @returns {GifValues} The normalized values.
 * @throws {TypeError} When options is not an object, holds an unknown key, or names an unknown emit value.
 */
export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsGifFormat")
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
    if (![ OUTPUT_IMAGE, OUTPUT_RGBA, OUTPUT_RAW, OUTPUT_JSON, "gifJson" ].includes(values.emit))
    {
        throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(values.emit)}`);
    }
    return values;
}

/**
 * Reports whether the bytes start with a GIF87a or GIF89a header.
 *
 * @param {Uint8Array} bytes File bytes.
 * @returns {boolean} True when the signature is present and the header is complete.
 */
export function isGIF(bytes)
{
    return bytes.byteLength >= 13 && (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a");
}

/**
 * Inspects input using normalized format options for the GIF format reader.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
 * @param {GifValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @param {string} [expectedType="gif"] Expected source type, or "" to skip the check.
 * @returns {GifInspection} The header and frame metadata with `byteLength` and `source`.
 * @throws {TypeError} When the input is not a GIF or does not match `expectedType`.
 */
export function inspectWithValues(input, values = DEFAULT_VALUES, expectedType = "gif")
{
    const bytes = asUint8Array(input, "GIF input");
    if (!isGIF(bytes)) throw new TypeError("CjsGifFormat: input is not a GIF87a/GIF89a image");
    const metadata = inspectGif(bytes);
    if (expectedType && metadata.sourceFormat !== expectedType)
    {
        throw new TypeError(`CjsGifFormat: expected ${expectedType}, got ${metadata.sourceFormat}`);
    }
    return { ...metadata, byteLength: bytes.byteLength, source: values.source || "buffer" };
}

/**
 * Reports whether input is supported under normalized format options for the GIF
 * format reader.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
 * @param {GifValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @returns {object} Support report: "full" when a decodable LZW frame exists,
 *     "partial" otherwise, or "none" with the error message when inspection fails.
 */
export function probeSupportWithValues(input, values = DEFAULT_VALUES)
{
    try
    {
        const metadata = inspectWithValues(input, values);
        const decoded = metadata.frameCount > 0 && metadata.lzwSupported;
        return {
            format: "gif",
            source: values.source || "buffer",
            supported: decoded ? "full" : "partial",
            confidence: 1,
            preferredOutput: decoded ? "rgba" : "raw",
            reason: decoded ? "GIF frame RGBA decode and compositing are available." : "GIF metadata/raw input is recognized but no decodable image frame was found.",
            metadata,
            variants: [
                { kind: "rgba", codec: "rgba8unorm", supported: decoded, reason: decoded ? "" : "GIF LZW frame decode is unavailable."},
                { kind: "raw", codec: "gif", mimeType: "image/gif", supported: true}
            ],
            warnings: [],
            errors: []
        };
    }
    catch (error)
    {
        return {
            format: "gif",
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
 * Reads input using normalized format options for the GIF format reader.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
 * @param {GifValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @returns {GifInspection|object} `{ sourceFormat, mimeType, metadata, bytes }` for "raw",
 *     the inspection for "json"/"gifJson", or the decoded RGBA image (`decodeFrames`) for
 *     "rgba"/"image".
 * @throws {Error} With code `CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED` for any other emit value.
 */
export function readWithValues(input, values = DEFAULT_VALUES)
{
    const bytes = asUint8Array(input, "GIF input");
    const metadata = inspectWithValues(bytes, values);
    if (values.emit === OUTPUT_RAW)
    {
        return {
            sourceFormat: "gif",
            mimeType: "image/gif",
            metadata,
            bytes
        };
    }
    if (values.emit === OUTPUT_JSON || values.emit === "gifJson") return metadata;
    if (values.emit === OUTPUT_RGBA || values.emit === OUTPUT_IMAGE)
    {
        return decodeFrames(bytes, metadata);
    }
    const error = new Error(`gif: emit "${values.emit}" is not implemented yet`);
    error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
    throw error;
}

/** The shared JSON policy for this reader, under the name its callers use. */
export { toJsonValue };

/**
 * Walks the GIF blocks and collects header, extension and frame metadata.
 *
 * @param {Uint8Array} bytes File bytes with a valid GIF header.
 * @returns {GifInspection} The header and frame metadata, without `byteLength` and `source`.
 * @throws {Error} On a malformed extension, truncated descriptor or unknown block marker.
 */
function inspectGif(bytes)
{
    const width = readU16LE(bytes, 6);
    const height = readU16LE(bytes, 8);
    const packed = bytes[10];
    const hasGlobalPalette = !!(packed & 0x80);
    const globalPaletteCount = hasGlobalPalette ? 1 << ((packed & 7) + 1) : 0;
    if (hasGlobalPalette) readPalette(bytes, 13, globalPaletteCount);
    let offset = 13 + globalPaletteCount * 3;
    let frameCount = 0;
    const frames = [];
    let firstFrame = null;
    let graphicsControl = null;
    let loopCount = null;
    while (offset < bytes.length)
    {
        const marker = bytes[offset++];
        if (marker === 0x3b) break;
        if (marker === 0x21)
        {
            const label = bytes[offset++];
            if (label === 0xf9)
            {
                if (bytes[offset++] !== 4) throw new Error("gif: invalid graphics control extension");
                const control = bytes[offset++];
                graphicsControl = {
                    disposalMethod: (control >>> 2) & 7,
                    userInput: !!(control & 2),
                    transparent: !!(control & 1),
                    delayCentiseconds: readU16LE(bytes, offset)
                };
                offset += 2;
                graphicsControl.transparentIndex = bytes[offset++];
                if (bytes[offset++] !== 0) throw new Error("gif: unterminated graphics control extension");
            }
            else if (label === 0xff)
            {
                const size = bytes[offset++];
                const application = ascii(bytes, offset, size);
                offset += size;
                const data = readSubBlocks(bytes, offset);
                offset = data.offset;
                if (application === "NETSCAPE2.0" || application === "ANIMEXTS1.0")
                {
                    if (data.bytes.length >= 3 && data.bytes[0] === 1) loopCount = readU16LE(data.bytes, 1);
                }
            }
            else
            {
                offset = skipSubBlocks(bytes, offset);
            }
        }
        else if (marker === 0x2c)
        {
            if (offset + 9 > bytes.length) throw new Error("gif: truncated image descriptor");
            const frame = {
                left: readU16LE(bytes, offset),
                top: readU16LE(bytes, offset + 2),
                width: readU16LE(bytes, offset + 4),
                height: readU16LE(bytes, offset + 6),
                packed: bytes[offset + 8],
                graphicsControl
            };
            offset += 9;
            const localPaletteCount = frame.packed & 0x80 ? 1 << ((frame.packed & 7) + 1) : 0;
            frame.localPalette = localPaletteCount ? readPalette(bytes, offset, localPaletteCount) : null;
            offset += localPaletteCount * 3;
            frame.lzwMinCodeSize = bytes[offset++];
            const data = readSubBlocks(bytes, offset);
            frame.compressed = data.bytes;
            offset = data.offset;
            frame.interlaced = !!(frame.packed & 0x40);
            frameCount++;
            frames.push(frame);
            if (!firstFrame) firstFrame = frame;
            graphicsControl = null;
        }
        else if (marker === 0x00)
        {
            throw new Error("gif: unexpected data before image descriptor");
        }
        else
        {
            throw new Error(`gif: unsupported block marker 0x${marker.toString(16)}`);
        }
    }
    return {
        sourceFormat: "gif",
        version: ascii(bytes, 0, 6),
        width,
        height,
        frameCount,
        animated: frameCount > 1,
        loopCount,
        hasGlobalPalette,
        backgroundColorIndex: bytes[11],
        colorResolution: ((packed >>> 4) & 7) + 1,
        lzwSupported: frames.length > 0 && frames.every((frame) => frame.lzwMinCodeSize >= 2 && frame.lzwMinCodeSize <= 8),
        firstFrame,
        frames
    };
}

/**
 * Decodes and composites every frame onto an RGBA8 canvas, applying disposal methods.
 *
 * @param {Uint8Array} bytes File bytes.
 * @param {GifInspection} metadata Inspection of the same bytes.
 * @returns {{sourceFormat:"gif",mimeType:"image/gif",width:number,height:number,pixelFormat:"rgba8unorm",data:Uint8Array,frames:Array<{index:number,delayCentiseconds:number,disposalMethod:number,data:Uint8Array}>,strideBytes:number,origin:"top-left",colorSpace:"srgb",alphaMode:"straight",metadata:GifInspection}}
 *     The first composited frame as `data`, plus every composited frame.
 * @throws {Error} When there is no supported LZW frame.
 */
function decodeFrames(bytes, metadata)
{
    if (!metadata.firstFrame || !metadata.lzwSupported) throw new Error("gif: no supported LZW image frame found");
    const globalPalette = readPalette(bytes, 13, metadata.hasGlobalPalette ? 1 << ((bytes[10] & 7) + 1) : 0);
    const canvas = new Uint8Array(metadata.width * metadata.height * 4);
    const frames = [];

    for (const frame of metadata.frames)
    {
        const restore = frame.graphicsControl?.disposalMethod === 3 ? canvas.slice() : null;
        const palette = frame.localPalette || globalPalette;
        const indices = decodeLzw(frame.compressed, frame.lzwMinCodeSize, frame.width * frame.height);
        const rows = frame.interlaced ? interlacedRows(frame.height) : Array.from({ length: frame.height }, (_, row) => row);
        for (let sourceRow = 0; sourceRow < frame.height; sourceRow++)
        {
            const targetRow = rows[sourceRow];
            for (let x = 0; x < frame.width; x++)
            {
                const index = indices[sourceRow * frame.width + x];
                const targetX = frame.left + x;
                const targetY = frame.top + targetRow;
                if (targetX >= metadata.width || targetY >= metadata.height) continue;
                if (frame.graphicsControl?.transparent && index === frame.graphicsControl.transparentIndex) continue;
                const target = (targetY * metadata.width + targetX) * 4;
                const color = palette[index] || [ 0, 0, 0 ];
                canvas[target] = color[0];
                canvas[target + 1] = color[1];
                canvas[target + 2] = color[2];
                canvas[target + 3] = 255;
            }
        }

        frames.push({
            index: frames.length,
            delayCentiseconds: frame.graphicsControl?.delayCentiseconds || 0,
            disposalMethod: frame.graphicsControl?.disposalMethod || 0,
            data: canvas.slice()
        });
        const disposal = frame.graphicsControl?.disposalMethod || 0;
        if (disposal === 2) canvas.fill(0);
        else if (disposal === 3 && restore) canvas.set(restore);
    }

    const data = frames[0].data;
    return {
        sourceFormat: "gif",
        mimeType: "image/gif",
        width: metadata.width,
        height: metadata.height,
        pixelFormat: "rgba8unorm",
        data,
        frames,
        strideBytes: metadata.width * 4,
        origin: "top-left",
        colorSpace: "srgb",
        alphaMode: "straight",
        metadata
    };
}

/**
 * Decodes GIF variable-width LZW data into palette indices.
 *
 * @param {Uint8Array} bytes Concatenated LZW sub-block data.
 * @param {number} minimumCodeSize LZW minimum code size.
 * @param {number} expectedLength Number of indices the frame needs.
 * @returns {number[]} Exactly `expectedLength` palette indices.
 * @throws {Error} On an invalid code or when the stream ends early.
 */
function decodeLzw(bytes, minimumCodeSize, expectedLength)
{
    const clear = 1 << minimumCodeSize;
    const end = clear + 1;
    let codeSize = minimumCodeSize + 1;
    let dictionary = Array.from({ length: clear }, (_, index) => [ index ]);
    let bitOffset = 0;
    let previous = null;
    const output = [];
    while (bitOffset + codeSize <= bytes.length * 8)
    {
        let code = 0;
        for (let bit = 0; bit < codeSize; bit++)
        {
            code |= (((bytes[bitOffset >>> 3] >>> (bitOffset & 7)) & 1) << bit);
            bitOffset++;
        }
        if (code === clear)
        {
            dictionary = Array.from({ length: clear }, (_, index) => [ index ]);
            codeSize = minimumCodeSize + 1;
            previous = null;
            continue;
        }
        if (code === end) break;
        let entry;
        if (code < dictionary.length) entry = dictionary[code];
        else if (code === dictionary.length && previous) entry = previous.concat(previous[0]);
        else throw new Error("gif: invalid LZW code");
        output.push(...entry);
        if (previous)
        {
            dictionary.push(previous.concat(entry[0]));
            if (dictionary.length === (1 << codeSize) && codeSize < 12) codeSize++;
        }
        previous = entry;
        if (output.length >= expectedLength) break;
    }
    if (output.length < expectedLength) throw new Error("gif: LZW stream ended before the frame was filled");
    return output.slice(0, expectedLength);
}

/**
 * Concatenates a sequence of data sub-blocks up to the zero-length terminator.
 *
 * @param {Uint8Array} bytes File bytes.
 * @param {number} offset Byte offset of the first sub-block length.
 * @returns {{bytes:Uint8Array,offset:number}} The joined payload and the offset after the terminator.
 * @throws {Error} When the sequence is truncated.
 */
function readSubBlocks(bytes, offset)
{
    const output = [];
    while (offset < bytes.length)
    {
        if (offset >= bytes.length) throw new Error("gif: truncated sub-block sequence");
        const length = bytes[offset++];
        if (!length) return { bytes: Uint8Array.from(output), offset };
        if (offset + length > bytes.length) throw new Error("gif: truncated sub-block payload");
        output.push(...bytes.subarray(offset, offset + length));
        offset += length;
    }
    throw new Error("gif: truncated sub-block sequence");
}

/**
 * Skips a sequence of data sub-blocks.
 *
 * @param {Uint8Array} bytes File bytes.
 * @param {number} offset Byte offset of the first sub-block length.
 * @returns {number} The offset after the terminator.
 */
function skipSubBlocks(bytes, offset)
{
    return readSubBlocks(bytes, offset).offset;
}

/**
 * Reads a colour table of RGB triples.
 *
 * @param {Uint8Array} bytes File bytes.
 * @param {number} offset Byte offset of the table.
 * @param {number} count Number of entries.
 * @returns {Array<number[]>} `[r, g, b]` entries.
 * @throws {Error} When the table is truncated.
 */
function readPalette(bytes, offset, count)
{
    const palette = [];
    for (let i = 0; i < count; i++)
    {
        if (offset + 3 > bytes.length) throw new Error("gif: truncated color table");
        palette.push([ bytes[offset], bytes[offset + 1], bytes[offset + 2] ]);
        offset += 3;
    }
    return palette;
}

/**
 * Maps stored row order to image rows for a four-pass interlaced frame.
 *
 * @param {number} height Frame height in rows.
 * @returns {number[]} Target row for each stored row.
 */
function interlacedRows(height)
{
    const rows = [];
    for (const [ start, step ] of [ [ 0, 8 ], [ 4, 8 ], [ 2, 4 ], [ 1, 2 ] ])
    {
        for (let row = start; row < height; row += step) rows.push(row);
    }
    return rows;
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


