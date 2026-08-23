import { DxbcReadError } from "./errors.js";
import { asUint8Array } from "#utils/bytes";

const textDecoder = new TextDecoder("utf-8", { fatal: false });

/**
 * Little-endian binary reader with optional shared string-table references.
 */
export class DxbcReader
{
    /**
   * Creates a reader over a byte payload and optional shared string table.
   *
   * @param {ArrayBuffer|ArrayBufferView|Uint8Array} bytes Source payload.
   * @param {object} [options] Reader bounds and metadata.
   * @param {number} [options.offset] Initial byte offset.
   * @param {number} [options.end] Exclusive end offset.
   * @param {string} [options.source] Source name used in error details.
   * @param {ArrayBuffer|ArrayBufferView|Uint8Array} [options.stringTable] Effect string table.
   * @param {number} [options.stringTableSize] Valid string-table byte count.
   */
    constructor(bytes, options = {})
    {
        this.bytes = asUint8Array(bytes);
        this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
        this.offset = Number(options.offset) || 0;
        this.end = Number.isInteger(options.end) ? options.end : this.bytes.length;
        this.source = options.source || "memory";
        this.stringTable = options.stringTable ? asUint8Array(options.stringTable) : null;
        this.stringTableSize = Number.isInteger(options.stringTableSize)
            ? options.stringTableSize
            : (this.stringTable ? this.stringTable.length : 0);
    }

    /**
   * Attaches or replaces the effect string table used by string and blob reads.
   *
   * @param {ArrayBuffer|ArrayBufferView|Uint8Array} bytes String-table bytes.
   * @param {number|null} [size] Valid string-table byte count.
   */
    SetStringTable(bytes, size = null)
    {
        this.stringTable = asUint8Array(bytes);
        this.stringTableSize = Number.isInteger(size) ? size : this.stringTable.length;
    }

    /**
   * Returns the unread byte count inside the configured reader bounds.
   *
   * @returns {number} Remaining bytes.
   */
    get remaining()
    {
        return this.end - this.offset;
    }

    /**
   * Advances the reader by a fixed number of bytes.
   *
   * @param {number} size Byte count to skip.
   */
    Skip(size)
    {
        this._require(size);
        this.offset += size;
    }

    /**
   * Reads a byte range from the main payload.
   *
   * @param {number} size Byte count to read.
   * @returns {Uint8Array} View over the read bytes.
   */
    ReadRaw(size)
    {
        this._require(size);
        const start = this.offset;
        this.offset += size;
        return this.bytes.subarray(start, start + size);
    }

    /**
   * Reads an unsigned 8-bit integer.
   *
   * @returns {number} Integer value.
   */
    readUint8()
    {
        this._require(1);
        const value = this.view.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    /**
   * Reads a little-endian unsigned 16-bit integer.
   *
   * @returns {number} Integer value.
   */
    readUint16()
    {
        this._require(2);
        const value = this.view.getUint16(this.offset, true);
        this.offset += 2;
        return value;
    }

    /**
   * Reads a little-endian unsigned 32-bit integer.
   *
   * @returns {number} Integer value.
   */
    readUint32()
    {
        this._require(4);
        const value = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    /**
   * Reads a little-endian signed 32-bit integer.
   *
   * @returns {number} Integer value.
   */
    readInt32()
    {
        this._require(4);
        const value = this.view.getInt32(this.offset, true);
        this.offset += 4;
        return value;
    }

    /**
   * Reads a little-endian 32-bit float.
   *
   * @returns {number} Float value.
   */
    readFloat32()
    {
        this._require(4);
        const value = this.view.getFloat32(this.offset, true);
        this.offset += 4;
        return value;
    }

    /**
   * Reads Carbon's byte-sized boolean encoding.
   *
   * @returns {boolean} Boolean value.
   */
    ReadBool()
    {
        return this.readUint8() !== 0;
    }

    /**
   * Reads a string-table offset and resolves it to a UTF-8 string.
   *
   * @param {number} [sizeHint] Optional maximum byte span for bounds checking.
   * @returns {string} Decoded string.
   */
    ReadString(sizeHint = 0)
    {
        const offset = this.readUint32();
        return this.ReadStringAt(offset, sizeHint);
    }

    /**
   * Reads an optional string-table offset, returning null for zero-length fields.
   *
   * @param {number} length Source field length.
   * @returns {string|null} Decoded string or null.
   */
    ReadStringOptional(length)
    {
        const offset = this.readUint32();
        if (length === 0)
        {
            return null;
        }
        return this.ReadStringAt(offset, length);
    }

    /**
   * Reads a string-table blob offset and returns the referenced byte range.
   *
   * @param {number} size Blob byte count.
   * @returns {{offset:number,bytes:Uint8Array}} Blob location and bytes.
   */
    ReadTableBlob(size)
    {
        const offset = this.readUint32();
        this._requireStringTable(offset, size);
        return {
            offset,
            bytes: this.stringTable.subarray(offset, offset + size)
        };
    }

    /**
   * Reads a possibly empty string-table blob reference.
   *
   * @param {number} size Blob byte count.
   * @returns {{offset:number,bytes:Uint8Array}} Blob location and bytes.
   */
    ReadTableBlobOptional(size)
    {
        const offset = this.readUint32();
        if (size === 0)
        {
            return {
                offset,
                bytes: new Uint8Array(0)
            };
        }
        this._requireStringTable(offset, size);
        return {
            offset,
            bytes: this.stringTable.subarray(offset, offset + size)
        };
    }

    /**
   * Resolves a string table offset to a null-terminated UTF-8 string.
   *
   * @param {number} offset String-table byte offset.
   * @param {number} [sizeHint] Optional maximum byte span for bounds checking.
   * @returns {string} Decoded string.
   */
    ReadStringAt(offset, sizeHint = 0)
    {
        this._requireStringTable(offset, sizeHint);
        let end = offset;
        while (end < this.stringTableSize && this.stringTable[end] !== 0)
        {
            end += 1;
        }
        return textDecoder.decode(this.stringTable.subarray(offset, end));
    }

    /**
   * Ensures the requested read fits inside the configured payload bounds.
   *
   * @param {number} size Requested byte count.
   * @private
   */
    _require(size)
    {
        if (!Number.isInteger(size) || size < 0 || this.offset + size > this.end)
        {
            throw new DxbcReadError("Unexpected end of effect data", {
                source: this.source,
                offset: this.offset,
                requested: size,
                end: this.end
            });
        }
    }

    /**
   * Ensures a string-table offset and optional span are valid.
   *
   * @param {number} offset String-table byte offset.
   * @param {number} [sizeHint] Optional byte span for bounds checking.
   * @private
   */
    _requireStringTable(offset, sizeHint = 0)
    {
        const size = Number(sizeHint) || 0;
        if (!this.stringTable)
        {
            throw new DxbcReadError("Missing effect string table", {
                source: this.source,
                offset
            });
        }
        if (!Number.isInteger(offset) || offset < 0 || offset >= this.stringTableSize || offset + size > this.stringTableSize)
        {
            throw new DxbcReadError("Invalid string-table offset", {
                source: this.source,
                offset,
                sizeHint: size,
                stringTableSize: this.stringTableSize
            });
        }
    }
}
