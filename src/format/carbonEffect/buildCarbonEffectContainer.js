import { CjsCarbonEffectWriter } from "./CjsCarbonEffectWriter.js";
import { carbonDescriptionFromPortable } from "./carbonDescriptionFromPortable.js";
import { CjsFormatWriteError } from "../CjsFormatError.js";
import { buildEffectBodyReflection } from "../../formats/hlsl/core/portableReflection.js";

/**
 * Assembles a backend effect container: Carbon's v15 record layout carrying our
 * programs where a shipped file carries DXBC.
 *
 * The Carbon record layout is backend-invariant, and this module is the part
 * that holds it that way. It walks the permutation graph, emits one description
 * per distinct body, and substitutes stage programs and one optional trailing
 * block per pass. What a program *is* and what the block *contains* are the only
 * backend-varying decisions, so those two are the injected seam
 * (`encodeProgram`, `encodeBackendBlock`) and nothing else here varies.
 *
 * Two backends use it. WGSL for WebGPU, GLSL ES 3.00 for WebGL 2. Their blocks
 * are genuinely different documents - bind-group topology on one side, sampler
 * fusion and synthesised bindings on the other - and neither is derivable from
 * Carbon reflection. Which reader parses a given block is decided by the
 * resource path the file came from, the same way the backend itself is chosen,
 * so the two codecs may both start at their own version 1 without ambiguity.
 */

/**
 * There is no envelope, no magic and no version of our own. That is deliberate.
 *
 * A twelve-byte prefix (`magic | containerVersion | payloadKind`) was carried
 * here and has been removed, along with a proposed "v16" for this variant.
 * Neither survived the only question worth asking of an addition: what breaks
 * without it?
 *
 * - `payloadKind` is redundant with the directory the file came from. Backend
 *   identity belongs to the `effect.webgpu/` or `effect.webgl2/` resource path.
 * - The magic only distinguished our file from a Carbon one, which the same
 *   directory already answers, and which the file *name* answers too.
 * - A version of our own would have claimed a number CCP owns, in the one field
 *   whose job is telling a reader how to parse. A real v16 from them would then
 *   collide with ours.
 *
 * What remains is a bare Carbon v15 record file. The shared record reader
 * detects the per-pass block from the description's declared end.
 *
 * The one addition that does survive the question is the block itself: neither
 * backend's binding topology is derivable from Carbon reflection, so without it
 * there is no way to bind anything and no pipeline.
 */

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
 * Builds one body's Carbon description record tree with backend programs
 * substituted in.
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
 * @param {object} backend Backend encoders.
 * @returns {object} Description record tree.
 */
function describeBody(effectRes, permutationIndex, passUnits, backend)
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

            const bytes = backend.encodeProgram(shader, stage, context);
            return { bytes, size: bytes.byteLength };
        },
        backendBlockFor: (context) =>
        {
            const unit = passUnits.get(context.passKey);
            return unit ? backend.encodeBackendBlock(unit, context.passKey) : null;
        }
    });
}

/**
 * Builds a complete backend effect container.
 *
 * @param {object} effectRes Loaded version-15 `Tr2EffectRes`.
 * @param {object} permutationGraph Validated `PGRF` document.
 * @param {object} backendBodySet Translated backend bodies.
 * @param {object} backend Backend encoders.
 * @param {(shader:object, stage:object, context:object)=>Uint8Array} backend.encodeProgram Encodes one stage program.
 * @param {(unit:object, passKey:string)=>(Uint8Array|null)} backend.encodeBackendBlock Builds one pass's trailing block.
 * @param {object} [options] Container options.
 * @param {number[]|Uint8Array} [options.compilerVersion] Four version bytes.
 * @param {string} [options.sourceHash] 32 ASCII hash characters.
 * @returns {{bytes:Uint8Array, permutationCount:number, bodyCount:number}} Container and its body accounting.
 */
export function buildCarbonEffectContainer(
    effectRes,
    permutationGraph,
    backendBodySet,
    backend,
    options = {}
)
{
    if (typeof backend?.encodeProgram !== "function"
        || typeof backend?.encodeBackendBlock !== "function")
    {
        throw new CjsFormatWriteError(
            "buildCarbonEffectContainer requires a backend with encodeProgram and encodeBackendBlock"
        );
    }

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
                body?.status === "translated" ? unitsByPassKey(body, unitsByKey) : null,
                backend
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
