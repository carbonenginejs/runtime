import { BitReader, ilog } from "./bitStream.js";

/**
 * Packed Vorbis codebook library handling for Wwise Vorbis repacking.
 *
 * Wwise strips the standard Vorbis codebooks from the setup header and
 * references entries in a shared packed library by 10-bit id. Rebuilding
 * expands each packed codebook back into the standard Vorbis codebook
 * encoding. Behavior mirrors the ww2ogg reference (BSD-licensed, Xiph.org
 * Foundation / Adam Gashlin); this is an original reimplementation.
 */

function parseError(message)
{
    const error = new Error(`wem: ${message}`);
    error.code = "CJS_FORMAT_PARSE_ERROR";
    return error;
}

/**
 * Parse a packed codebook library blob.
 *
 * Layout: codebook data, then a table of u32-le offsets; the last u32 in the
 * file points at the start of the offset table. Codebook `i` spans
 * offsets[i]..offsets[i+1].
 *
 * @param {Uint8Array} bytes Packed codebook library bytes.
 * @returns {object} Parsed library with `count` usable codebooks.
 */
export function parseCodebookLibrary(bytes)
{
    if (bytes.length < 4) throw parseError("packed codebook library is truncated");
    const offsetTableStart = readU32(bytes, bytes.length - 4);
    if (offsetTableStart > bytes.length - 4 || (bytes.length - offsetTableStart) % 4 !== 0)
    {
        throw parseError("packed codebook library has an invalid offset table");
    }
    const offsetCount = (bytes.length - offsetTableStart) / 4;
    const offsets = new Uint32Array(offsetCount);
    for (let i = 0; i < offsetCount; i++)
    {
        offsets[i] = readU32(bytes, offsetTableStart + i * 4);
        if (offsets[i] > offsetTableStart) throw parseError("packed codebook offset out of range");
        if (i > 0 && offsets[i] < offsets[i - 1]) throw parseError("packed codebook offsets not ascending");
    }
    return {
        bytes,
        offsets,
        count: offsetCount - 1
    };
}

/**
 * Rebuild one packed codebook, referenced by library id, into `writer`.
 *
 * @param {object} library `parseCodebookLibrary` output.
 * @param {number} id Codebook id from the setup header.
 * @param {object} writer OggPageWriter positioned inside the setup packet.
 */
export function rebuildCodebookById(library, id, writer)
{
    if (id < 0 || id >= library.count)
    {
        throw parseError(`invalid codebook id ${id} for library of ${library.count}`);
    }
    const start = library.offsets[id];
    const size = library.offsets[id + 1] - start;
    const reader = new BitReader(library.bytes.subarray(start, start + size));
    rebuildCodebook(reader, size, writer);
}

/**
 * Rebuild one packed codebook from `reader` into the standard Vorbis
 * codebook encoding on `writer`.
 *
 * @param {object} reader BitReader at the start of the packed codebook.
 * @param {number} size Packed codebook size in bytes (0 skips the size check).
 * @param {object} writer OggPageWriter positioned inside the setup packet.
 */
export function rebuildCodebook(reader, size, writer)
{
    const dimensions = reader.readBits(4);
    const entries = reader.readBits(14);

    writer.writeBits(0x564342, 24);
    writer.writeBits(dimensions, 16);
    writer.writeBits(entries, 24);

    const ordered = reader.readBits(1);
    writer.writeBits(ordered, 1);
    if (ordered)
    {
        const initialLength = reader.readBits(5);
        writer.writeBits(initialLength, 5);

        let currentEntry = 0;
        while (currentEntry < entries)
        {
            const bits = ilog(entries - currentEntry);
            const number = reader.readBits(bits);
            writer.writeBits(number, bits);
            currentEntry += number;
        }
        if (currentEntry > entries) throw parseError("codebook current entry out of range");
    }
    else
    {
        const codewordLengthLength = reader.readBits(3);
        const sparse = reader.readBits(1);
        if (codewordLengthLength === 0 || codewordLengthLength > 5)
        {
            throw parseError("nonsense codeword length");
        }
        writer.writeBits(sparse, 1);

        for (let i = 0; i < entries; i++)
        {
            let present = true;
            if (sparse)
            {
                const presentBit = reader.readBits(1);
                writer.writeBits(presentBit, 1);
                present = presentBit !== 0;
            }
            if (present)
            {
                const codewordLength = reader.readBits(codewordLengthLength);
                writer.writeBits(codewordLength, 5);
            }
        }
    }

    const lookupType = reader.readBits(1);
    writer.writeBits(lookupType, 4);
    if (lookupType === 1)
    {
        const min = reader.readBits(32);
        const max = reader.readBits(32);
        const valueLength = reader.readBits(4);
        const sequenceFlag = reader.readBits(1);
        writer.writeBits(min, 32);
        writer.writeBits(max, 32);
        writer.writeBits(valueLength, 4);
        writer.writeBits(sequenceFlag, 1);

        const quantvals = bookMaptype1Quantvals(entries, dimensions);
        for (let i = 0; i < quantvals; i++)
        {
            writer.writeBits(reader.readBits(valueLength + 1), valueLength + 1);
        }
    }
    else if (lookupType !== 0)
    {
        throw parseError(`unexpected codebook lookup type ${lookupType}`);
    }

    if (size !== 0 && Math.floor(reader.totalBitsRead / 8) + 1 !== size)
    {
        throw parseError(`codebook size mismatch (expected ${size}, used ${Math.floor(reader.totalBitsRead / 8) + 1})`);
    }
}

/**
 * Number of quantized values for a maptype-1 codebook lookup table
 * (Vorbis/Tremor `_book_maptype1_quantvals`).
 *
 * @param {number} entries Codebook entry count.
 * @param {number} dimensions Codebook dimensions.
 * @returns {number} Quantized value count.
 */
export function bookMaptype1Quantvals(entries, dimensions)
{
    if (dimensions === 0) return 0;
    const bits = ilog(entries);
    let vals = entries >>> Math.floor(((bits - 1) * (dimensions - 1)) / dimensions);

    for (;;)
    {
        let acc = 1;
        let acc1 = 1;
        for (let i = 0; i < dimensions; i++)
        {
            acc *= vals;
            acc1 *= vals + 1;
        }
        if (acc <= entries && acc1 > entries) return vals;
        if (acc > entries) vals--;
        else vals++;
    }
}

function readU32(bytes, offset)
{
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] * 0x1000000)) >>> 0;
}
