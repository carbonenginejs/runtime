// The one byte cursor for every exact Wwise payload, and the variable-length
// integer it reads.
//
// SELF-CONTAINED ON PURPOSE. This module imports nothing. It used to live in
// `nodeBase.js`, which imports `helpers.js`, which imports `eventAction.js` -
// so the moment `eventAction.js` started using the shared cursor the three
// formed an import cycle. Rollup tolerated it; ES module cycles are a real
// hazard and the fix is for the primitive everything reaches for to depend on
// nothing.

/**
 * Reads Wwise's MSB-first base-128 unsigned integer.
 *
 * @returns {{value:number,nextOffset:number}|null} Decoded value and next
 * offset, or null for truncated, overflowed, or non-canonical input.
 */
export function readWwiseVar(bytes, offset = 0)
{
    let at = Number(offset);
    let value = 0;
    let count = 0;

    if (!Number.isSafeInteger(at) || at < 0)
    {
        return null;
    }

    while (at < bytes.byteLength && count < 5)
    {
        const byte = bytes[at++];

        if (count === 0 && byte === 0x80)
        {
            return null;
        }
        if (value > 0x01ffffff)
        {
            return null;
        }

        value = value * 128 + (byte & 0x7f);
        count++;

        if ((byte & 0x80) === 0)
        {
            return value <= 0xffffffff
                ? { value: value >>> 0, nextOffset: at }
                : null;
        }
    }

    return null;
}

/** Bounds-aware little-endian cursor over one HIRC payload. */
export class WwiseCursor
{
    /**
     * Creates a cursor over a bounded portion of a Wwise payload.
     *
     * @param {Uint8Array} bytes Payload bytes.
     * @param {number} [offset=0] Initial byte offset.
     * @param {number} [end=bytes.byteLength] Exclusive ending offset.
     */
    constructor(bytes, offset = 0, end = bytes?.byteLength)
    {
        if (!(bytes instanceof Uint8Array)
            || !Number.isSafeInteger(offset)
            || !Number.isSafeInteger(end)
            || offset < 0
            || end < offset
            || end > bytes.byteLength)
        {
            throw new TypeError("Invalid Wwise cursor range");
        }

        this.bytes = bytes;
        this.view = new DataView(
            bytes.buffer,
            bytes.byteOffset,
            bytes.byteLength,
        );
        this.at = offset;
        this.end = end;
    }

    /** Gets the number of unread bytes in the bounded range. */
    get remaining()
    {
        return this.end - this.at;
    }

    /**
     * Verifies that a read of the requested size stays within the range.
     *
     * @param {number} size Number of bytes to read.
     * @throws {RangeError} The read would exceed the bounded range.
     */
    ensure(size)
    {
        if (!Number.isSafeInteger(size)
            || size < 0
            || this.at + size > this.end)
        {
            throw new RangeError("truncated Wwise object");
        }
    }

    /** Reads an unsigned 8-bit integer. */
    u8()
    {
        this.ensure(1);
        return this.view.getUint8(this.at++);
    }

    /** Reads a signed 8-bit integer. */
    s8()
    {
        this.ensure(1);
        return this.view.getInt8(this.at++);
    }

    /** Reads a little-endian unsigned 16-bit integer. */
    u16()
    {
        this.ensure(2);
        const value = this.view.getUint16(this.at, true);

        this.at += 2;
        return value;
    }

    /** Reads a little-endian unsigned 32-bit integer. */
    u32()
    {
        this.ensure(4);
        const value = this.view.getUint32(this.at, true);

        this.at += 4;
        return value;
    }

    /** Reads a little-endian signed 32-bit integer. */
    s32()
    {
        this.ensure(4);
        const value = this.view.getInt32(this.at, true);

        this.at += 4;
        return value;
    }

    /** Reads a little-endian 32-bit floating-point value. */
    f32()
    {
        this.ensure(4);
        const value = this.view.getFloat32(this.at, true);

        this.at += 4;
        return value;
    }

    /** Reads a little-endian signed 16-bit integer. */
    s16()
    {
        this.ensure(2);
        const value = this.view.getInt16(this.at, true);

        this.at += 2;
        return value;
    }

    /** Reads a little-endian 64-bit floating-point value. */
    f64()
    {
        this.ensure(8);
        const value = this.view.getFloat64(this.at, true);

        this.at += 8;
        return value;
    }

    /**
     * Reads a 32-bit float and rejects a non-finite result.
     *
     * The cursor advances BEFORE the finiteness check, which is deliberate and
     * was the donor behaviour: the four bytes were consumed either way, and a
     * caller that catches the rejection and inspects the cursor must see it past
     * the field it rejected.
     *
     * @returns {number} A finite float.
     * @throws {RangeError} The stored value is NaN or infinite.
     */
    finiteF32()
    {
        this.ensure(4);
        const value = this.view.getFloat32(this.at, true);

        this.at += 4;
        if (!Number.isFinite(value))
        {
            throw new RangeError("Wwise float must be finite");
        }
        return value;
    }

    /**
     * Reads a table element count and rejects one the payload cannot hold.
     *
     * A corrupt count is the cheapest way to make a reader allocate for a table
     * that is not there, so it is checked against what remains rather than
     * trusted and discovered later, one truncated element at a time.
     *
     * NAMED FOR THE READ, because this module already has a free
     * `boundedCount(value, remaining, stride, maximum)` that validates a count
     * someone else read, with an explicit ceiling. The two are different checks
     * and must not share a name in one file.
     *
     * @param {number} minimumStride Smallest byte size one element can occupy.
     * @returns {number} The element count.
     * @throws {RangeError} The count exceeds what the remaining bytes allow.
     */
    readBoundedCount(minimumStride)
    {
        const count = this.u32();

        if (count > Math.floor(this.remaining / minimumStride))
        {
            throw new RangeError("Wwise table count exceeds payload");
        }
        return count;
    }

    /**
     * Reads a NUL-terminated string and consumes its terminator.
     *
     * Decoded byte by byte through `String.fromCharCode`, NOT as UTF-8. That is
     * the donor behaviour and it is load-bearing: the music parsers compare the
     * decoded marker names while validating an exact end offset, so widening the
     * decode would change which banks parse.
     *
     * @returns {string} The string, without its terminator.
     */
    stringZ()
    {
        let end = this.at;
        while (end < this.end && this.bytes[end] !== 0) end++;

        let value = "";
        for (let index = this.at; index < end; index++)
        {
            value += String.fromCharCode(this.bytes[index]);
        }

        this.at = end + 1;
        return value;
    }

    /** Reads a Wwise variable-length unsigned integer. */
    variable()
    {
        const result = readWwiseVar(
            this.bytes.subarray(0, this.end),
            this.at,
        );

        if (!result)
        {
            throw new RangeError("invalid Wwise variable integer");
        }

        this.at = result.nextOffset;
        return result.value;
    }
}
