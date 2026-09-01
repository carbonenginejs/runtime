import { CjsFormatReadError } from "../CjsFormatError.js";

/**
 * Which backend a per-pass block belongs to.
 *
 * The container diverges by backend at exactly one place — the optional
 * per-pass backend block — and until this byte existed a block could not say
 * what it was. Both writers emitted a leading `1` meaning unrelated things, so
 * telling a WebGL2 block from a WebGPU one relied on the caller already knowing,
 * which is not identification.
 *
 * **`0` is deliberately not a backend.** Absent, truncated, or zero-filled data
 * must not read as a valid one; that is the failure mode this byte exists to
 * make impossible.
 *
 * Reserved numbers cost nothing, so they are assigned now rather than argued
 * about later. `webgl1` and `opengl` will most likely never emit a block at
 * all: a backend records one only where its lowering is NOT purely
 * conventional. OpenGL lowered without any such block because the same rule
 * applied to every shader, so the runtime applied it without being told. Ours
 * varies per effect — which resources became data textures, which detail maps
 * merged into which array layer, whether local lights were packed or dropped —
 * and none of that is derivable from the shader.

 */
export const CARBON_BACKEND_ENGINE_ID = Object.freeze({
    invalid: 0,
    webgl2: 1,
    webgpu: 2,
    webgl1: 3,
    opengl: 4
});

/** Wire value to name, for error messages. */
const TYPE_NAMES = Object.freeze(
    Object.fromEntries(Object.entries(CARBON_BACKEND_ENGINE_ID).map(([ name, value ]) => [ value, name ]))
);

/**
 * Reads a block's engine id without consuming it or validating it.
 *
 * This is how a CONTAINER reader stays tolerant. Loading a container must never
 * depend on being able to use its backend blocks: CCP's own dx11, dx12 and metal
 * containers are Carbon-shaped and carry no block at all, and a dx11 container
 * must load here even though nothing in this library can execute its programs.
 * The same must hold for a block belonging to a sibling backend — a WebGPU block
 * met by the WebGL2 reader means "not for this engine", not "corrupt file".
 *
 * So the container peeks, and only calls the matching parser. The hard failure
 * in `readBackendEngineId` then applies exactly where it should: to a caller
 * that has already committed to parsing this block as a specific backend.
 *
 * @param {Uint8Array} bytes Block bytes.
 * @returns {number} The declared engine id, or `invalid` when unreadable.
 */
export function peekBackendEngineId(bytes)
{
    return bytes && bytes.length ? bytes[0] : CARBON_BACKEND_ENGINE_ID.invalid;
}

/**
 * Reads and validates a block's leading type byte.
 *
 * A block that does not identify as the backend the caller is parsing is a hard
 * error, never a skip. The caller has already decided which parser to run from
 * the resource path, so a mismatch means the two disagree about what the file
 * is — and continuing would misparse structurally valid bytes into plausible
 * nonsense.
 *
 * No version byte follows. Carbon's container version is the only version.
 *
 * Consumers split two ways, and neither wants one. ccpwgl builds a container and
 * reads it back in the same process (`Tw2EffectRes` calls `buildEffect` then
 * `read` on the result), so writer and reader are always the same build.
 * The runtime WebGPU harness does consume a stored container file named on its
 * command line, but that file is a disposable operator-built input regenerated
 * on demand, not a shipped asset, and a skew there already fails at the CONTAINER
 * magic long before any block is parsed. A per-block version would not have
 * caught it.
 *
 * A block from a different build is caught by the trailing-byte check at the end
 * of each reader, and the remedy is to rebuild the package.
 *
 * @param {object} reader Byte reader positioned at the start of the block.
 * @param {number} expected Expected `CARBON_BACKEND_ENGINE_ID` value.
 * @param {string} source Source name for error details.
 * @returns {number} The type that was read.
 */
export function readBackendEngineId(reader, expected, source)
{
    const type = reader.ReadUint8();

    if (type !== expected)
    {
        throw new CjsFormatReadError(
            `Backend block declares type ${type} (${TYPE_NAMES[type] ?? "unknown"}) `
            + `but was parsed as ${TYPE_NAMES[expected]}`,
            { source, type, expected }
        );
    }

    return type;
}
