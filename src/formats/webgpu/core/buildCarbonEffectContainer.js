import {
    CjsCarbonEffectWriter,
    carbonDescriptionFromPortable,
    writeBackendBlock
} from "../../../format/carbonEffect/index.js";
import { buildEffectBodyReflection } from "../../hlsl/core/portableReflection.js";

/**
 * Assembles the WebGPU effect container: Carbon's v15 record layout carrying
 * WGSL where a shipped file carries DXBC.
 *
 * The Carbon record layout is shared across backends. CEWGPU replaces stage
 * program bytes with WGSL or an empty slot and adds one optional trailing block
 * per pass. The portable-to-Carbon mapping retains representable non-program
 * fields; non-dynamic sampler names are unrecoverable and stage order is
 * canonicalized.
 */

/**
 * There is no envelope, no magic and no version of our own. That is deliberate.
 *
 * A twelve-byte prefix (`magic | containerVersion | payloadKind`) was carried
 * here and has been removed, along with a proposed "v16" for this variant.
 * Neither survived the only question worth asking of an addition: what breaks
 * without it?
 *
 * - `payloadKind` is redundant with the directory the file came from. CEWGPU
 *   identity belongs to the `effect.webgpu/` resource path; `.cewg` remains a
 *   separate CEWG chunk format.
 * - The magic only distinguished our file from a Carbon one, which the same
 *   directory already answers, and which the file *name* answers too.
 * - A version of our own would have claimed a number CCP owns, in the one field
 *   whose job is telling a reader how to parse. A real v16 from them would then
 *   collide with ours.
 *
 * What remains is a bare Carbon v15 record file. `CewgpuContainer` reads it and
 * the shared record reader detects the per-pass block from the description's
 * declared end. Direct `Tr2EffectRes` hydration remains an adapter boundary:
 * a Carbon description tree is not the portable reflection envelope consumed
 * by `Tr2Shader.fromPortable`.
 *
 * The one addition that does survive the question is the block itself: WebGPU
 * bind-group layouts come from the lowered IR and are not derivable from Carbon
 * reflection, so without it there is no binding topology and no pipeline.
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
 * Builds the per-pass backend block for one pass of one translated body.
 *
 * @param {object} unit Pass translation unit.
 * @param {string} passKey Enclosing pass key.
 * @returns {Uint8Array|null} Block bytes, or null when the pass has no layout.
 */
function backendBlockFor(unit, passKey)
{
    const layout = unit.layouts.find((entry) => entry.key === passKey);
    if (!layout) return null;

    return writeBackendBlock({
        bindGroups: layout.bindGroups,
        transforms: (unit.resourceTransforms ?? [])
            .filter((transform) => transform.layoutKey === passKey)
    });
}

/**
 * Maps one body's translated passes by pass key.
 *
 * @param {object} body Backend body-set record.
 * @param {Map<string, object>} unitsByKey Units indexed by key.
 * @returns {Map<string, object>} Units indexed by pass key.
 */
function unitsByPassKey(body, unitsByKey)
{
    const result = new Map();
    for (const pass of body.passes ?? [])
    {
        result.set(pass.passKey, unitsByKey.get(pass.unitKey));
    }
    return result;
}

/**
 * Builds one body's Carbon description record tree with WGSL substituted in.
 *
 * A body the translator could not lower retains its representable non-program
 * description fields and carries zero-length programs. Emitting empty
 * `shaderData` says exactly what the wire knows: no backend program was stored.
 * Full portable source reflection remains in the in-memory build result, not
 * in this emitted body.
 *
 * @param {object} effectRes Loaded version-15 `Tr2EffectRes`.
 * @param {number} permutationIndex Representative permutation for this body.
 * @param {Map<string, object>|null} passUnits Units by pass key, or null when unsupported.
 * @returns {object} Description record tree.
 */
function describeBody(effectRes, permutationIndex, passUnits)
{
    const reflection = buildEffectBodyReflection(effectRes, permutationIndex);

    if (!passUnits)
    {
        return carbonDescriptionFromPortable(reflection, {
            programFor: () => ({ bytes: new Uint8Array(0), size: 0 })
        });
    }

    return carbonDescriptionFromPortable(reflection, {
        programFor: (stage, context) =>
        {
            const unit = passUnits.get(context.passKey);
            const shader = unit?.shaders.find(
                (entry) => entry.key === `${context.passKey}.${stage.stageName}`
            );

            if (!shader) return { bytes: new Uint8Array(0), size: 0 };

            if (shader.entryPoint !== WGSL_ENTRY_POINT)
            {
                throw new Error(
                    `WGSL shader ${shader.key} has entry point "${shader.entryPoint}"; `
                    + `the container omits the name because every lowerer emits "${WGSL_ENTRY_POINT}"`
                );
            }

            // `sourceMap` is deliberately dropped. Its offsets index DXBC bytes,
            // which this container does not carry, so it is a translator
            // diagnostic rather than payload. It was separately measured to
            // suppress no sharing, so keeping it would buy nothing either.
            const bytes = new TextEncoder().encode(shader.code);
            return { bytes, size: bytes.byteLength };
        },
        backendBlockFor: (context) =>
        {
            const unit = passUnits.get(context.passKey);
            return unit ? backendBlockFor(unit, context.passKey) : null;
        }
    });
}

/**
 * Builds the complete WebGPU effect container.
 *
 * @param {object} effectRes Loaded version-15 `Tr2EffectRes`.
 * @param {object} permutationGraph Validated `PGRF` document.
 * @param {object} backendBodySet Translated backend bodies.
 * @param {object} [options] Container options.
 * @param {number[]|Uint8Array} [options.compilerVersion] Four version bytes.
 * @param {string} [options.sourceHash] 32 ASCII hash characters.
 * @returns {{bytes:Uint8Array, bodyCount:number, distinctBodyCount:number}} Container and its body accounting.
 */
export function buildCarbonEffectContainer(
    effectRes,
    permutationGraph,
    backendBodySet,
    options = {}
)
{
    const unitsByKey = new Map(backendBodySet.passUnits.map((unit) => [ unit.key, unit ]));
    const bodyByKey = new Map(backendBodySet.bodies.map((body) => [ body.bodyKey, body ]));
    const writer = new CjsCarbonEffectWriter({
        backend: true,
        compilerVersion: options.compilerVersion ?? effectRes.m_compilerVersionBytes ?? [ 0, 0, 0, 0 ],
        ...(options.sourceHash ? { sourceHash: options.sourceHash } : {})
    });

    for (const axis of permutationGraph.axes)
    {
        writer.addPermutation({
            name: axis.name,
            defaultOption: axis.defaultOption,
            description: axis.description,
            type: axis.type,
            options: axis.options
        });
    }

    // Build one emitted description per source body key and reuse it for each
    // matching permutation. The writer may dedupe additional descriptions when
    // their emitted bytes become identical after source programs are replaced;
    // the offset table remains dense.
    const describedByBodyKey = new Map();

    for (const [ permutationIndex, variant ] of permutationGraph.variants.entries())
    {
        let description = describedByBodyKey.get(variant.bodyKey);

        if (!description)
        {
            const body = bodyByKey.get(variant.bodyKey);
            description = describeBody(
                effectRes,
                body?.representativePermutationIndex ?? permutationIndex,
                body?.status === "translated" ? unitsByPassKey(body, unitsByKey) : null
            );
            describedByBodyKey.set(variant.bodyKey, description);
        }

        writer.addBody(permutationIndex, description);
    }

    return {
        bytes: writer.toBytes(),
        permutationCount: permutationGraph.variants.length,
        bodyCount: describedByBodyKey.size
    };
}

export default buildCarbonEffectContainer;
