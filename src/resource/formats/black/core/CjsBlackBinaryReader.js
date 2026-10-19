import { CjsSchema } from "#schema/CjsSchema";

/**
 * Bounds-aware `DataView` cursor that provides the primitive reads and
 * end-of-stream checks the Black transport decodes with.
 */
export class CjsBlackBinaryReader
{
    /**
     * Bytes the cursor reads; set by the constructor.
     * @type {DataView|null}
     */
    data = null;

    /**
     * Object-graph reader that owns the string tables and nested reads.
     * @type {CjsBlackReader|null}
     */
    context = null;

    /**
     * Current byte offset.
     * @type {number}
     */
    offset = 0;

    /**
     * Creates a CjsBlackBinaryReader over caller-provided Black bytes and reader
     * options.
     *
     * @param {DataView} dataView Bytes the cursor reads.
     * @param {import("./CjsBlackReader.js").CjsBlackReader|null} [context=null] Object-graph reader that owns the string tables and nested reads.
     * @throws {TypeError} When `dataView` is not a DataView.
     */
    constructor(dataView, context = null)
    {
        if (!(dataView instanceof DataView))
        {
            throw new TypeError("CjsBlackBinaryReader expected a DataView");
        }

        this.data = dataView;
        this.context = context;
    }

    /**
     * Returns the number of unread Black bytes for the Black object-graph
     * reader.
     *
     * @returns {number} Unread byte count.
     */
    get remaining()
    {
        return this.data.byteLength - this.offset;
    }

    /**
     * Reports whether the Black cursor consumed every byte for the Black
     * object-graph reader.
     *
     * @returns {boolean} True when no bytes remain.
     */
    AtEnd()
    {
        return this.remaining === 0;
    }

    /**
     * Validates end against Black object-graph reader constraints and throws on
     * failure.
     *
     * @param {string} [message="Black reader did not reach end"] Error message prefix.
     * @throws {RangeError} When bytes remain.
     */
    ExpectEnd(message = "Black reader did not reach end")
    {
        if (!this.AtEnd())
        {
            throw new RangeError(`${message}: ${this.remaining} bytes remain`);
        }
    }

    /**
     * Validates U32 against Black object-graph reader constraints and throws on
     * failure.
     *
     * @param {number} expected Required value.
     * @param {string} message Error message prefix.
     * @returns {number} The value read.
     * @throws {RangeError} When the value differs.
     */
    ExpectU32(expected, message)
    {
        const actual = this.ReadU32();
        if (actual !== expected)
        {
            throw new RangeError(`${message}: expected ${expected}, got ${actual}`);
        }
        return actual;
    }

    /**
     * Reads binary reader from the current Black object-graph reader.
     *
     * @param {number} byteLength Bytes to consume.
     * @returns {CjsBlackBinaryReader} A cursor over those bytes, sharing this context.
     */
    ReadBinaryReader(byteLength)
    {
        return new CjsBlackBinaryReader(this.ReadDataView(byteLength), this.context);
    }

    /**
     * Reads bytes from the current Black object-graph reader.
     *
     * @param {number} byteLength Bytes to consume.
     * @returns {Uint8Array} A view over those bytes.
     */
    ReadBytes(byteLength)
    {
        const view = this.ReadDataView(byteLength);
        return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    }

    /**
     * Reads C string from the current Black object-graph reader.
     *
     * @returns {string} The UTF-8 string, without its terminator.
     */
    ReadCString()
    {
        const startOffset = this.offset;
        while (this.ReadU8() !== 0)
        {
            // Scan to null terminator.
        }

        const byteOffset = this.data.byteOffset + startOffset;
        const byteLength = this.offset - startOffset - 1;
        const bytes = new Uint8Array(this.data.buffer, byteOffset, byteLength);
        return CjsBlackBinaryReader.utf8Decoder.decode(bytes);
    }

    /**
     * Reads CW string from the current Black object-graph reader.
     *
     * @returns {string} The UTF-16LE string, without its terminator.
     */
    ReadCWString()
    {
        const startOffset = this.offset;
        while (this.ReadU16() !== 0)
        {
            // Scan to UTF-16 null terminator.
        }

        const byteOffset = this.data.byteOffset + startOffset;
        const byteLength = this.offset - startOffset - 2;
        const bytes = new Uint8Array(this.data.buffer, byteOffset, byteLength);
        return CjsBlackBinaryReader.utf16Decoder.decode(bytes);
    }

    /**
     * Reads data view from the current Black object-graph reader.
     *
     * @param {number} byteLength Bytes to consume.
     * @returns {DataView} A view over those bytes.
     * @throws {RangeError} When the length is invalid or exceeds the remaining bytes.
     */
    ReadDataView(byteLength)
    {
        if (!Number.isInteger(byteLength) || byteLength < 0)
        {
            throw new RangeError(`Invalid Black byte length: ${String(byteLength)}`);
        }

        if (this.remaining < byteLength)
        {
            throw new RangeError(`Black reader needs ${byteLength} bytes but only ${this.remaining} remain`);
        }

        const result = new DataView(this.data.buffer, this.data.byteOffset + this.offset, byteLength);
        this.offset += byteLength;
        return result;
    }

    /**
     * Reads a 32-bit float from the Black cursor for the Black object-graph
     * reader.
     *
     * @returns {number} The value read.
     */
    ReadF32()
    {
        const value = this.data.getFloat32(this.offset, true);
        this.offset += 4;
        return value;
    }

    /**
     * Reads a 64-bit float from the Black cursor for the Black object-graph
     * reader.
     *
     * @returns {number} The value read.
     */
    ReadF64()
    {
        const value = this.data.getFloat64(this.offset, true);
        this.offset += 8;
        return value;
    }

    /**
     * Reads a signed 8-bit integer from the Black cursor for the Black
     * object-graph reader.
     *
     * @returns {number} The value read.
     */
    ReadI8()
    {
        const value = this.data.getInt8(this.offset);
        this.offset += 1;
        return value;
    }

    /**
     * Reads a signed 16-bit integer from the Black cursor for the Black
     * object-graph reader.
     *
     * @returns {number} The value read.
     */
    ReadI16()
    {
        const value = this.data.getInt16(this.offset, true);
        this.offset += 2;
        return value;
    }

    /**
     * Reads a signed 32-bit integer from the Black cursor for the Black
     * object-graph reader.
     *
     * @returns {number} The value read.
     */
    ReadI32()
    {
        const value = this.data.getInt32(this.offset, true);
        this.offset += 4;
        return value;
    }

    /**
     * Reads a signed 64-bit integer from the Black cursor for the Black
     * object-graph reader.
     *
     * @returns {bigint} The value read.
     */
    ReadI64()
    {
        return this.data.getBigInt64(this.ConsumeOffset(8), true);
    }

    /**
     * Resolves a narrow-string table index from the Black cursor for the Black
     * object-graph reader.
     *
     * @returns {string} The referenced string.
     * @throws {RangeError} When the index is outside the string table.
     */
    ReadStringRef()
    {
        const index = this.ReadU16();
        const strings = this.context?.info?.strings || [];
        if (index >= strings.length)
        {
            throw new RangeError(`Invalid Black string index: ${index}`);
        }
        return strings[index];
    }

    /**
     * Reads wide string ref from the current Black object-graph reader.
     *
     * @returns {string} The referenced wide string.
     * @throws {RangeError} When the index is outside the wide string table.
     */
    ReadWideStringRef()
    {
        const index = this.ReadU16();
        const strings = this.context?.info?.wideStrings || [];
        if (index >= strings.length)
        {
            throw new RangeError(`Invalid Black wide string index: ${index}`);
        }
        return strings[index];
    }

    /**
     * Reads an unsigned 8-bit integer from the Black cursor for the Black
     * object-graph reader.
     *
     * @returns {number} The value read.
     */
    ReadU8()
    {
        const value = this.data.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    /**
     * Reads an unsigned 16-bit integer from the Black cursor for the Black
     * object-graph reader.
     *
     * @returns {number} The value read.
     */
    ReadU16()
    {
        const value = this.data.getUint16(this.offset, true);
        this.offset += 2;
        return value;
    }

    /**
     * Reads an unsigned 32-bit integer from the Black cursor for the Black
     * object-graph reader.
     *
     * @returns {number} The value read.
     */
    ReadU32()
    {
        const value = this.data.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    /**
     * Reads an unsigned 64-bit integer from the Black cursor for the Black
     * object-graph reader.
     *
     * @returns {bigint} The value read.
     */
    ReadU64()
    {
        return this.data.getBigUint64(this.ConsumeOffset(8), true);
    }

    /**
     * Advances the Black cursor by a validated byte count for the Black
     * object-graph reader.
     *
     * @param {number} byteLength Bytes to skip.
     */
    Skip(byteLength)
    {
        this.ReadDataView(byteLength);
    }

    /**
     * Consumes offset from the current Black object-graph reader.
     *
     * @param {number} byteLength Bytes to consume.
     * @returns {number} The offset before consuming.
     * @throws {RangeError} When fewer bytes remain.
     */
    ConsumeOffset(byteLength)
    {
        if (this.remaining < byteLength)
        {
            throw new RangeError(`Black reader needs ${byteLength} bytes but only ${this.remaining} remain`);
        }

        const offset = this.offset;
        this.offset += byteLength;
        return offset;
    }

    /**
     * Creates a bounded Black reader over supported binary input for the Black
     * object-graph reader.
     *
     * @param {import("./helpers.js").BlackInput} input Bytes, a view, or an existing cursor (returned unchanged).
     * @param {import("./CjsBlackReader.js").CjsBlackReader|null} [context=null] Object-graph reader for a new cursor.
     * @returns {CjsBlackBinaryReader} The cursor.
     * @throws {TypeError} When the input is not binary.
     */
    static from(input, context = null)
    {
        if (input instanceof CjsBlackBinaryReader) return input;
        if (input instanceof DataView) return new CjsBlackBinaryReader(input, context);
        if (input instanceof ArrayBuffer) return new CjsBlackBinaryReader(new DataView(input), context);
        if (ArrayBuffer.isView(input))
        {
            return new CjsBlackBinaryReader(new DataView(input.buffer, input.byteOffset, input.byteLength), context);
        }

        throw new TypeError("Black input must be an ArrayBuffer, DataView, or typed array");
    }

    static utf8Decoder = new TextDecoder("utf-8");

    static utf16Decoder = new TextDecoder("utf-16le");
}

CjsSchema.meta.define(CjsBlackBinaryReader, { className: "CjsBlackBinaryReader", donors: [ "BlackReader" ] });
