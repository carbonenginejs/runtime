// The two integrity checksums this runtime computes, in one module named for
// what they are. Sibling of `hash.js`, and the split between them is the job,
// not the width: FNV hashes address and identify, these two verify that bytes
// survived a round trip.
//
// ONE IMPLEMENTATION EACH, BECAUSE THERE WAS ONE ALGORITHM EACH. Standard
// CRC-32 was written three times — `cmf/core/binary.js`, `gr2/core/container.js`
// and `png/core/writer.js` — with the same reflected polynomial, the same
// initial value and the same final xor, differing only in whether the table was
// precomputed and how many range arguments the signature took. Adler-32 was
// written twice, in `png/core/writer.js` and `fbx/core/helpers.js`.
//
// WHAT DOES NOT BELONG HERE, and the distinction `hash.js` already draws:
// a checksum whose POLYNOMIAL or direction is part of a format's wire contract
// stays with that format. `wem/core/bitStream.js` computes the Ogg page
// checksum — forward CRC-32 over polynomial 0x04c11db7, zero initial value, no
// final xor. It shares a name with the function below and nothing else, and its
// own comment says so.
//
// Nor does the independent copy in `test/.../gr2/writer.test.mjs` belong here.
// A test that verifies a checksum by importing the implementation it is testing
// proves only that the function equals itself; that copy is a deliberate oracle
// and is meant to stay separate.

/** Reflected CRC-32 polynomial, as used by zlib, PNG, GZIP and Carbon's containers. */
const CRC32_POLYNOMIAL = 0xedb88320;

/** Largest prime below 65536 — Adler-32's modulus. */
const ADLER32_MODULUS = 65521;

const CRC32_TABLE = (() =>
{
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index++)
    {
        let value = index;
        for (let bit = 0; bit < 8; bit++)
        {
            value = (value & 1) ? (CRC32_POLYNOMIAL ^ (value >>> 1)) : (value >>> 1);
        }
        table[index] = value >>> 0;
    }
    return table;
})();

/**
 * Standard CRC-32 over a byte range.
 *
 * Reflected polynomial, initial value all ones, final one's complement — the
 * variant PNG chunks, zlib streams, CMF containers and GR2 sections all use.
 *
 * @param {Uint8Array} bytes Source bytes.
 * @param {number} [start] First byte offset, inclusive.
 * @param {number} [end] Last byte offset, exclusive.
 * @returns {number} Unsigned 32-bit checksum.
 */
export function crc32(bytes, start = 0, end = bytes.length)
{
    let crc = 0xffffffff;
    for (let index = start; index < end; index++)
    {
        crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[index]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Adler-32 over a byte range, as zlib streams carry it.
 *
 * @param {Uint8Array} bytes Source bytes.
 * @param {number} [start] First byte offset, inclusive.
 * @param {number} [end] Last byte offset, exclusive.
 * @returns {number} Unsigned 32-bit checksum.
 */
export function adler32(bytes, start = 0, end = bytes.length)
{
    let
        a = 1,
        b = 0;

    for (let index = start; index < end; index++)
    {
        a = (a + bytes[index]) % ADLER32_MODULUS;
        b = (b + a) % ADLER32_MODULUS;
    }

    return (((b << 16) >>> 0) | a) >>> 0;
}
