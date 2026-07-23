/**
 * Bounds-aware `DataView` cursor that provides the primitive reads and
 * end-of-stream checks the Black transport decodes with.
 */
export class CjsBlackBinaryReader
{
    constructor(dataView, context = null)
    {
        if (!(dataView instanceof DataView))
        {
            throw new TypeError("CjsBlackBinaryReader expected a DataView");
        }

        this.data = dataView;
        this.context = context;
        this.offset = 0;
    }

    get remaining()
    {
        return this.data.byteLength - this.offset;
    }

    AtEnd()
    {
        return this.remaining === 0;
    }

    ExpectEnd(message = "Black reader did not reach end")
    {
        if (!this.AtEnd())
        {
            throw new RangeError(`${message}: ${this.remaining} bytes remain`);
        }
    }

    ExpectU32(expected, message)
    {
        const actual = this.ReadU32();
        if (actual !== expected)
        {
            throw new RangeError(`${message}: expected ${expected}, got ${actual}`);
        }
        return actual;
    }

    ReadBinaryReader(byteLength)
    {
        return new CjsBlackBinaryReader(this.ReadDataView(byteLength), this.context);
    }

    ReadBytes(byteLength)
    {
        const view = this.ReadDataView(byteLength);
        return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    }

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

    ReadF32()
    {
        const value = this.data.getFloat32(this.offset, true);
        this.offset += 4;
        return value;
    }

    ReadF64()
    {
        const value = this.data.getFloat64(this.offset, true);
        this.offset += 8;
        return value;
    }

    ReadI8()
    {
        const value = this.data.getInt8(this.offset);
        this.offset += 1;
        return value;
    }

    ReadI16()
    {
        const value = this.data.getInt16(this.offset, true);
        this.offset += 2;
        return value;
    }

    ReadI32()
    {
        const value = this.data.getInt32(this.offset, true);
        this.offset += 4;
        return value;
    }

    ReadI64()
    {
        return this.data.getBigInt64(this.ConsumeOffset(8), true);
    }

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

    ReadU8()
    {
        const value = this.data.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    ReadU16()
    {
        const value = this.data.getUint16(this.offset, true);
        this.offset += 2;
        return value;
    }

    ReadU32()
    {
        const value = this.data.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    ReadU64()
    {
        return this.data.getBigUint64(this.ConsumeOffset(8), true);
    }

    Skip(byteLength)
    {
        this.ReadDataView(byteLength);
    }

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
