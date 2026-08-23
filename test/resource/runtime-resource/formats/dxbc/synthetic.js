/**
 * Synthetic DXBC builders for self-contained tests.
 *
 * Layouts mirror src/core/container.js and src/core/program.js: the tests
 * must run without any game assets (org rule), so a minimal vertex shader
 * container is assembled here from the documented token encodings.
 */

const DXBC_MAGIC = [ 0x44, 0x58, 0x42, 0x43 ];
const HEADER_SIZE = 32;

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
 * Encode an operand token with immediate/relative index representations.
 *
 * @param {number} type Operand register-file type.
 * @param {number[]} representations One representation id per index dimension.
 * @param {object} [options] Operand flags.
 * @param {boolean} [options.extended] Whether an extension token follows.
 * @returns {number} Operand token.
 */
export function operandToken(type, representations = [], options = {})
{
    let token = ((type & 0xff) << 12) | ((representations.length & 0x3) << 20);
    for (let index = 0; index < representations.length; index += 1)
    {
        token |= (representations[index] & 0x7) << (22 + index * 3);
    }
    if (options.extended) token |= 0x80000000;
    return token >>> 0;
}

/**
 * Build a SHEX payload from instruction dwords.
 *
 * @param {number[]} instructionTokens Instruction tokens after the program header.
 * @param {object} [options] Program header values.
 * @param {number} [options.programType] Program type id.
 * @param {number} [options.major] Shader-model major version.
 * @param {number} [options.minor] Shader-model minor version.
 * @returns {Uint8Array} SHEX bytes.
 */
export function buildShex(instructionTokens, options = {})
{
    const tokens = new Uint32Array([
        versionToken(options.programType ?? 1, options.major ?? 5, options.minor ?? 0),
        instructionTokens.length + 2,
        ...instructionTokens
    ]);
    return new Uint8Array(tokens.buffer.slice(0));
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
