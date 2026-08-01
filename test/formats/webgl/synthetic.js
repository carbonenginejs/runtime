/**
 * Synthetic DXBC and CEWG builders for self-contained tests.
 *
 * The DXBC layouts mirror the sibling `formats/dxbc` container/program
 * encoding (copied from that package's own `test/synthetic.js`); the CEWG
 * builder mirrors `src/core/cewg/CewgPackage.js`'s chunk layout. Tests must
 * run without any game assets (org rule), so containers/packages are
 * assembled here from the documented token/chunk encodings only.
 */

const DXBC_MAGIC = [ 0x44, 0x58, 0x42, 0x43 ];
const HEADER_SIZE = 32;
const textEncoder = new TextEncoder();

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
        const output = new Uint8Array(this.length);
        let offset = 0;

        for (const chunk of this.chunks)
        {
            output.set(chunk, offset);
            offset += chunk.length;
        }

        return output;
    }

    _push(bytes)
    {
        this.chunks.push(bytes);
        this.length += bytes.length;
        return this;
    }

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
export function buildContainer(chunks)
{
    const offsets = [];
    let cursor = HEADER_SIZE + chunks.length * 4;
    for (const chunk of chunks)
    {
        offsets.push(cursor);
        cursor += 8 + chunk.payload.length;
    }

    const bytes = new Uint8Array(cursor);
    const view = new DataView(bytes.buffer);
    bytes.set(DXBC_MAGIC, 0);
    // checksum bytes 4..19 stay zero
    view.setUint32(20, 1, true);            // version
    view.setUint32(24, cursor, true);       // totalSize
    view.setUint32(28, chunks.length, true);

    for (let i = 0; i < chunks.length; i += 1)
    {
        view.setUint32(HEADER_SIZE + i * 4, offsets[i], true);
        const { fourCC, payload } = chunks[i];
        for (let c = 0; c < 4; c += 1) bytes[offsets[i] + c] = fourCC.charCodeAt(c);
        view.setUint32(offsets[i] + 4, payload.length, true);
        bytes.set(payload, offsets[i] + 8);
    }
    return bytes;
}

/**
 * Build a minimal vertex-shader SHEX payload: dcl_temps 1 then ret.
 *
 * @returns {Uint8Array} SHEX chunk payload bytes.
 */
export function buildMinimalVertexShex()
{
    const DCL_TEMPS = 104;
    const RET = 62;
    const tokens = new Uint32Array([
        versionToken(1, 5, 0),
        6,                          // program length in dwords, including this header
        opcodeToken(DCL_TEMPS, 2),
        1,                          // temp count
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
    return buildContainer([ { fourCC: "SHEX", payload: buildMinimalVertexShex() } ]);
}

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
 * Builds one complete synthetic effect with a minimal vertex DXBC stage.
 *
 * @param {object} [options] Optional effect shape.
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
        return buildContainer([ {
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

/**
 * Build a minimal geometry-stage SHEX payload: just `ret`. Geometry is not
 * one of the WebGL2 emitter's supported stages (vertex/pixel/compute), so
 * this is used to exercise the emitter's stage-rejection path.
 *
 * @returns {Uint8Array} SHEX chunk payload bytes.
 */
export function buildMinimalGeometryShex()
{
    const RET = 62;
    const tokens = new Uint32Array([
        versionToken(2, 5, 0), // 2 = geometry
        3,                     // program length in dwords, including this header
        opcodeToken(RET, 1)
    ]);
    return new Uint8Array(tokens.buffer.slice(0));
}

/**
 * Build a complete minimal geometry-shader DXBC container.
 *
 * @returns {Uint8Array} Container bytes with a single SHEX chunk.
 */
export function buildMinimalGeometryDxbc()
{
    return buildContainer([ { fourCC: "SHEX", payload: buildMinimalGeometryShex() } ]);
}

/**
 * Build a pixel-shader SHEX payload declaring one pixel-stage structured buffer
 * (`dcl_resource_structured t<register>`), mirroring the tiled light index/data
 * buffers. The emitter lowers this to a `usampler2D sb<register>` data texture
 * unless the register is listed in `stubResourceRegisters`.
 *
 * @param {number} [register=5] SRV (t#) register index.
 * @param {number} [stride=4] Structure byte stride.
 * @returns {Uint8Array} SHEX chunk payload bytes.
 */
export function buildStructuredBufferPixelShex(register = 5, stride = 4)
{
    const DCL_TEMPS = 104;
    const DCL_RESOURCE_STRUCTURED = 162;
    const RET = 62;
    // Resource operand: four-component mode, mask 0xF, type 7 (resource/SRV),
    // one immediate index dimension (the register number).
    const resourceOperand = 2 | (0 << 2) | (0xF << 4) | (7 << 12) | (1 << 20);
    const tokens = new Uint32Array([
        versionToken(0, 5, 0),      // 0 = pixel
        9,                          // program length in dwords, including this header
        opcodeToken(DCL_TEMPS, 2), 1,
        opcodeToken(DCL_RESOURCE_STRUCTURED, 4), resourceOperand, register, stride,
        opcodeToken(RET, 1)
    ]);
    return new Uint8Array(tokens.buffer.slice(0));
}

/**
 * Build a complete pixel-shader DXBC container with one structured buffer.
 *
 * @param {number} [register=5] SRV (t#) register index.
 * @param {number} [stride=4] Structure byte stride.
 * @returns {Uint8Array} Container bytes with a single SHEX chunk.
 */
export function buildStructuredBufferPixelDxbc(register = 5, stride = 4)
{
    return buildContainer([ { fourCC: "SHEX", payload: buildStructuredBufferPixelShex(register, stride) } ]);
}

/**
 * Build a pixel-shader SHEX payload declaring one sampled resource
 * (`dcl_resource t<register>`), mirroring the light-profile sampler array. The
 * emitter lowers this to a `sampler<dimension> s<register>` uniform unless the
 * register is listed in `stubResourceRegisters`.
 *
 * @param {number} [register=6] SRV (t#) register index.
 * @param {number} [dimension=8] DXBC resource dimension (8 = texture2darray).
 * @returns {Uint8Array} SHEX chunk payload bytes.
 */
export function buildResourcePixelShex(register = 6, dimension = 8)
{
    const DCL_TEMPS = 104;
    const DCL_RESOURCE = 88;
    const RET = 62;
    const resourceOperand = 2 | (0 << 2) | (0xF << 4) | (7 << 12) | (1 << 20);
    const tokens = new Uint32Array([
        versionToken(0, 5, 0),      // 0 = pixel
        9,                          // program length in dwords, including this header
        opcodeToken(DCL_TEMPS, 2), 1,
        // dcl_resource: dimension in bits 11-15, then the t# operand, then the
        // return-type token (0x5555 = float x4).
        opcodeToken(DCL_RESOURCE, 4) | (dimension << 11), resourceOperand, register, 0x5555,
        opcodeToken(RET, 1)
    ]);
    return new Uint8Array(tokens.buffer.slice(0));
}

/**
 * Build a complete pixel-shader DXBC container with one sampled resource.
 *
 * @param {number} [register=6] SRV (t#) register index.
 * @param {number} [dimension=8] DXBC resource dimension (8 = texture2darray).
 * @returns {Uint8Array} Container bytes with a single SHEX chunk.
 */
export function buildResourcePixelDxbc(register = 6, dimension = 8)
{
    return buildContainer([ { fourCC: "SHEX", payload: buildResourcePixelShex(register, dimension) } ]);
}

/**
 * Builds a pixel shader that comparison-samples t1 with s2 and writes the
 * scalar result to r0. The reference value is r0.w; no real texture data is
 * required because emitter tests inspect/compile the generated source only.
 *
 * @param {number} [dimension=3] DXBC resource dimension (3=2D, 6=cube, 8=2D array).
 * @param {"sample_c"|"sample_c_lz"} [opcodeName="sample_c_lz"] Comparison opcode.
 * @param {number} [destinationMask=1] Destination write mask bits.
 * @returns {Uint8Array} Complete synthetic pixel-shader DXBC container.
 */
export function buildComparisonSamplePixelDxbc(dimension = 3, opcodeName = "sample_c_lz", destinationMask = 1)
{
    const DCL_RESOURCE = 88;
    const DCL_SAMPLER = 90;
    const DCL_TEMPS = 104;
    const RET = 62;
    const SAMPLE_C = 70;
    const SAMPLE_C_LZ = 71;
    const sampleOpcode = opcodeName === "sample_c" ? SAMPLE_C : SAMPLE_C_LZ;

    const tempDestination = 2 | (0 << 2) | (destinationMask << 4) | (0 << 12) | (1 << 20);
    const tempSwizzleXyzw = 2 | (1 << 2) | (0xE4 << 4) | (0 << 12) | (1 << 20);
    const tempSelectW = 2 | (2 << 2) | (3 << 4) | (0 << 12) | (1 << 20);
    const resourceSwizzleXyzw = 2 | (1 << 2) | (0xE4 << 4) | (7 << 12) | (1 << 20);
    const samplerSwizzleXyzw = 2 | (1 << 2) | (0xE4 << 4) | (6 << 12) | (1 << 20);

    const tokens = new Uint32Array([
        versionToken(0, 5, 0),
        23,
        opcodeToken(DCL_TEMPS, 2), 1,
        opcodeToken(DCL_RESOURCE, 4) | (dimension << 11), resourceSwizzleXyzw, 1, 0x5555,
        opcodeToken(DCL_SAMPLER, 3), samplerSwizzleXyzw, 2,
        opcodeToken(sampleOpcode, 11),
        tempDestination, 0,
        tempSwizzleXyzw, 0,
        resourceSwizzleXyzw, 1,
        samplerSwizzleXyzw, 2,
        tempSelectW, 0,
        opcodeToken(RET, 1)
    ]);

    return buildContainer([ { fourCC: "SHEX", payload: new Uint8Array(tokens.buffer.slice(0)) } ]);
}

/**
 * Build a pixel-shader SHEX payload declaring one structured buffer and reading
 * row 0 via `ld_structured r0.xyzw, index, offset=0, t#`.
 *
 * @param {number} [register=5] SRV (t#) register index.
 * @param {number} [stride=48] Structure byte stride.
 * @param {number} [index=1] Immediate structure index.
 * @returns {Uint8Array} SHEX chunk payload bytes.
 */
export function buildStructuredLoadPixelShex(register = 5, stride = 48, index = 1)
{
    const DCL_TEMPS = 104;
    const DCL_RESOURCE_STRUCTURED = 162;
    const LD_STRUCTURED = 167;
    const RET = 62;
    const tempMaskXyzw = 2 | (0 << 2) | (0xF << 4) | (0 << 12) | (1 << 20);
    const resourceSwizzleXyzw = 2 | (1 << 2) | (0xE4 << 4) | (7 << 12) | (1 << 20);
    const immediate32 = 1 | (4 << 12);
    const tokens = new Uint32Array([
        versionToken(0, 5, 0),
        18,
        opcodeToken(DCL_TEMPS, 2), 1,
        opcodeToken(DCL_RESOURCE_STRUCTURED, 4), resourceSwizzleXyzw, register, stride,
        opcodeToken(LD_STRUCTURED, 9),
        tempMaskXyzw, 0,
        immediate32, index,
        immediate32, 0,
        resourceSwizzleXyzw, register,
        opcodeToken(RET, 1)
    ]);
    return new Uint8Array(tokens.buffer.slice(0));
}

/**
 * Build a complete pixel-shader DXBC container with one structured load.
 *
 * @param {number} [register=5] SRV (t#) register index.
 * @param {number} [stride=48] Structure byte stride.
 * @param {number} [index=1] Immediate structure index.
 * @returns {Uint8Array} Container bytes with a single SHEX chunk.
 */
export function buildStructuredLoadPixelDxbc(register = 5, stride = 48, index = 1)
{
    return buildContainer([ { fourCC: "SHEX", payload: buildStructuredLoadPixelShex(register, stride, index) } ]);
}

/**
 * Build a compute-shader SHEX payload that stores twice to one typed UAV
 * whose address register (`r0`) is never written by a constant `mov`: the
 * emitter's UAV-store pre-pass must reject it as not map-style (a dynamic
 * multi-slice store for a texture2darray UAV, a plain multi-store for any
 * other dimension).
 *
 * @param {number} resourceDimension DXBC resource dimension for the UAV
 *   declaration (8 = texture2darray, 3 = texture2d).
 * @returns {Uint8Array} SHEX chunk payload bytes.
 */
export function buildDoubleStoreComputeShex(resourceDimension)
{
    const DCL_TEMPS = 104;
    const DCL_THREAD_GROUP = 155;
    const DCL_UAV_TYPED = 156;
    const STORE_UAV_TYPED = 164;
    const RET = 62;
    // Operand tokens: bits 0-1 component-count mode (2 = four components),
    // bits 2-3 selection mode (0 = mask, 1 = swizzle), bits 4-11 mask/swizzle
    // bits, bits 12-19 operand type (0 = temp, 30 = UAV), bits 20-21 index
    // dimension count, bits 22-24 first index representation (0 = imm32).
    const uavMaskXyzw = 2 | (0 << 2) | (0xF << 4) | (30 << 12) | (1 << 20);
    const tempSwizzleXyzw = 2 | (1 << 2) | (0xE4 << 4) | (0 << 12) | (1 << 20);
    const store = [
        opcodeToken(STORE_UAV_TYPED, 7),
        uavMaskXyzw, 0,      // u0.xyzw
        tempSwizzleXyzw, 0,  // r0.xyzw address (slice component never constant)
        tempSwizzleXyzw, 0   // r0.xyzw value
    ];
    const tokens = new Uint32Array([
        versionToken(5, 5, 0),
        27,                          // program length in dwords, including this header
        opcodeToken(DCL_THREAD_GROUP, 4), 8, 8, 1,
        opcodeToken(DCL_TEMPS, 2), 1,
        // dcl_unordered_access_view_typed: dimension in bits 11-15, then the
        // u0 operand, then the return-type token (0x5555 = float x4).
        opcodeToken(DCL_UAV_TYPED, 4) | (resourceDimension << 11), uavMaskXyzw, 0, 0x5555,
        ...store,
        ...store,
        opcodeToken(RET, 1)
    ]);
    return new Uint8Array(tokens.buffer.slice(0));
}

/**
 * Build a complete double-store compute-shader DXBC container.
 *
 * @param {number} resourceDimension DXBC resource dimension for the UAV declaration.
 * @returns {Uint8Array} Container bytes with a single SHEX chunk.
 */
export function buildDoubleStoreComputeDxbc(resourceDimension)
{
    return buildContainer([ { fourCC: "SHEX", payload: buildDoubleStoreComputeShex(resourceDimension) } ]);
}

/**
 * Appends ASCII text to a byte array.
 *
 * @param {number[]} out Output byte array.
 * @param {string} value ASCII text.
 */
function pushAscii(out, value)
{
    for (let i = 0; i < value.length; i += 1)
    {
        out.push(value.charCodeAt(i));
    }
}

/**
 * Appends a four-character ASCII chunk tag to a byte array.
 *
 * @param {number[]} out Output byte array.
 * @param {string} value Four-character ASCII chunk tag.
 */
function pushTag(out, value)
{
    if (value.length !== 4)
    {
        throw new Error(`CEWG chunk tag must be four characters: ${value}`);
    }
    pushAscii(out, value);
}

/**
 * Appends a little-endian uint32 to a byte array.
 *
 * @param {number[]} out Output byte array.
 * @param {number} value Unsigned value.
 */
function pushU32(out, value)
{
    out.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

/**
 * Normalizes one chunk payload to bytes: strings are UTF-8 encoded, plain
 * objects are JSON-encoded (mirroring `CewgPackageBuilder`'s own chunk-value
 * handling), and byte buffers/views pass through.
 *
 * @param {string|object|Uint8Array|ArrayBuffer|ArrayBufferView} value Chunk payload.
 * @returns {Uint8Array} Payload bytes.
 */
function toChunkBytes(value)
{
    if (typeof value === "string") return new TextEncoder().encode(value);
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    if (value && typeof value === "object") return new TextEncoder().encode(`${JSON.stringify(value)}\n`);
    throw new Error("Unsupported CEWG chunk value");
}

/**
 * Build a CEWG v1 package (magic + version + chunk directory) directly from
 * chunk tag/payload pairs, independent of `CewgPackageBuilder` — this is the
 * container-format cross-check used by the CEWG round-trip test.
 *
 * @param {Array<[string, string|object|Uint8Array|ArrayBuffer|ArrayBufferView]>} chunks
 *   Ordered [tag, payload] pairs.
 * @returns {Uint8Array} Package bytes.
 */
export function buildCewgPackage(chunks)
{
    const out = [];
    pushAscii(out, "CEWG");
    pushU32(out, 1);
    pushU32(out, chunks.length);

    for (const [ tag, value ] of chunks)
    {
        const bytes = toChunkBytes(value);
        pushTag(out, tag);
        pushU32(out, bytes.length);
        for (const byte of bytes) out.push(byte);
    }

    return Uint8Array.from(out);
}

/**
 * Build a vertex-shader SHEX payload declaring one constant buffer
 * (`dcl_constant_buffer cb<register>[<sizeInVec4>]`).
 *
 * @param {number} [register=4] Constant-buffer (b#) register index.
 * @param {number} [sizeInVec4=27] Buffer size in float4 registers.
 * @returns {Uint8Array} SHEX chunk payload bytes.
 */
export function buildConstantBufferVertexShex(register = 4, sizeInVec4 = 27)
{
    const DCL_TEMPS = 104;
    const DCL_CONSTANT_BUFFER = 89;
    const RET = 62;
    // Constant-buffer operand: four-component mode, mask 0xF, type 8
    // (constant_buffer), TWO immediate index dimensions - the register number
    // and the size in float4 registers.
    const constantBufferOperand = 2 | (0 << 2) | (0xF << 4) | (8 << 12) | (2 << 20);
    const tokens = new Uint32Array([
        versionToken(1, 5, 0),      // 1 = vertex
        8,                          // program length in dwords, including this header
        opcodeToken(DCL_TEMPS, 2), 1,
        opcodeToken(DCL_CONSTANT_BUFFER, 4), constantBufferOperand, register, sizeInVec4,
        opcodeToken(RET, 1)
    ]);
    return new Uint8Array(tokens.buffer.slice(0));
}

/**
 * Build a complete vertex-shader DXBC container with one constant buffer.
 *
 * @param {number} [register=4] Constant-buffer (b#) register index.
 * @param {number} [sizeInVec4=27] Buffer size in float4 registers.
 * @returns {Uint8Array} Container bytes with a single SHEX chunk.
 */
export function buildConstantBufferVertexDxbc(register = 4, sizeInVec4 = 27)
{
    return buildContainer([ { fourCC: "SHEX", payload: buildConstantBufferVertexShex(register, sizeInVec4) } ]);
}

/**
 * Builds a pixel shader declaring and sampling three 2D textures, standing in
 * for `Detail1Map`/`Detail2Map`/`Detail3Map` at consecutive registers.
 *
 * Used to prove the detail-map array merge: without it the emitter declares
 * three `sampler2D` uniforms, and with it one `sampler2DArray` sampled at three
 * literal layers.
 *
 * @param {number[]} [registers=[3,4,5]] SRV (t#) register indexes, in layer order.
 * @returns {Uint8Array} Complete synthetic pixel-shader DXBC container.
 */
export function buildDetailMapPixelDxbc(registers = [ 3, 4, 5 ])
{
    const DCL_RESOURCE = 88;
    const DCL_SAMPLER = 90;
    const DCL_TEMPS = 104;
    const RET = 62;
    const SAMPLE = 69;
    const TEXTURE_2D = 3;

    const tempDestination = 2 | (0 << 2) | (0xF << 4) | (0 << 12) | (1 << 20);
    const tempSwizzleXyzw = 2 | (1 << 2) | (0xE4 << 4) | (0 << 12) | (1 << 20);
    const resourceSwizzleXyzw = 2 | (1 << 2) | (0xE4 << 4) | (7 << 12) | (1 << 20);
    const samplerSwizzleXyzw = 2 | (1 << 2) | (0xE4 << 4) | (6 << 12) | (1 << 20);

    const declarations = [];
    for (const register of registers)
    {
        declarations.push(
            opcodeToken(DCL_RESOURCE, 4) | (TEXTURE_2D << 11), resourceSwizzleXyzw, register, 0x5555
        );
    }

    const samples = [];
    for (const register of registers)
    {
        samples.push(
            opcodeToken(SAMPLE, 9),
            tempDestination, 0,
            tempSwizzleXyzw, 0,
            resourceSwizzleXyzw, register,
            samplerSwizzleXyzw, 0
        );
    }

    const body = [
        opcodeToken(DCL_TEMPS, 2), 1,
        ...declarations,
        opcodeToken(DCL_SAMPLER, 3), samplerSwizzleXyzw, 0,
        ...samples,
        opcodeToken(RET, 1)
    ];

    const tokens = new Uint32Array([ versionToken(0, 5, 0), body.length + 2, ...body ]);
    return buildContainer([ { fourCC: "SHEX", payload: new Uint8Array(tokens.buffer.slice(0)) } ]);
}
