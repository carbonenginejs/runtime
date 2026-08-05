/**
 * Synthetic Carbon WebGPU and DXBC builders for self-contained tests.
 */

const CARBON_WEBGPU_MAGIC = "CWGP";
const CARBON_WEBGPU_VERSION = 1;
const DXBC_MAGIC = [ 0x44, 0x58, 0x42, 0x43 ];
const DXBC_HEADER_SIZE = 32;
const textEncoder = new TextEncoder();

/**
 * Small append-only little-endian byte writer for synthetic Tr2 effect bytes.
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
        new DataView(bytes.buffer).setUint16(0, value & 0xffff, true);
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
 * Builds a Carbon WebGPU package from ordered chunk payloads.
 *
 * @param {Array<[string, string|object|Uint8Array|ArrayBuffer|ArrayBufferView]>} chunks Ordered package chunks.
 * @returns {Uint8Array} Package bytes.
 */
export function buildCarbonWebgpuPackage(chunks)
{
    const encodedChunks = chunks.map(([ tag, value ]) => ({
        tag,
        bytes: normalizeChunkValue(value)
    }));

    const size = CARBON_WEBGPU_MAGIC.length + 8 + encodedChunks.reduce((sum, chunk) => sum + 8 + chunk.bytes.length, 0);
    const out = new Uint8Array(size);
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    let offset = 0;

    offset = writeAscii(out, offset, CARBON_WEBGPU_MAGIC);
    view.setUint32(offset, CARBON_WEBGPU_VERSION, true);
    offset += 4;
    view.setUint32(offset, encodedChunks.length, true);
    offset += 4;

    for (const chunk of encodedChunks)
    {
        offset = writeAscii(out, offset, chunk.tag);
        view.setUint32(offset, chunk.bytes.length, true);
        offset += 4;
        out.set(chunk.bytes, offset);
        offset += chunk.bytes.length;
    }

    return out;
}

/**
 * Encode an instruction opcode token.
 *
 * @param {number} opcode Opcode index (bits 0-10).
 * @param {number} lengthDwords Instruction length in dwords (bits 24-30).
 * @returns {number} The opcode token.
 */
export function opcodeToken(opcode, lengthDwords)
{
    return (opcode & 0x7ff) | ((lengthDwords & 0x7f) << 24);
}

/**
 * Encode a shader program version token.
 *
 * @param {number} programType 0 = pixel, 1 = vertex, 5 = compute.
 * @param {number} major Major shader model version.
 * @param {number} minor Minor shader model version.
 * @returns {number} The version token.
 */
export function versionToken(programType, major, minor)
{
    return ((programType & 0xffff) << 16) | ((major & 0xf) << 4) | (minor & 0xf);
}

/**
 * Build a DXBC container from chunk records.
 *
 * @param {Array<{fourCC: string, payload: Uint8Array}>} chunks Chunk records.
 * @returns {Uint8Array} Container bytes.
 */
export function buildDxbcContainer(chunks)
{
    const offsets = [];
    let cursor = DXBC_HEADER_SIZE + chunks.length * 4;
    for (const chunk of chunks)
    {
        offsets.push(cursor);
        cursor += 8 + chunk.payload.length;
    }

    const bytes = new Uint8Array(cursor);
    const view = new DataView(bytes.buffer);
    bytes.set(DXBC_MAGIC, 0);
    view.setUint32(20, 1, true);
    view.setUint32(24, cursor, true);
    view.setUint32(28, chunks.length, true);

    for (let i = 0; i < chunks.length; i += 1)
    {
        view.setUint32(DXBC_HEADER_SIZE + i * 4, offsets[i], true);
        const { fourCC, payload } = chunks[i];
        for (let c = 0; c < 4; c += 1) bytes[offsets[i] + c] = fourCC.charCodeAt(c);
        view.setUint32(offsets[i] + 4, payload.length, true);
        bytes.set(payload, offsets[i] + 8);
    }
    return bytes;
}

/**
 * Build a minimal vertex-shader SHEX payload.
 *
 * @returns {Uint8Array} SHEX chunk payload bytes.
 */
export function buildMinimalVertexShex()
{
    const DCL_TEMPS = 104;
    const RET = 62;
    const tokens = new Uint32Array([
        versionToken(1, 5, 0),
        6,
        opcodeToken(DCL_TEMPS, 2),
        1,
        opcodeToken(RET, 1),
        opcodeToken(RET, 1)
    ]);
    return new Uint8Array(tokens.buffer.slice(0));
}

/**
 * Build a complete minimal vertex-shader DXBC container.
 *
 * @returns {Uint8Array} Container bytes with a single SHEX chunk.
 */
export function buildMinimalVertexDxbc()
{
    return buildDxbcContainer([ { fourCC: "SHEX", payload: buildMinimalVertexShex() } ]);
}

/**
 * Builds a null-terminated UTF-8 string table and records each string's
 * byte offset for use in permutation records.
 *
 * @param {string[]} strings Strings to place in the table.
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
    // One garbage byte, not zero: the shared container reader rejects a
    // zero-size offset-table row, while a one-byte body loads at the header
    // level and then fails body decode.
    const version = Number.isInteger(options.version) ? options.version : 8;
    const permutations = options.permutations || [];
    const bodies = options.bodies || [ { size: 1 } ];

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
 * Builds one complete synthetic effect with a minimal vertex DXBC stage.
 *
 * @param {object} [options] Optional permutation axes.
 * @param {Array<object>} [options.permutations] Permutation axis descriptions.
 * @param {8|14|15} [options.version] Compiled effect version.
 * @param {1|2} [options.passCount] Number of identical minimal passes.
 * @param {Array<1|2>} [options.bodyPassCounts] Per-permutation pass counts.
 * @param {boolean} [options.distinctBodyRanges] Store aliases at separate ranges.
 * @returns {Uint8Array} Synthetic compiled effect bytes.
 */
export function buildMinimalStagedEffectBytes(options = {})
{
    const version = options.version ?? 8;
    if (![ 8, 14, 15 ].includes(version))
    {
        throw new TypeError("Minimal staged effect version must be 8, 14, or 15");
    }
    const passCount = options.passCount ?? 1;
    if (![ 1, 2 ].includes(passCount))
    {
        throw new TypeError("Minimal staged effect pass count must be 1 or 2");
    }
    const DCL_GLOBAL_FLAGS = 106;
    const DCL_TEMPS = 104;
    const RET = 62;
    const buildStageDxbc = (programType) =>
    {
        const tokens = new Uint32Array([
            versionToken(programType, 5, 0),
            6,
            opcodeToken(DCL_GLOBAL_FLAGS, 1) | (1 << 11),
            opcodeToken(DCL_TEMPS, 2),
            1,
            opcodeToken(RET, 1)
        ]);
        return buildDxbcContainer([ {
            fourCC: "SHEX",
            payload: new Uint8Array(tokens.buffer.slice(0))
        } ]);
    };
    const stages = [ { stageType: 0, dxbc: buildStageDxbc(1) } ];
    const permutations = options.permutations || [];
    const strings = [ "Main" ];
    for (const permutation of permutations)
    {
        strings.push(permutation.name || "", permutation.description || "");
        for (const option of permutation.options || []) strings.push(option);
    }
    const stringTable = buildStringTable(strings);
    const table = new ByteWriter();
    table.raw(stringTable.bytes);
    const mainOffset = stringTable.offsets.get("Main");
    for (const stage of stages)
    {
        stage.dxbcOffset = table.length;
        table.raw(stage.dxbc);
    }

    const buildBody = (bodyPassCount) =>
    {
        const body = new ByteWriter();
        body.u8(1);
        body.u32(mainOffset);
        body.u8(bodyPassCount);
        for (let passIndex = 0; passIndex < bodyPassCount; passIndex += 1)
        {
            body.u8(stages.length);
            for (const stage of stages)
            {
                body.u8(stage.stageType);
                if (version === 8)
                {
                    body.u8(0);
                    body.u32(stage.dxbc.length);
                    body.u32(stage.dxbcOffset);
                    body.u32(0);
                    body.u32(0);
                    body.u32(1);
                    body.u32(1);
                    body.u32(1);
                    body.u32(0);
                    body.u32(0);
                    body.u32(0);
                    body.u8(0);
                    body.u8(0);
                    body.u8(0);
                    body.u8(0);
                }
                else
                {
                    body.u32(stage.dxbc.length);
                    body.u32(stage.dxbcOffset);
                    body.u32(0);
                    body.u32(0);
                    body.u32(0);
                    body.u8(0);
                    body.u8(0);
                    body.u8(0);
                    body.u32(0);
                    body.u32(0);
                    body.u32(0);
                    body.u8(0);
                    body.u8(0);
                    body.u8(0);
                    body.u8(0);
                }
            }
            body.u8(0);
        }
        if (version > 13) body.u8(0);
        body.u16(0);
        return body.toBytes();
    };

    const writer = new ByteWriter();
    writer.u32(version);
    if (version === 15)
    {
        writer.u32(77);
        writer.raw(Uint8Array.from(
            { length: 32 },
            (_, index) => index
        ));
    }
    writer.u32(table.length);
    writer.raw(table.toBytes());
    writer.u8(permutations.length);
    for (const permutation of permutations)
    {
        writer.u32(stringTable.offsets.get(permutation.name || ""));
        writer.u8(permutation.defaultOption || 0);
        writer.u32(stringTable.offsets.get(permutation.description || ""));
        writer.u8(permutation.type || 0);
        const permutationOptions = permutation.options || [];
        writer.u8(permutationOptions.length);
        for (const option of permutationOptions)
        {
            writer.u32(stringTable.offsets.get(option));
        }
    }

    const bodyCount = permutations.reduce(
        (product, permutation) => product * (permutation.options || []).length,
        1
    );
    const bodyPassCounts = options.bodyPassCounts
        ?? Array.from({ length: bodyCount }, () => passCount);
    if (!Array.isArray(bodyPassCounts)
        || bodyPassCounts.length !== bodyCount
        || bodyPassCounts.some((count) => ![ 1, 2 ].includes(count)))
    {
        throw new TypeError(
            "Minimal staged effect bodyPassCounts must contain one 1 or 2 per permutation"
        );
    }
    if (options.distinctBodyRanges !== undefined
        && typeof options.distinctBodyRanges !== "boolean")
    {
        throw new TypeError(
            "Minimal staged effect distinctBodyRanges must be boolean"
        );
    }
    const uniqueBodies = [];
    const bodyByPassCount = new Map();
    const bodyRecords = [];
    for (const bodyPassCount of bodyPassCounts)
    {
        if (options.distinctBodyRanges)
        {
            const bytes = buildBody(bodyPassCount);
            const record = {
                offset: 0,
                byteLength: bytes.byteLength,
                bytes
            };
            uniqueBodies.push(record);
            bodyRecords.push(record);
            continue;
        }
        if (!bodyByPassCount.has(bodyPassCount))
        {
            const bytes = buildBody(bodyPassCount);
            const record = {
                offset: 0,
                byteLength: bytes.byteLength,
                bytes
            };
            bodyByPassCount.set(bodyPassCount, record);
            uniqueBodies.push(record);
        }
        bodyRecords.push(bodyByPassCount.get(bodyPassCount));
    }
    writer.u32(bodyCount);
    let bodyOffset = writer.length + bodyCount * 12;
    for (const body of uniqueBodies)
    {
        body.offset = bodyOffset;
        bodyOffset += body.byteLength;
    }
    for (let index = 0; index < bodyCount; index += 1)
    {
        const body = bodyRecords[index];
        writer.u32(index);
        writer.u32(body.offset);
        writer.u32(body.byteLength);
    }
    for (const body of uniqueBodies) writer.raw(body.bytes);

    return writer.toBytes();
}

function normalizeChunkValue(value)
{
    if (typeof value === "string")
    {
        return textEncoder.encode(value);
    }
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
    if (value && typeof value === "object")
    {
        return textEncoder.encode(`${JSON.stringify(value)}\n`);
    }
    throw new Error("Unsupported Carbon WebGPU chunk value");
}

function writeAscii(out, offset, value)
{
    for (let i = 0; i < value.length; i += 1)
    {
        out[offset + i] = value.charCodeAt(i) & 0xff;
    }
    return offset + value.length;
}
