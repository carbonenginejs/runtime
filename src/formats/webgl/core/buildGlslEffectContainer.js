import {
    buildCarbonEffectContainer
} from "../../../format/carbonEffect/buildCarbonEffectContainer.js";
import { writeGlslBackendBlock } from "./glslBackendBlock.js";

/**
 * The WebGL 2 backend adapter for the shared Carbon container builder.
 *
 * The record layout, the permutation walk and the description mapping are shared
 * with WebGPU and live in `format/carbonEffect/buildCarbonEffectContainer.js`.
 * What remains here is the two backend-varying decisions: a program is GLSL ES
 * 3.00 text, and a pass's trailing block is the GLSL lowering data.
 *
 * There is no entry-point assertion to make. GLSL's entry point is `main` by
 * language rule rather than by our emitter's choice, so unlike WGSL there is
 * nothing a future lowerer could change.
 */

/**
 * Encodes one GLSL stage program.
 *
 * @param {object} shader Translated shader record.
 * @returns {Uint8Array} Program bytes.
 */
function encodeProgram(shader)
{
    return new TextEncoder().encode(shader.code);
}

/**
 * Builds the per-pass backend block for one pass of one translated body.
 *
 * A pass whose stages added no lowering data emits no block at all rather than
 * an empty one, so the description ends where Carbon's would and the optional
 * block stays genuinely optional.
 *
 * @param {object} unit Pass translation unit.
 * @param {string} passKey Enclosing pass key.
 * @returns {Uint8Array|null} Block bytes, or null when the pass has none.
 */
function encodeBackendBlock(unit, passKey)
{
    const stages = unit.block;
    const transforms = (unit.resourceTransforms ?? [])
        .filter((transform) => transform.layoutKey === passKey);

    if (!stages && !transforms.length) return null;

    return writeGlslBackendBlock({ stages: stages ?? {}, transforms });
}

/** The WebGL encoders, as the shared builder's backend argument. */
export const GLSL_CONTAINER_BACKEND = Object.freeze({ encodeProgram, encodeBackendBlock });

/**
 * Builds the complete WebGL 2 effect container.
 *
 * @param {object} effectRes Loaded version-15 `Tr2EffectRes`.
 * @param {object} permutationGraph Validated `PGRF` document.
 * @param {object} backendBodySet Translated GLSL bodies.
 * @param {object} [options] Container options.
 * @param {number[]|Uint8Array} [options.compilerVersion] Four version bytes.
 * @param {string} [options.sourceHash] 32 ASCII hash characters.
 * @returns {{bytes:Uint8Array, permutationCount:number, bodyCount:number}} Container and its body accounting.
 */
export function buildGlslEffectContainer(
    effectRes,
    permutationGraph,
    backendBodySet,
    options = {}
)
{
    return buildCarbonEffectContainer(
        effectRes,
        permutationGraph,
        backendBodySet,
        GLSL_CONTAINER_BACKEND,
        options
    );
}

export default buildGlslEffectContainer;
