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
