/**
 * Synthetic Tr2 effect container builders for self-contained tests.
 *
 * Layout mirrors src/carbon/trinity/resources/HlslEffectRes.js#DoLoad: the
 * tests must run without any game assets (org rule), so a minimal effect
 * header (and, optionally, permutation axes and zero-length shader bodies)
 * is assembled here from the documented field order.
 */

const textEncoder = new TextEncoder();

/**
 * Small append-only little-endian byte writer.
 */
class ByteWriter
{

    constructor()
    {
        this.chunks = [];
        this.length = 0;
    }

    u8(value)
    {
        return this._push(Uint8Array.of(value & 0xff));
    }

    u16(value)
    {
        const bytes = new Uint8Array(2);
        new DataView(bytes.buffer).setUint16(0, value >>> 0, true);
        return this._push(bytes);
    }

    u32(value)
    {
        const bytes = new Uint8Array(4);
        new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
        return this._push(bytes);
    }

    raw(bytes)
    {
        return this._push(bytes);
    }

    toBytes()
    {
        const out = new Uint8Array(this.length);
        let offset = 0;
        for (const chunk of this.chunks)
        {
            out.set(chunk, offset);
            offset += chunk.length;
        }
        return out;
    }

    _push(bytes)
    {
        this.chunks.push(bytes);
        this.length += bytes.length;
        return this;
    }

}

/**
 * Builds a null-terminated UTF-8 string table and records each string's
 * byte offset for use in permutation records.
 *
 * @param {string[]} strings Strings to place in the table (in order, deduped).
 * @returns {{bytes: Uint8Array, offsets: Map<string, number>}} Table bytes and offsets.
 */
function buildStringTable(strings)
{
    const writer = new ByteWriter();
    const offsets = new Map();
    for (const value of strings)
    {
        if (offsets.has(value)) continue;
        offsets.set(value, writer.length);
        writer.raw(textEncoder.encode(value));
        writer.u8(0);
    }
    return { bytes: writer.toBytes(), offsets };
}

/**
 * Builds a synthetic Tr2 effect container: header, string table, optional
 * permutation axes, and one or more compiled-body offset records.
 *
 * @param {object} [options] Effect shape.
 * @param {number} [options.version] Effect data version (8..15 supported).
 * @param {Array<object>} [options.permutations] Permutation axis descriptions.
 * @param {Array<{size?: number, bytes?: Uint8Array}>} [options.bodies] Compiled-body byte ranges.
 * @returns {Uint8Array} Synthetic effect container bytes.
 */
export function buildEffectBytes(options = {})
{
    const version = Number.isInteger(options.version) ? options.version : 8;
    const permutations = options.permutations || [];
    const bodies = options.bodies || [ { size: 0 } ];

    const strings = [];
    for (const permutation of permutations)
    {
        strings.push(permutation.name || "", permutation.description || "");
        for (const option of permutation.options || []) strings.push(option);
    }
    const table = buildStringTable(strings);

    const writer = new ByteWriter();
    writer.u32(version);
    if (version >= 15)
    {
        writer.u32(0);
        writer.raw(new Uint8Array(32));
    }

    writer.u32(table.bytes.length);
    writer.raw(table.bytes);

    writer.u8(permutations.length);
    for (const permutation of permutations)
    {
        writer.u32(table.offsets.get(permutation.name || ""));
        writer.u8(permutation.defaultOption || 0);
        writer.u32(table.offsets.get(permutation.description || ""));
        if (version > 5) writer.u8(permutation.type || 0);
        const permOptions = permutation.options || [];
        writer.u8(permOptions.length);
        for (const option of permOptions) writer.u32(table.offsets.get(option));
    }

    const RECORD_SIZE = 12;
    const offsetTableSize = 4 + bodies.length * RECORD_SIZE;
    let bodyCursor = writer.length + offsetTableSize;

    const records = bodies.map((body, index) =>
    {
        const size = Number.isInteger(body.size) ? body.size : (body.bytes ? body.bytes.length : 0);
        const record = { index, offset: bodyCursor, size };
        bodyCursor += size;
        return record;
    });

    writer.u32(bodies.length);
    for (const record of records)
    {
        writer.u32(record.index);
        writer.u32(record.offset);
        writer.u32(record.size);
    }
    for (let index = 0; index < bodies.length; index += 1)
    {
        const body = bodies[index];
        const size = records[index].size;
        writer.raw(body.bytes || new Uint8Array(size));
    }

    return writer.toBytes();
}

/**
 * Builds a compact v15 effect with one reflected stage and one shader library.
 *
 * The two permutation records contain the same body bytes at distinct source
 * ranges. The stage's authored four-byte default prefix is deliberately
 * shorter than a UINT sampler-index constant at bytes 8..11 so parser
 * realization extends only the compatibility buffer.
 *
 * @returns {Uint8Array} Synthetic effect bytes for portable-reflection tests.
 */
export function buildPortableReflectionEffectBytes()
{
    const strings = [
        "AXIS", "", "A", "B", "Main", "SamplerHeap", "StageFlag",
        "RayGen", "Enabled", "Count", "Weight", "Label", "hello"
    ];
    const table = buildStringTable(strings);
    const tableWriter = new ByteWriter();
    tableWriter.raw(table.bytes);
    const shaderOffset = tableWriter.length;
    tableWriter.raw(Uint8Array.of(0x44, 0x58, 0x42, 0x43));
    const defaultsOffset = tableWriter.length;
    tableWriter.raw(Uint8Array.of(1, 2, 3, 4));
    const libraryOffset = tableWriter.length;
    tableWriter.raw(Uint8Array.of(9, 8, 7, 6));
    const tableBytes = tableWriter.toBytes();

    const body = new ByteWriter();
    body.u8(1);
    body.u32(table.offsets.get("Main"));
    body.u8(1);
    body.u8(1);
    body.u8(0);
    body.u32(4);
    body.u32(shaderOffset);
    body.u32(1).u32(2).u32(3);
    body.u8(1);
    body.u8(0).u8(0).u8(0).u8(0x0f).u8(0).u8(3);
    body.u8(1);
    body.u8(0).u32(0).u32(1).u8(0);
    body.u8(1);
    body.u32(0).u8(0);
    body.u8(0).u8(1).u8(1).u8(1).u8(1).u8(1).u8(1);
    body.u32(0x80000000).u8(4).u8(2).u8(3);
    body.u32(0).u32(0x3f800000);
    body.u32(1);
    body.u32(table.offsets.get("SamplerHeap"));
    body.u32(8).u32(4).u8(2).u8(1).u32(1).u8(0).u8(0);
    body.u32(4).u32(defaultsOffset);
    body.u8(0);
    body.u8(1);
    body.u8(0).u32(table.offsets.get("SamplerHeap"));
    body.u8(0).u8(1).u8(1).u8(1).u8(1).u8(1).u8(1);
    body.u32(0x80000000).u8(4).u8(2);
    body.u32(0).u32(0x3f800000).u32(0x40000000).u32(0x40400000);
    body.u32(0).u32(0x7f800000);
    body.u8(1);
    body.u8(0);
    body.u8(1);
    body.u32(table.offsets.get("StageFlag")).u8(2).u32(0x7fc01234);
    body.u8(2);
    body.u32(22).u32(3);
    body.u32(175).u32(0x3f800000);
    body.u8(1);
    body.u32(8).u32(4).u32(libraryOffset);
    body.u32(1).u8(0).u32(table.offsets.get("RayGen"));
    body.u32(table.offsets.get(""));
    for (let inputIndex = 0; inputIndex < 2; inputIndex += 1)
    {
        body.u8(0).u8(0);
        body.u32(0).u32(0).u32(0);
        body.u8(0).u8(0).u8(0).u8(0);
    }
    body.u16(1);
    body.u32(table.offsets.get("SamplerHeap"));
    body.u8(4);
    body.u32(table.offsets.get("Enabled")).u8(0).u32(1);
    body.u32(table.offsets.get("Count")).u8(1).u32(0xffffffff);
    body.u32(table.offsets.get("Weight")).u8(2).u32(0x7fc01234);
    body.u32(table.offsets.get("Label")).u8(3).u32(table.offsets.get("hello"));
    const bodyBytes = body.toBytes();

    const writer = new ByteWriter();
    writer.u32(15).u32(77);
    writer.raw(Uint8Array.from({ length: 32 }, (_, index) => index));
    writer.u32(tableBytes.length).raw(tableBytes);
    writer.u8(1);
    writer.u32(table.offsets.get("AXIS")).u8(0);
    writer.u32(table.offsets.get("")).u8(0).u8(2);
    writer.u32(table.offsets.get("A")).u32(table.offsets.get("B"));

    const offsetTableSize = 4 + 2 * 12;
    const bodyOffset = writer.length + offsetTableSize;
    writer.u32(2);
    writer.u32(0).u32(bodyOffset).u32(bodyBytes.length);
    writer.u32(1).u32(bodyOffset + bodyBytes.length).u32(bodyBytes.length);
    writer.raw(bodyBytes).raw(bodyBytes);
    return writer.toBytes();
}
