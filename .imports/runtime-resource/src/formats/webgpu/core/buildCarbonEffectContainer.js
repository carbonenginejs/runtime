import { writeBackendBlock } from "../../../format/carbonEffect/index.js";
import {
    buildCarbonEffectContainer as buildContainer
} from "../../../format/carbonEffect/buildCarbonEffectContainer.js";

/**
 * The WebGPU backend adapter for the shared Carbon container builder.
 *
 * Everything about the record layout, the permutation walk and the description
 * mapping lives in `format/carbonEffect/buildCarbonEffectContainer.js` and is
 * shared with WebGL. What remains here is the two things that are genuinely
 * WGSL: how a program becomes bytes, and what a pass's trailing block contains.
 *
 * The block carries bind-group layouts and resource transforms. Neither is
 * derivable from Carbon reflection - Carbon records the D3D binding model, while
 * `(group, binding, visibility, generatedSymbol)` comes from the lowered IR.
 */

/**
 * The entry-point name every WGSL lowerer emits.
 *
 * Carbon's `StageInput` has no entry-point field, so the container can only omit
 * one if it is a constant of our emitter rather than data. It is: all thirteen
 * `lower*Program` modules write `entryPoint: "main"` literally. Measured constant
 * across 626 shaders in seven effects — but measurement only shows it holds
 * today, so the substitution asserts it. A future lowerer that picks a different
 * name fails the build instead of silently emitting a container whose programs
 * cannot be found.
 */
export const WGSL_ENTRY_POINT = "main";

/**
 * Encodes one WGSL stage program.
 *
 * `sourceMap` is deliberately dropped. Its offsets index DXBC bytes, which this
 * container does not carry, so it is a translator diagnostic rather than
 * payload. It was separately measured to suppress no sharing, so keeping it
 * would buy nothing either.
 *
 * @param {object} shader Translated shader record.
 * @returns {Uint8Array} Program bytes.
 */
function encodeProgram(shader)
{
    if (shader.entryPoint !== WGSL_ENTRY_POINT)
    {
        throw new Error(
            `WGSL shader ${shader.key} has entry point "${shader.entryPoint}"; `
            + `the container omits the name because every lowerer emits "${WGSL_ENTRY_POINT}"`
        );
    }

    return new TextEncoder().encode(shader.code);
}

/**
 * Builds the per-pass backend block for one pass of one translated body.
 *
 * @param {object} unit Pass translation unit.
 * @param {string} passKey Enclosing pass key.
 * @returns {Uint8Array|null} Block bytes, or null when the pass has no layout.
 */
function encodeBackendBlock(unit, passKey)
{
    const layout = unit.layouts.find((entry) => entry.key === passKey);
    if (!layout) return null;

    return writeBackendBlock({
        bindGroups: layout.bindGroups,
        transforms: (unit.resourceTransforms ?? [])
            .filter((transform) => transform.layoutKey === passKey)
    });
}

/** The WebGPU encoders, as the shared builder's backend argument. */
export const WGSL_CONTAINER_BACKEND = Object.freeze({ encodeProgram, encodeBackendBlock });

/**
 * Builds the complete WebGPU effect container.
 *
 * @param {object} effectRes Loaded version-15 `Tr2EffectRes`.
 * @param {object} permutationGraph Validated derived `CJS_EFFECT_PERMUTATION_GRAPH` document (no chunk is stored).
 * @param {object} backendBodySet Translated backend bodies.
 * @param {object} [options] Container options.
 * @param {number} [options.version] Container data version to emit; defaults to
 *     the current version. Independent of the source effect's version.
 * @param {number[]|Uint8Array} [options.compilerVersion] Four version bytes.
 * @param {string} [options.sourceHash] 32 ASCII hash characters.
 * @returns {{bytes:Uint8Array, permutationCount:number, bodyCount:number}} Container and its body accounting.
 */
export function buildCarbonEffectContainer(
    effectRes,
    permutationGraph,
    backendBodySet,
    options = {}
)
{
    return buildContainer(
        effectRes,
        permutationGraph,
        backendBodySet,
        WGSL_CONTAINER_BACKEND,
        options
    );
}

export default buildCarbonEffectContainer;
