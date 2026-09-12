// Source: blue/include/BitPacker.h
//   `BitPackerCore::DeQueueBits` (the LSB-first bit cursor)
//   `BitPackerCore::DeQueueAlignedBlock` (align, then hand back whole bytes)
//   `BitPackerCore::GetBitPosition`, `WordsRemaining`
//
// WHAT IS PORTED, AND WHAT DELIBERATELY IS NOT. Carbon's `BitPackerCore` is two
// things stacked: a bit cursor at the bottom and, above it, a family of
// `Pack`/`Unpack` overloads that are Carbon's own variable-length WIRE encoding
// (`Pack(uint32_t)` writes a 3-bit nibble-count prefix, then 4..32 bits;
// `BitPacker.h:437-460`). Only the cursor is general. The Pack layer describes
// one persistence format and has no business in a Vorbis, deflate or BC7
// decoder, so it stays in its donor and is not ported here.
//
// THE TWO DONOR SUBCLASSES HAVE NO JS COUNTERPART, DELIBERATELY. `BitPacker`
// (`BitPacker.h:109`) wraps a caller-provided buffer and only guards against
// overflow; `BitPackerManaged` (`:118`) owns and grows its own allocation
// (`GrowOwnedMemory`, `c_defaultOwnedMemorySize = 512`). That distinction is
// manual memory management: in JavaScript a `Uint8Array` already carries its own
// extent and is garbage collected, so there is nothing for the pair to
// distinguish. One class covers both, and neither name is invented here.
//
// LSB-FIRST, AND THAT IS NOT A PREFERENCE. Carbon reads
// `*buf = *m_bitStream >> m_bitsConsumed` (`BitPacker.h:180`), taking the low
// bit of the byte first and accumulating towards the high bit. Every bit-level
// consumer in this package wants exactly that: Vorbis (and therefore Wwise
// WEM), deflate, GIF LZW, and the BC6H/BC7 block layouts all number their bits
// from the least significant end.
//
// The one exception is JPEG entropy data, which is MSB-first AND interleaves
// 0xFF00 byte-stuffing into the bit refill. It has a single consumer, its
// distinguishing logic is the stuffing rather than the bit order, and Carbon has
// no MSB-first counterpart to port. So JPEG keeps its own reader, and no second
// shared class is invented for one caller.
//
// THE SEARCH BEHIND THAT ABSENCE CLAIM, stated so the next reader can widen it
// rather than repeat it. `ReadBits`/`BitStream`/`BitReader`/`bitBuffer`/`GetBits`
// across `blue/include`, `io/include`, `core`, `trinity`, `mesh`, `geo2` and
// `videoplayer`: `BitPacker.h` and `StructPacker.h` are the only hits.
//
// `videoplayer` is the one worth naming explicitly, because it LOOKS like the
// place a bit reader would live and is not. Carbon decodes Vorbis and demuxes
// WebM there by linking reference libraries — `VorbisDecoder.h` includes
// `vorbis/codec.h`, and `WebMParser.h` wraps `nestegg` — so the bit-level work
// happens inside vendored C, and Carbon authored no bit reader of its own for
// it. Our `formats/ogg` and `formats/webm` are therefore ports of a CAPABILITY
// Carbon has rather than of code Carbon wrote: a browser cannot link libvorbis,
// so the decoder is ours while the capability is Carbon's.

import { CjsReader } from "./CjsReader.js";
import { CjsFormatRangeError } from "./CjsFormatError.js";
import { asUint8Array } from "#utils/bytes";

/**
 * Read one bit, LSB-first within its byte.
 *
 * Random access, so nothing is allocated. This is the primitive the cursor
 * below is built from, and it is exported because block codecs address bits by
 * absolute index inside a fixed-size block rather than walking a stream.
 *
 * @param {Uint8Array} bytes Source bytes.
 * @param {number} bitIndex Absolute bit index from the start of `bytes`.
 * @returns {number} 0 or 1.
 */
export function readBitAt(bytes, bitIndex)
{
    return (bytes[bitIndex >>> 3] >>> (bitIndex & 7)) & 1;
}

/**
 * Read `count` bits starting at `startBit`, LSB-first.
 *
 * @param {Uint8Array} bytes Source bytes.
 * @param {number} startBit Absolute bit index of the first bit.
 * @param {number} count Bit count, 0..32.
 * @returns {number} Unsigned value.
 */
export function readBitsAt(bytes, startBit, count)
{
    let value = 0;
    for (let bit = 0; bit < count; bit++)
    {
        value |= readBitAt(bytes, startBit + bit) << bit;
    }
    return value >>> 0;
}

/**
 * LSB-first bit cursor over a byte range.
 *
 * The shared implementation behind the Wwise Vorbis reader, the Ogg packet
 * reader, the FBX deflate reader and the BC7 block reader. Specialized readers
 * replace the error class and message the way `CjsByteReader` subclasses do:
 *
 * ```js
 * class MyBitReader extends CjsBitReader
 * {
 *     static ReadError = MyReadError;
 *     static endOfDataMessage = "Unexpected end of my bitstream";
 * }
 * ```
 *
 * A reader whose end of data is NOT an error — a Vorbis packet legitimately
 * runs out mid-read and the decoder must see that as end-of-packet rather than
 * a throw — overrides `Exhausted()` instead. That is the one genuine
 * behavioural axis here, and it has two real callers pulling in opposite
 * directions, which is why it is a hook and not an option flag.
 */
export class CjsBitReader extends CjsReader
{
    /**
     * Error class raised when a read runs past the end.
     *
     * A `RangeError` lineage, matching `CjsByteReader`.
     */
    static ReadError = CjsFormatRangeError;

    /** Message used when a read would run past the configured end. */
    static endOfDataMessage = "Unexpected end of bitstream";

    /**
     * Creates a bit cursor over a byte payload.
     *
     * @param {ArrayBuffer|ArrayBufferView|Uint8Array} bytes Source payload.
     * @param {object} [options] Cursor bounds and metadata.
     * @param {number} [options.offset] Initial byte offset.
     * @param {number} [options.end] Exclusive end BYTE offset.
     * @param {number} [options.endBit] Exclusive end BIT position, counted from
     *   the start of `bytes`. Takes precedence over `end`; a block codec bounds
     *   itself in bits (a BC7 block is 128 bits), not bytes.
     * @param {string} [options.source] Source name used in error details.
     */
    constructor(bytes, options = {})
    {
        super(options);
        this.bytes = asUint8Array(bytes);
        this.bitPosition = (Number(options.offset) || 0) * 8;
        this.endBit = Number.isInteger(options.endBit)
            ? options.endBit
            : (Number.isInteger(options.end) ? options.end * 8 : this.bytes.length * 8);
        this.source = options.source || "memory";
        this.startBit = this.bitPosition;
    }

    /** Bits still readable before the configured end. */
    get remaining()
    {
        return Math.max(0, this.endBit - this.bitPosition);
    }

    /** Bits consumed since construction — Carbon's `GetBitPosition`. */
    get totalBitsRead()
    {
        return this.bitPosition - this.startBit;
    }

    /** True once the cursor sits on a byte boundary. */
    get isAligned()
    {
        return (this.bitPosition & 7) === 0;
    }

    /**
     * Read a single bit.
     *
     * @returns {number} 0 or 1, or whatever `Exhausted` yields at the end.
     */
    ReadBit()
    {
        if (this.bitPosition >= this.endBit) return this.Exhausted(1);
        const bit = readBitAt(this.bytes, this.bitPosition);
        this.bitPosition++;
        return bit;
    }

    /**
     * Read `count` bits as an unsigned integer, LSB-first.
     *
     * Whole bytes are taken in one step rather than bit by bit, which is what
     * makes this usable for deflate. The result is identical either way.
     *
     * @param {number} count Bit count, 0..32.
     * @returns {number} Unsigned value, or whatever `Exhausted` yields.
     */
    ReadBits(count)
    {
        if (count === 0) return 0;
        if (this.bitPosition + count > this.endBit) return this.Exhausted(count);

        let value = 0,
            shift = 0,
            remaining = count;

        while (remaining > 0)
        {
            const
                bitInByte = this.bitPosition & 7,
                available = 8 - bitInByte,
                take = remaining < available ? remaining : available,
                chunk = (this.bytes[this.bitPosition >>> 3] >>> bitInByte) & ((1 << take) - 1);

            value |= chunk << shift;
            shift += take;
            remaining -= take;
            this.bitPosition += take;
        }

        return value >>> 0;
    }

    /**
     * Discard bits up to the next byte boundary — Carbon aligns this way before
     * handing back a whole block (`BitPacker.h:DeQueueAlignedBlock`).
     *
     * @returns {number} Bits discarded, 0..7.
     */
    Align()
    {
        const skip = (8 - (this.bitPosition & 7)) & 7;
        this.bitPosition += skip;
        return skip;
    }

    /**
     * Align, then return a view over the next `count` whole bytes.
     *
     * A view, not a copy, exactly as Carbon's `DeQueueAlignedBlock` passes back
     * a pointer into the buffer.
     *
     * @param {number} count Byte count.
     * @returns {Uint8Array} View into the source bytes.
     */
    ReadAlignedBytes(count)
    {
        this.Align();
        if (this.bitPosition + count * 8 > this.endBit)
        {
            throw this.Error(this.constructor.endOfDataMessage, { count });
        }
        const start = this.bitPosition >>> 3;
        this.bitPosition += count * 8;
        return this.bytes.subarray(start, start + count);
    }

    /**
     * What a read past the end produces.
     *
     * The default is a throw, because for every format whose bitstream carries
     * its own lengths, running out means the input is truncated. Override to
     * return a sentinel where exhaustion is an expected terminal condition.
     *
     * @param {number} count Bits that were requested.
     * @returns {number} Sentinel value, when the subclass returns rather than throws.
     */
    Exhausted(count)
    {
        throw this.Error(this.constructor.endOfDataMessage, {
            bitPosition: this.bitPosition,
            requested: count,
            endBit: this.endBit
        });
    }

    /**
     * Build a reader error carrying this cursor's source and position.
     *
     * @param {string} message Error message.
     * @param {object} [details] Extra error details.
     * @returns {Error} The configured read error.
     */
    Error(message, details = {})
    {
        const { ReadError } = this.constructor;
        return new ReadError(message, { source: this.source, ...details });
    }
}

export default CjsBitReader;
