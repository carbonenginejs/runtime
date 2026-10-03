// Source: imageio/CcpMetadata.cpp:8-122 (LoadCcpMetadata/SaveCcpMetadata).
// Approved DDS correction: validate body offsets before reading donor strings.
const SIGNATURE = new TextEncoder().encode("CCP-META");

/** Read the optional donor trailer; malformed metadata does not invalidate pixels. */
export function loadCcpMetadata(bytes, offset)
{
    if (!Number.isSafeInteger(offset) || offset < 0 || offset + 20 > bytes.length) return [];
    for (let i = 0; i < 8; i++) if (bytes[offset + i] !== SIGNATURE[i]) return [];
    const header = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.length - offset);
    if (header.getUint32(8, true) !== 1) return [];
    const count = header.getUint32(12, true), size = header.getUint32(16, true);
    if (!count) return [];
    if (count * 16 > size || size > bytes.length - offset - 20) return [];
    const body = bytes.subarray(offset + 20, offset + 20 + size);
    const entries = new DataView(body.buffer, body.byteOffset, body.length);
    const decoder = new TextDecoder(), result = [];
    for (let i = 0; i < count; i++)
    {
        const pair = [];
        for (let field = 0; field < 2; field++)
        {
            const entry = i * 16 + field * 8;
            const start = entries.getUint32(entry, true), length = entries.getUint32(entry + 4, true);
            if (!length || start < count * 16 || start + length > size || body[start + length - 1] !== 0) return [];
            pair.push(decoder.decode(body.subarray(start, start + length - 1)));
        }
        result.push(pair);
    }
    return result;
}

/** Append Carbon's ordered, duplicate-preserving string pairs, encoded as UTF-8. */
export function saveCcpMetadata(writer, metadata)
{
    const encoder = new TextEncoder(), pairs = [];
    let size = metadata.length * 16;
    for (const pair of metadata)
    {
        if (!Array.isArray(pair) || pair.length !== 2 || pair.some(value => typeof value !== "string"))
            throw new TypeError("CCP metadata requires string pairs");
        const key = encoder.encode(pair[0]), value = encoder.encode(pair[1]);
        pairs.push([key, value]);
        size += key.length + value.length + 2;
    }
    if (!Number.isSafeInteger(size) || size > 0xffffffff) throw new RangeError("CCP metadata exceeds its 32-bit body size");
    writer.bytes(SIGNATURE); writer.u32(1); writer.u32(pairs.length); writer.u32(size);
    let offset = pairs.length * 16;
    for (const pair of pairs)
    for (const text of pair)
    {
        writer.u32(offset); writer.u32(text.length + 1);
        offset += text.length + 1;
    }
    for (const pair of pairs)
    for (const text of pair)
    {
        writer.bytes(text); writer.u8(0);
    }
}
