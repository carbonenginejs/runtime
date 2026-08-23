import { CjsFormatWriteError } from "./CjsFormatError.js";

const textEncoder = new TextEncoder();

/**
 * Growable little-endian append cursor with reserve-and-patch support.
 *
 * `formats/cmf/core/writer.js` already has a growable buffer, but it is
 * patch-style throughout: every write takes an explicit offset produced by a
 * prior `reserve`. Container assembly wants the opposite default — append in
 * field order — with patching kept for the one case that needs it, an offset
 * table whose values are only known after the payload it points at has been
 * measured.
 *
 * Every append returns the offset it wrote at, so the reserve-and-patch case is
 * just "keep the offset an append returned".
 */
export class CjsByteWriter
{
    #bytes;
    #view;
    #length = 0;

    /**
     * Creates an empty writer with an initial capacity.
     *
     * @param {number} [initialCapacity] Starting buffer size in bytes.
     */
    constructor(initialCapacity = 1024)
    {
        const capacity = Number.isInteger(initialCapacity) && initialCapacity > 0 ? initialCapacity : 1024;
        this.#bytes = new Uint8Array(capacity);
        this.#view = new DataView(this.#bytes.buffer);
    }

    /**
     * Returns the number of bytes written so far.
     *
     * @returns {number} Written byte count.
     */
    get length()
    {
        return this.#length;
    }

    /**
     * Appends an unsigned 8-bit integer.
     *
     * @param {number} value Integer value.
     * @returns {number} Offset the value was written at.
     */
    u8(value)
    {
        const offset = this.#advance(1);
        this.#view.setUint8(offset, value & 0xff);
        return offset;
    }

    /**
     * Appends a little-endian unsigned 16-bit integer.
     *
     * @param {number} value Integer value.
     * @returns {number} Offset the value was written at.
     */
    u16(value)
    {
        const offset = this.#advance(2);
        this.#view.setUint16(offset, value & 0xffff, true);
        return offset;
    }

    /**
     * Appends a little-endian unsigned 32-bit integer.
     *
     * @param {number} value Integer value.
     * @returns {number} Offset the value was written at.
     */
    u32(value)
    {
        const offset = this.#advance(4);
        this.#view.setUint32(offset, value >>> 0, true);
        return offset;
    }

    /**
     * Appends a little-endian signed 32-bit integer.
     *
     * @param {number} value Integer value.
     * @returns {number} Offset the value was written at.
     */
    i32(value)
    {
        const offset = this.#advance(4);
        this.#view.setInt32(offset, value | 0, true);
        return offset;
    }

    /**
     * Appends a little-endian 32-bit float.
     *
     * @param {number} value Float value.
     * @returns {number} Offset the value was written at.
     */
    f32(value)
    {
        const offset = this.#advance(4);
        this.#view.setFloat32(offset, Number(value) || 0, true);
        return offset;
    }

    /**
     * Appends Carbon's byte-sized boolean encoding.
     *
     * @param {boolean} value Boolean value.
     * @returns {number} Offset the value was written at.
     */
    bool(value)
    {
        return this.u8(value ? 1 : 0);
    }

    /**
     * Appends raw bytes.
     *
     * @param {ArrayBufferView|Uint8Array} value Bytes to append.
     * @returns {number} Offset the bytes were written at.
     */
    bytes(value)
    {
        const source = value instanceof Uint8Array
            ? value
            : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        const offset = this.#advance(source.byteLength);
        this.#bytes.set(source, offset);
        return offset;
    }

    /**
     * Appends UTF-8 text without a terminator.
     *
     * @param {string} value Text to append.
     * @returns {number} Offset the text was written at.
     */
    utf8(value)
    {
        return this.bytes(textEncoder.encode(String(value)));
    }

    /**
     * Appends a run of zero bytes and returns its offset, for later patching.
     *
     * @param {number} count Byte count to reserve.
     * @returns {number} Offset of the reserved run.
     */
    reserve(count)
    {
        if (!Number.isInteger(count) || count < 0)
        {
            throw new CjsFormatWriteError("Reserve count must be a non-negative integer", { count });
        }
        const offset = this.#advance(count);
        this.#bytes.fill(0, offset, offset + count);
        return offset;
    }

    /**
     * Overwrites a previously written unsigned 8-bit integer.
     *
     * @param {number} offset Target offset.
     * @param {number} value Integer value.
     */
    patchU8(offset, value)
    {
        this.#requireWritten(offset, 1);
        this.#view.setUint8(offset, value & 0xff);
    }

    /**
     * Overwrites a previously written little-endian unsigned 32-bit integer.
     *
     * @param {number} offset Target offset.
     * @param {number} value Integer value.
     */
    patchU32(offset, value)
    {
        this.#requireWritten(offset, 4);
        this.#view.setUint32(offset, value >>> 0, true);
    }

    /**
     * Overwrites a previously written byte range.
     *
     * @param {number} offset Target offset.
     * @param {ArrayBufferView|Uint8Array} value Replacement bytes.
     */
    patchBytes(offset, value)
    {
        const source = value instanceof Uint8Array
            ? value
            : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        this.#requireWritten(offset, source.byteLength);
        this.#bytes.set(source, offset);
    }

    /**
     * Returns an owned copy of the written bytes.
     *
     * @returns {Uint8Array} Written payload.
     */
    toBytes()
    {
        return this.#bytes.slice(0, this.#length);
    }

    /**
     * Grows the buffer when a write would exceed capacity.
     *
     * @param {number} capacity Required total capacity.
     */
    #ensure(capacity)
    {
        if (capacity <= this.#bytes.length) return;
        let next = this.#bytes.length * 2;
        while (next < capacity) next *= 2;
        const grown = new Uint8Array(next);
        grown.set(this.#bytes.subarray(0, this.#length));
        this.#bytes = grown;
        this.#view = new DataView(grown.buffer);
    }

    /**
     * Reserves space for one append and returns the offset it starts at.
     *
     * @param {number} size Byte count for this append.
     * @returns {number} Offset of the appended run.
     */
    #advance(size)
    {
        const offset = this.#length;
        this.#ensure(offset + size);
        this.#length = offset + size;
        return offset;
    }

    /**
     * Rejects a patch that falls outside the bytes already written.
     *
     * @param {number} offset Target offset.
     * @param {number} size Patch byte count.
     */
    #requireWritten(offset, size)
    {
        if (!Number.isInteger(offset) || offset < 0 || offset + size > this.#length)
        {
            throw new CjsFormatWriteError("Patch target is outside the written range", {
                offset,
                size,
                length: this.#length
            });
        }
    }
}

export default CjsByteWriter;
