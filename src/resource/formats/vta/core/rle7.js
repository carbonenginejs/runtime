/**
 * VTA RLE7-family payload decoder.
 *
 * Carbon's encoder quantizes voxel values to 7/6/5 bits (Rle7/Rle7_5/Rle6),
 * but the DECODER is identical for all three: the low bit of a token byte is
 * the run flag, so every decoded value is even (Tr2 VtaHandler.cpp:25,63).
 * Reference: FrameDecoder absolute decode VtaHandler.cpp:92-113, delta
 * decode VtaHandler.cpp:115-137.
 */

/**
 * Decode one RLE7 frame into a voxel buffer.
 *
 * Frame 0 of a grid is absolute. Every later frame is a DELTA over the
 * previously decoded frame: `out[i] = (value + previous[i]) & 0xff`
 * (uint8 wraparound, exactly as Carbon adds in place). Passing the same
 * buffer as `out` and `previous` is safe - each index is read before it is
 * written, matching Carbon's base == dest advance-in-lockstep.
 *
 * @param {Uint8Array} encoded RLE7 stream (already zlib-inflated).
 * @param {Uint8Array} out Destination voxel buffer, fully overwritten.
 * @param {Uint8Array|null} [previous] Previous frame's voxels for delta frames.
 * @returns {Uint8Array} out.
 */
export function decodeRle7(encoded, out, previous = null)
{
    const size = out.length;
    let read = 0, written = 0;

    if (previous && previous.length !== size)
    {
        throw new Error(`CjsVtaFormat RLE7 delta frame requires a previous buffer of ${size} bytes, got ${previous.length}.`);
    }

    while (written < size)
    {
        if (read >= encoded.length)
        {
            throw new Error(`CjsVtaFormat RLE7 stream ended after ${written} of ${size} voxels.`);
        }
        const
            token = encoded[read++],
            value = token & 0xfe;

        let count = 1;
        if (token & 1)
        {
            if (read >= encoded.length)
            {
                throw new Error("CjsVtaFormat RLE7 run token is missing its length byte.");
            }
            count = encoded[read++] + 1;
        }
        if (written + count > size)
        {
            throw new Error(`CjsVtaFormat RLE7 run overflows the voxel buffer at ${written} + ${count} > ${size}.`);
        }

        if (previous)
        {
            for (let i = 0; i < count; i++, written++)
            {
                out[written] = (value + previous[written]) & 0xff;
            }
        }
        else
        {
            out.fill(value, written, written + count);
            written += count;
        }
    }

    if (read !== encoded.length)
    {
        throw new Error(`CjsVtaFormat RLE7 stream has ${encoded.length - read} trailing bytes after ${size} voxels.`);
    }
    return out;
}
