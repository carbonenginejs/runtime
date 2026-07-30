import { CjsByteWriter } from "../../../format/CjsByteWriter.js";
import {
    CARBON_EFFECT_PAYLOAD_KIND,
    CjsCarbonEffectWriter,
    carbonDescriptionFromPortable,
    writeBackendBlock,
    writeCarbonEffectEnvelope
} from "../../../format/carbonEffect/index.js";
import { buildEffectBodyReflection } from "../../hlsl/core/portableReflection.js";

/**
 * Assembles the WebGPU effect container: Carbon's v15 record layout carrying
 * WGSL where a shipped file carries DXBC.
 *
 * The Carbon region is backend-invariant, which the corpus proves rather than
 * asserts — one reader and one writer reproduce dx11, dx12 and metal files byte
 * for byte with no language field anywhere. So a backend swaps exactly two
 * things: the bytes in each stage's `shaderData` slot, and the contents of the
 * one optional trailing block per pass. Everything else is the same records in
 * the same order.
 */

/** Four printable-ASCII bytes, provably disjoint from a Carbon version dword. */
export const CEWGPU_CONTAINER_MAGIC = "CWGP";

/** Container version. Bump when the envelope or the record layout changes. */
export const CEWGPU_CONTAINER_VERSION = 1;

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
 * A body the translator could not lower keeps its complete source reflection and
 * carries zero-length programs. Dropping it would remove source truth that the
 * container is the only remaining home for; emitting it with empty `shaderData`
 * says exactly what is true — the reflection is known, the program is not.
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

    // One description per unique body, reused by every permutation that resolves
    // to it. The container's alias dedupe then collapses them to one stored copy
    // while the offset table stays dense, which is exactly what CCP's compiler
    // does and what the corpus confirms across 900 aliasing files.
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

    const carbon = writer.toBytes();
    const envelope = new CjsByteWriter(12);
    writeCarbonEffectEnvelope(envelope, {
        magic: CEWGPU_CONTAINER_MAGIC,
        containerVersion: CEWGPU_CONTAINER_VERSION,
        payloadKind: CARBON_EFFECT_PAYLOAD_KIND.WGSL
    });

    const bytes = new Uint8Array(envelope.length + carbon.length);
    bytes.set(envelope.toBytes(), 0);
    bytes.set(carbon, envelope.length);

    return {
        bytes,
        permutationCount: permutationGraph.variants.length,
        bodyCount: describedByBodyKey.size
    };
}

export default buildCarbonEffectContainer;
