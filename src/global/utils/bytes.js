/** Returns a zero-copy Uint8Array view over supported byte input. */
export function asUint8Array(value, label = "value")
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

    throw new TypeError(`${label} must be a Uint8Array, ArrayBuffer, or ArrayBuffer view.`);
}

/** Returns an owned copy of supported byte input. */
export function copyBytes(value, label = "value")
{
    return asUint8Array(value, label).slice();
}

/** Copies exactly the visible byte range into a standalone ArrayBuffer. */
export function toArrayBuffer(value, label = "value")
{
    const bytes = asUint8Array(value, label);

    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** Tests whether byte input starts with the complete supplied prefix. */
export function hasBytePrefix(value, prefix)
{
    const bytes = asUint8Array(value, "value");
    const expected = asUint8Array(prefix, "prefix");

    if (bytes.byteLength < expected.byteLength)
    {
        return false;
    }

    for (let index = 0; index < expected.byteLength; index++)
    {
        if (bytes[index] !== expected[index])
        {
            return false;
        }
    }

    return true;
}

/**
 * Reads a fixed-length ASCII tag, as container formats use for chunk names.
 *
 * Missing bytes read as zero rather than throwing, because a truncated tag is
 * a failed match at the call site, not an error in the read.
 *
 * @param {Uint8Array} bytes Source bytes.
 * @param {number} offset Byte offset to read from.
 * @param {number} [length=4] Tag length in bytes.
 * @returns {string} The decoded tag.
 */
export function readFourCc(bytes, offset, length = 4)
{
    let value = "";
    for (let i = 0; i < length; i++) value += String.fromCharCode(bytes[offset + i] || 0);
    return value;
}

// Container formats read fixed-width big- and little-endian integers
// constantly, and every reader had grown its own copy. Missing bytes read as
// zero, matching what the shifting forms already did: `>>> 0` turns the NaN a
// truncated multiply produces back into a number, so only the two flac copies
// that omitted it ever returned NaN, and flac bounds-checks before every read.

/** Reads an unsigned big-endian 16-bit integer. */
export function readU16BE(bytes, offset)
{
    return ((bytes[offset] || 0) << 8) | (bytes[offset + 1] || 0);
}

/** Reads an unsigned little-endian 16-bit integer. */
export function readU16LE(bytes, offset)
{
    return (bytes[offset] || 0) | ((bytes[offset + 1] || 0) << 8);
}

/** Reads an unsigned big-endian 24-bit integer. */
export function readU24BE(bytes, offset)
{
    return ((bytes[offset] || 0) * 0x10000) + ((bytes[offset + 1] || 0) << 8) + (bytes[offset + 2] || 0);
}

/** Reads an unsigned little-endian 24-bit integer. */
export function readU24LE(bytes, offset)
{
    return (bytes[offset] || 0) + ((bytes[offset + 1] || 0) << 8) + ((bytes[offset + 2] || 0) * 0x10000);
}

/** Reads an unsigned big-endian 32-bit integer. */
export function readU32BE(bytes, offset)
{
    return (((bytes[offset] || 0) * 0x1000000)
        + ((bytes[offset + 1] || 0) << 16)
        + ((bytes[offset + 2] || 0) << 8)
        + (bytes[offset + 3] || 0)) >>> 0;
}

/** Reads an unsigned little-endian 32-bit integer. */
export function readU32LE(bytes, offset)
{
    return ((bytes[offset] || 0)
        + ((bytes[offset + 1] || 0) << 8)
        + ((bytes[offset + 2] || 0) << 16)
        + ((bytes[offset + 3] || 0) * 0x1000000)) >>> 0;
}
