import { CjsSchema } from "#schema/CjsSchema";

import { crc32 as sharedCrc32 } from "#utils/checksum";

const textDecoder = new TextDecoder();

/**
 * Returns a byte view over the supplied binary input for the CMF binary reader.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input Binary input.
 * @returns {Uint8Array} A view over the same bytes.
 * @throws {TypeError} When the input is not binary.
 */
export function asUint8Array(input)
{
    if (input instanceof Uint8Array)
    {
        return input;
    }

    if (input instanceof ArrayBuffer)
    {
        return new Uint8Array(input);
    }

    if (ArrayBuffer.isView(input))
    {
        return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }

    throw new TypeError("CMF input must be a Uint8Array, Buffer, ArrayBuffer, or typed-array view");
}

/**
 * Bounds-checked little-endian offset reader over CMF file bytes, including
 * 64-bit integer reads guarded against unsafe values.
 */
export class BinaryReader
{
    /**
     * CMF file bytes; set by the constructor.
     * @type {Uint8Array|null}
     */
    bytes = null;

    /**
     * Little-endian view over the bytes; set by the constructor.
     * @type {DataView|null}
     */
    view = null;

    /**
     * Creates a BinaryReader over caller-provided CMF bytes.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} bytes CMF file bytes.
     */
    constructor(bytes)
    {
        this.bytes = asUint8Array(bytes);
        this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
    }

    /**
     * Validates the supplied value against CMF binary reader constraints and
     * throws on failure.
     *
     * @param {number} offset Byte offset.
     * @param {number} size Byte count.
     * @param {string} [label="read"] Label used in the error message.
     * @throws {RangeError} When the range is outside the file bounds.
     */
    require(offset, size, label = "read")
    {
        if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(size) ||
            offset < 0 || size < 0 || offset > this.bytes.byteLength - size)
        {
            throw new RangeError(`CMF ${label} is outside file bounds`);
        }
    }

    /**
     * Reads an unsigned 8-bit integer at the requested offset for the CMF binary
     * reader.
     *
     * @param {number} offset Byte offset.
     * @returns {number} The value.
     */
    u8(offset)
    {
        this.require(offset, 1);
        return this.view.getUint8(offset);
    }

    /**
     * Reads an unsigned 16-bit little-endian integer at the requested offset for
     * the CMF binary reader.
     *
     * @param {number} offset Byte offset.
     * @returns {number} The value.
     */
    u16(offset)
    {
        this.require(offset, 2);
        return this.view.getUint16(offset, true);
    }

    /**
     * Reads an unsigned 32-bit little-endian integer at the requested offset for
     * the CMF binary reader.
     *
     * @param {number} offset Byte offset.
     * @returns {number} The value.
     */
    u32(offset)
    {
        this.require(offset, 4);
        return this.view.getUint32(offset, true);
    }

    /**
     * Reads a signed 32-bit little-endian integer at the requested offset for
     * the CMF binary reader.
     *
     * @param {number} offset Byte offset.
     * @returns {number} The value.
     */
    i32(offset)
    {
        this.require(offset, 4);
        return this.view.getInt32(offset, true);
    }

    /**
     * Reads a 32-bit little-endian float at the requested offset for the CMF
     * binary reader.
     *
     * @param {number} offset Byte offset.
     * @returns {number} The value.
     */
    f32(offset)
    {
        this.require(offset, 4);
        return this.view.getFloat32(offset, true);
    }

    /**
     * Reads a safe unsigned 64-bit little-endian integer at the requested offset
     * for the CMF binary reader.
     *
     * @param {number} offset Byte offset.
     * @returns {number} The value.
     * @throws {RangeError} When the value exceeds Number.MAX_SAFE_INTEGER.
     */
    u64(offset)
    {
        this.require(offset, 8);
        const value = this.view.getBigUint64(offset, true);
        if (value > BigInt(Number.MAX_SAFE_INTEGER))
        {
            throw new RangeError("CMF integer is larger than Number.MAX_SAFE_INTEGER");
        }
        return Number(value);
    }

    /**
     * Reads a safe signed 64-bit little-endian integer at the requested offset
     * for the CMF binary reader.
     *
     * @param {number} offset Byte offset.
     * @returns {number} The value.
     * @throws {RangeError} When the value is outside the safe integer range.
     */
    i64(offset)
    {
        this.require(offset, 8);
        const value = this.view.getBigInt64(offset, true);
        if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER))
        {
            throw new RangeError("CMF integer is outside the safe JavaScript number range");
        }
        return Number(value);
    }

    /**
     * Returns a bounds-checked byte slice at the requested offset for the CMF
     * binary reader.
     *
     * @param {number} offset Byte offset.
     * @param {number} size Byte count.
     * @returns {Uint8Array} A subarray view over the file bytes.
     */
    bytesAt(offset, size)
    {
        this.require(offset, size, "byte slice");
        return this.bytes.subarray(offset, offset + size);
    }

    /**
     * Decodes a UTF-8 string at the requested offset for the CMF binary reader.
     *
     * @param {number} offset Byte offset.
     * @param {number} byteSize Encoded byte length.
     * @returns {string} The decoded string.
     */
    string(offset, byteSize)
    {
        if (byteSize === 0)
        {
            return "";
        }

        return textDecoder.decode(this.bytesAt(offset, byteSize));
    }
}

/**
 * Returns the symbolic enum name or an unknown-value label for the CMF binary
 * reader.
 *
 * @param {Array<string>} names Enum names indexed by value.
 * @param {number} value Enum value.
 * @returns {string} The name, or `Unknown(value)`.
 */
export function enumName(names, value)
{
    return names[value] ?? `Unknown(${value})`;
}

/**
 * Reads a three-component vector from the CMF input for the CMF binary reader.
 *
 * @param {BinaryReader} reader Source reader.
 * @param {number} offset Byte offset.
 * @returns {Array<number>} The three components.
 */
export function readVector3(reader, offset)
{
    return [
        reader.f32(offset),
        reader.f32(offset + 4),
        reader.f32(offset + 8)
    ];
}

/**
 * Reads a four-component quaternion from the CMF input for the CMF binary
 * reader.
 *
 * @param {BinaryReader} reader Source reader.
 * @param {number} offset Byte offset.
 * @returns {Array<number>} The four components.
 */
export function readQuaternion(reader, offset)
{
    return [
        reader.f32(offset),
        reader.f32(offset + 4),
        reader.f32(offset + 8),
        reader.f32(offset + 12)
    ];
}

/**
 * Reads a 4-by-4 matrix from the CMF input for the CMF binary reader.
 *
 * @param {BinaryReader} reader Source reader.
 * @param {number} offset Byte offset.
 * @returns {Array<number>} The sixteen matrix values in file order.
 */
export function readMatrix(reader, offset)
{
    const values = [];
    for (let i = 0; i < 16; i++)
    {
        values.push(reader.f32(offset + i * 4));
    }
    return values;
}

/**
 * Reads minimum and maximum bounds from the CMF input for the CMF binary reader.
 *
 * @param {BinaryReader} reader Source reader.
 * @param {number} offset Byte offset.
 * @returns {import("./helpers.js").CmfBounds} The bounds.
 */
export function readBounds(reader, offset)
{
    return {
        min: readVector3(reader, offset),
        max: readVector3(reader, offset + 12)
    };
}

/**
 * CMF's container checksum.
 *
 * Re-exported under CMF's own name because the CMF byte layout is what makes it
 * meaningful here, and a test imports this spelling. The algorithm is the shared
 * standard CRC-32.
 *
 * @param {Uint8Array} bytes Source bytes.
 * @param {number} [start] First byte offset, inclusive.
 * @param {number} [end] Last byte offset, exclusive.
 * @returns {number} Unsigned 32-bit checksum.
 */
export function crc32(bytes, start = 0, end = bytes.byteLength)
{
    return sharedCrc32(bytes, start, end);
}



CjsSchema.meta.define("BinaryReader")(BinaryReader);
