/**
 * Bit-level IO for Wwise Vorbis repacking.
 *
 * Vorbis bitstreams are LSB-first within each byte; both the reader and the
 * Ogg writer here follow that convention. The writer assembles one Ogg page
 * per packet (identification, comment, setup, then one page per audio
 * packet), matching the ww2ogg reference behavior.
 */

const OGG_HEADER_BYTES = 27;
const OGG_MAX_SEGMENTS = 255;
const OGG_SEGMENT_SIZE = 255;
const OGG_MAX_PAYLOAD = OGG_MAX_SEGMENTS * OGG_SEGMENT_SIZE;

const CRC_TABLE = buildCrcTable();

function buildCrcTable()
{
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++)
    {
        let r = (i << 24) >>> 0;
        for (let bit = 0; bit < 8; bit++)
        {
            r = ((r & 0x80000000) ? ((r << 1) ^ 0x04c11db7) : (r << 1)) >>> 0;
        }
        table[i] = r;
    }
    return table;
}

/**
 * Compute the Ogg page checksum (forward CRC-32, polynomial 0x04c11db7,
 * zero initial value, no final xor).
 *
 * @param {Uint8Array} bytes Page bytes with the checksum field zeroed.
 * @param {number} length Number of bytes to include.
 * @returns {number} Unsigned 32-bit checksum.
 */
export function oggChecksum(bytes, length)
{
    let crc = 0;
    for (let i = 0; i < length; i++)
    {
        crc = (((crc << 8) >>> 0) ^ CRC_TABLE[((crc >>> 24) ^ bytes[i]) & 0xff]) >>> 0;
    }
    return crc;
}

/**
 * LSB-first bit reader over a byte range.
 */
export class BitReader
{
    #bytes;
    #position;
    #bitBuffer = 0;
    #bitsLeft = 0;
    #totalBitsRead = 0;

    /**
     * Create a reader over `bytes` starting at `offset`.
     *
     * @param {Uint8Array} bytes Source bytes.
     * @param {number} [offset] Starting byte offset.
     */
    constructor(bytes, offset = 0)
    {
        this.#bytes = bytes;
        this.#position = offset;
    }

    /**
     * Read a single bit.
     *
     * @returns {number} 0 or 1.
     */
    readBit()
    {
        if (this.#bitsLeft === 0)
        {
            if (this.#position >= this.#bytes.length)
            {
                const error = new Error("wem: bitstream out of bits");
                error.code = "CJS_FORMAT_TRUNCATED";
                throw error;
            }
            this.#bitBuffer = this.#bytes[this.#position++];
            this.#bitsLeft = 8;
        }
        const bit = this.#bitBuffer & 1;
        this.#bitBuffer >>= 1;
        this.#bitsLeft--;
        this.#totalBitsRead++;
        return bit;
    }

    /**
     * Read `count` bits as an unsigned integer (LSB-first).
     *
     * @param {number} count Bit count (0..32).
     * @returns {number} Unsigned value.
     */
    readBits(count)
    {
        let value = 0;
        for (let i = 0; i < count; i++)
        {
            if (this.readBit()) value |= (1 << i);
        }
        return value >>> 0;
    }

    /**
     * Total bits consumed so far.
     *
     * @returns {number} Bit count.
     */
    get totalBitsRead()
    {
        return this.#totalBitsRead;
    }
}

/**
 * LSB-first bit writer that assembles Ogg pages, one packet per page.
 */
export class OggPageWriter
{
    #pages = [];
    #payload = new Uint8Array(OGG_MAX_PAYLOAD);
    #payloadBytes = 0;
    #bitBuffer = 0;
    #bitsStored = 0;
    #granule = 0;
    #sequenceNumber = 0;
    #first = true;
    #continued = false;

    /**
     * Write a single bit.
     *
     * @param {number|boolean} bit Bit value.
     */
    writeBit(bit)
    {
        if (bit) this.#bitBuffer |= (1 << this.#bitsStored);
        this.#bitsStored++;
        if (this.#bitsStored === 8) this.#flushBits();
    }

    /**
     * Write `count` bits of `value` (LSB-first).
     *
     * @param {number} value Unsigned value.
     * @param {number} count Bit count (0..32).
     */
    writeBits(value, count)
    {
        for (let i = 0; i < count; i++)
        {
            this.writeBit((value >>> i) & 1);
        }
    }

    /**
     * Set the granule position recorded on the next flushed page.
     *
     * @param {number} granule Unsigned granule position (< 2^53).
     */
    setGranule(granule)
    {
        this.#granule = granule;
    }

    #flushBits()
    {
        if (this.#bitsStored === 0) return;
        if (this.#payloadBytes === OGG_MAX_PAYLOAD)
        {
            const error = new Error("wem: packet too large for one Ogg page");
            error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
            throw error;
        }
        this.#payload[this.#payloadBytes++] = this.#bitBuffer;
        this.#bitsStored = 0;
        this.#bitBuffer = 0;
    }

    /**
     * Finish the current packet and emit it as one Ogg page.
     *
     * @param {boolean} [last] Mark this page as end-of-stream.
     */
    flushPage(last = false)
    {
        this.#flushBits();
        if (this.#payloadBytes === 0) return;

        const payloadBytes = this.#payloadBytes;
        let segments = Math.floor((payloadBytes + OGG_SEGMENT_SIZE) / OGG_SEGMENT_SIZE);
        if (segments === OGG_MAX_SEGMENTS + 1) segments = OGG_MAX_SEGMENTS;

        const page = new Uint8Array(OGG_HEADER_BYTES + segments + payloadBytes);
        page[0] = 0x4f;
        page[1] = 0x67;
        page[2] = 0x67;
        page[3] = 0x53;
        page[4] = 0;
        page[5] = (this.#continued ? 1 : 0) | (this.#first ? 2 : 0) | (last ? 4 : 0);
        writeU32(page, 6, this.#granule % 0x100000000);
        writeU32(page, 10, Math.floor(this.#granule / 0x100000000));
        writeU32(page, 14, 1);
        writeU32(page, 18, this.#sequenceNumber);
        writeU32(page, 22, 0);
        page[26] = segments;

        let bytesLeft = payloadBytes;
        for (let i = 0; i < segments; i++)
        {
            if (bytesLeft >= OGG_SEGMENT_SIZE)
            {
                page[27 + i] = OGG_SEGMENT_SIZE;
                bytesLeft -= OGG_SEGMENT_SIZE;
            }
            else
            {
                page[27 + i] = bytesLeft;
            }
        }

        page.set(this.#payload.subarray(0, payloadBytes), OGG_HEADER_BYTES + segments);
        writeU32(page, 22, oggChecksum(page, page.length));

        this.#pages.push(page);
        this.#sequenceNumber++;
        this.#first = false;
        this.#continued = false;
        this.#payloadBytes = 0;
    }

    /**
     * Concatenate all flushed pages into one buffer.
     *
     * @returns {Uint8Array} Complete Ogg stream bytes.
     */
    toBytes()
    {
        let total = 0;
        for (const page of this.#pages) total += page.length;
        const bytes = new Uint8Array(total);
        let offset = 0;
        for (const page of this.#pages)
        {
            bytes.set(page, offset);
            offset += page.length;
        }
        return bytes;
    }

    /**
     * Number of pages flushed so far.
     *
     * @returns {number} Page count.
     */
    get pageCount()
    {
        return this.#pages.length;
    }
}

function writeU32(bytes, offset, value)
{
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
    bytes[offset + 2] = (value >>> 16) & 0xff;
    bytes[offset + 3] = (value >>> 24) & 0xff;
}

/**
 * Smallest number of bits needed to represent `value` (Vorbis ilog).
 *
 * @param {number} value Unsigned value.
 * @returns {number} Bit count; 0 when value is 0.
 */
export function ilog(value)
{
    let result = 0;
    let v = value >>> 0;
    while (v)
    {
        result++;
        v >>>= 1;
    }
    return result;
}
