import { WebglReadError } from "../errors.js";

/**
 * Returns a byte view for supported binary inputs without copying when possible.
 *
 * @param {ArrayBuffer|ArrayBufferView|Uint8Array} value Binary payload to normalize.
 * @returns {Uint8Array} Byte view over the supplied payload.
 */
export function asUint8Array(value)
{
    if (value instanceof Uint8Array)
    {
        return value;
    }
    if (value instanceof ArrayBuffer)
    {
        return new Uint8Array(value);
    }
    if (ArrayBuffer.isView(value))
    {
        return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    throw new TypeError("Expected an ArrayBuffer or Uint8Array");
}

/**
 * Minimal little-endian binary reader for the flat CEWG chunk container.
 *
 * Trimmed from Carbon's compiled-effect `WebglReader` (see
 * `@carbonenginejs/format-dxbc`'s and `@carbonenginejs/format-hlsl`'s vendored
 * copies): the CEWG format has no string table, so only raw-byte and uint32
 * reads plus offset/remaining tracking are implemented here.
 */
export class WebglReader
{
    /**
   * Creates a reader over a byte payload.
   *
   * @param {ArrayBuffer|ArrayBufferView|Uint8Array} bytes Source payload.
   * @param {object} [options] Reader bounds and metadata.
   * @param {number} [options.offset] Initial byte offset.
   * @param {number} [options.end] Exclusive end offset.
   * @param {string} [options.source] Source name used in error details.
   */
    constructor(bytes, options = {})
    {
        this.bytes = asUint8Array(bytes);
        this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
        this.offset = Number(options.offset) || 0;
        this.end = Number.isInteger(options.end) ? options.end : this.bytes.length;
        this.source = options.source || "memory";
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
   * Reads a byte range from the payload.
   *
   * @param {number} size Byte count to read.
   * @returns {Uint8Array} View over the read bytes.
   */
    readRaw(size)
    {
        this._require(size);
        const start = this.offset;
        this.offset += size;
        return this.bytes.subarray(start, start + size);
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
   * Ensures the requested read fits inside the configured payload bounds.
   *
   * @param {number} size Requested byte count.
   * @private
   */
    _require(size)
    {
        if (!Number.isInteger(size) || size < 0 || this.offset + size > this.end)
        {
            throw new WebglReadError("Unexpected end of CEWG package data", {
                source: this.source,
                offset: this.offset,
                requested: size,
                end: this.end
            });
        }
    }
}
