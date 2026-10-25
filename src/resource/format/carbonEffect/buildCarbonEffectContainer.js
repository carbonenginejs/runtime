import { CjsCarbonEffectFormat } from "../../formats/carbonEffect/index.js";
import { effectHeader } from "../effect/effectHeader.js";
import { shaderStageNames } from "../effect/shaderStageNames.js";
import { Tr2EffectParameterAnnotation } from "../../shader/reflection/Tr2EffectParameterAnnotation.js";
import {
    CARBON_TYPED_VIEWS,
    CARBON_VIEW_FORMAT_ANNOTATION,
    annotatedViewFormat
} from "../../formats/hlsl/core/carbonTypedViews.js";
import { CjsFormatWriteError } from "../CjsFormatError.js";
import CjsDxbcFormat from "../../formats/dxbc/index.js";
import { RegisterType } from "#consts/render-context";

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
 * The register types of DXBC declarations, as Carbon's shader compiler assigns
 * them from bytecode reflection (`GetRegisterType`,
 * `shadercompiler/DxReflection.h:109-180`): texture and UAV views by their
 * dimension, a raw (byte-address) view as a buffer, a structured view as a
 * structured buffer.
 */
const REGISTER_TYPE_BY_DECLARATION = {
    dcl_constant_buffer: () => RegisterType.CONSTANT_BUFFER,
    dcl_sampler: () => RegisterType.SAMPLER,
    dcl_resource: (dimension) => SRV_BY_DIMENSION[dimension] ?? RegisterType.SRV_BUFFER,
    dcl_resource_raw: () => RegisterType.SRV_BUFFER,
    dcl_resource_structured: () => RegisterType.SRV_STRUCTURED_BUFFER,
    dcl_unordered_access_view_typed: (dimension) => UAV_BY_DIMENSION[dimension] ?? RegisterType.UAV_BUFFER,
    dcl_unordered_access_view_raw: () => RegisterType.UAV_BUFFER,
    dcl_unordered_access_view_structured: () => RegisterType.UAV_STRUCTURED_BUFFER
};

const SRV_BY_DIMENSION = {
    texture1d: RegisterType.SRV_TEXTURE1D,
    texture1darray: RegisterType.SRV_TEXTURE1DARRAY,
    texture2d: RegisterType.SRV_TEXTURE2D,
    texture2darray: RegisterType.SRV_TEXTURE2DARRAY,
    texture2dms: RegisterType.SRV_TEXTURE2DMS,
    texture2dmsarray: RegisterType.SRV_TEXTURE2DMSARRAY,
    texture3d: RegisterType.SRV_TEXTURE3D,
    texturecube: RegisterType.SRV_TEXTURECUBE,
    texturecubearray: RegisterType.SRV_TEXTURECUBEARRAY
};

const UAV_BY_DIMENSION = {
    texture1d: RegisterType.UAV_TEXTURE1D,
    texture1darray: RegisterType.UAV_TEXTURE1DARRAY,
    texture2d: RegisterType.UAV_TEXTURE2D,
    texture2darray: RegisterType.UAV_TEXTURE2DARRAY,
    texture2dms: RegisterType.UAV_TEXTURE2DMS,
    texture2dmsarray: RegisterType.UAV_TEXTURE2DMSARRAY,
    texture3d: RegisterType.UAV_TEXTURE3D,
    texturecube: RegisterType.UAV_TEXTURECUBE,
    texturecubearray: RegisterType.UAV_TEXTURECUBEARRAY
};

/**
 * The register signature of one compiled stage, read from its DXBC
 * declarations: one register per bound constant buffer, sampler and view, as
 * Carbon's compiler writes one per reflected bound resource
 * (`shadercompiler/DxReflection.h:396-560`). Its reflection reads the `RDEF`
 * chunk, which the older containers' blobs are stripped of; the declarations
 * carry the same bindings. Shader model 5.0 has no register spaces, and every
 * shipped v15 signature measured holds space 0.
 *
 * @param {Uint8Array} bytecode The stage's DXBC.
 * @param {string} source Source name used in error details.
 * @returns {object[]} Signature registers, in declaration order.
 */
function registersFromBytecode(bytecode, source)
{
    const raw = CjsDxbcFormat.read(bytecode, { emit: "raw", source, decodeInstructions: true });
    const registers = [];
    for (const instruction of raw.decoder.instructions)
    {
        const registerType = REGISTER_TYPE_BY_DECLARATION[instruction.opcodeName];
        if (!registerType) continue;
        const declaration = instruction.declaration;
        const registerCount = declaration.bindingRange?.registerCount ?? 1;
        registers.push({
            registerType: registerType(declaration.resourceDimensionName),
            registerIndex: declaration.registerIndex ?? declaration.bindingRange.lowerBound,
            arrayCount: registerCount,
            registerCount,
            registerSpace: 0
        });
    }
    return registers;
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
 * Builds one body's Carbon description record tree with backend programs
 * substituted in.
 *
 * A body the translator could not lower retains its representable non-program
 * description fields and carries zero-length programs. Emitting empty
 * `shaderData` says exactly what the wire knows: no backend program was stored.
 * Full portable source reflection remains in the in-memory build result, not
 * in this emitted body.
 *
 * @param {object} reader Carbon effect container reader.
 * @param {number} permutationIndex Representative permutation for this body.
 * @param {Map<string, object>|null} passUnits Units by pass key, or null when unsupported.
 * @param {object} backend Backend encoders.
 * @returns {object} Description record tree.
 */
function describeBody(reader, permutationIndex, passUnits, backend)
{
    // Decode a fresh description for program substitution; the source bytes stay unchanged.
    const effect = CjsCarbonEffectFormat.readDescription(reader, permutationIndex);

    for (const technique of effect.techniques)
    {
        for (const [ passIndex, pass ] of technique.passes.entries())
        {
            const passKey = `${technique.name}.pass${passIndex}`;
            const unit = passUnits ? passUnits.get(passKey) : null;

            for (const stage of pass.stageInputs)
            {
                if (!stage.exists) continue;

                const stageName = shaderStageNames[stage.stageType];
                const shader = unit?.shaders.find(
                    (entry) => entry.key === `${passKey}.${stageName}`
                );
                // Below v9 a stage carries no register signature (Carbon reads
                // one only above v8, Tr2EffectDescription.cpp:542-545), and a
                // backend that builds its resource layout from the signature
                // would bind nothing. The v15 body written here holds the one
                // the source's own bytecode declares.
                if (reader.version < 9 && stage.signature.registers.length === 0 && stage.sourceProgram.bytes.length)
                {
                    stage.signature.registers = registersFromBytecode(stage.sourceProgram.bytes, `${passKey}.${stageName}`);
                    stage.signature.registerCount = stage.signature.registers.length;
                }
                // A body the translator could not lower keeps its describable
                // fields and carries a zero-length program: the wire then says
                // exactly what is known, which is that no backend program was
                // stored. The source DXBC is never re-emitted.
                const bytes = shader
                    ? backend.encodeProgram(shader)
                    : new Uint8Array(0);
                stage.sourceProgram = {
                    ...stage.sourceProgram,
                    bytes,
                    shaderSize: bytes.byteLength
                };
            }

            const block = unit ? backend.encodeBackendBlock(unit, passKey) : null;
            pass.backendBlock = block
                ? { bytes: block, size: block.byteLength }
                : null;
        }
    }

    annotateTypedViews(effect);

    return effect.toCarbonBinary();
}

/**
 * Writes each Carbon-identified typed view's format onto its parameter as a
 * `CjsViewFormat` annotation (`formats/hlsl/core/carbonTypedViews.js`), so a
 * container we emit carries the formats its translation used in Carbon's own
 * annotation records. An annotation already present is left as it is.
 *
 * @param {Tr2EffectDescription} effect The body's description graph.
 */
function annotateTypedViews(effect)
{
    const names = new Set();
    for (const technique of effect.techniques)
    {
        for (const pass of technique.passes)
        {
            for (const stage of pass.stageInputs)
            {
                if (!stage.exists) continue;
                for (const resource of [ ...stage.resources.values(), ...stage.uavs.values() ])
                {
                    if (CARBON_TYPED_VIEWS[resource.name]) names.add(resource.name);
                }
            }
        }
    }
    for (const name of names)
    {
        const annotations = effect.annotations.get(name) ?? [];
        if (annotatedViewFormat(annotations)) continue;
        const annotation = new Tr2EffectParameterAnnotation();
        annotation.name = CARBON_VIEW_FORMAT_ANNOTATION;
        annotation.type = Tr2EffectParameterAnnotation.Type.STRING;
        annotation.stringValue = CARBON_TYPED_VIEWS[name];
        effect.annotations.set(name, [ ...annotations, annotation ]);
    }
}

/**
 * Builds a complete backend effect container.
 *
 * @param {object} reader Carbon effect container reader.
 * @param {object} permutationGraph Validated derived `CJS_EFFECT_PERMUTATION_GRAPH` document (no chunk is stored).
 * @param {object} backendBodySet Translated backend bodies.
 * @param {object} backend Backend encoders.
 * @param {(shader:object, stage:object, context:object)=>Uint8Array} backend.encodeProgram Encodes one stage program.
 * @param {(unit:object, passKey:string)=>(Uint8Array|null)} backend.encodeBackendBlock Builds one pass's trailing block.
 * @param {object} [options] Container options.
 * @param {number} [options.version] Container data version to emit; must be one
 *     of `CARBON_EFFECT_WRITE_VERSIONS`. Defaults to the current version, and is
 *     independent of the source effect's version.
 * @param {number[]|Uint8Array} [options.compilerVersion] Four version bytes.
 * @param {string} [options.sourceHash] 32 ASCII hash characters.
 * @returns {{bytes:Uint8Array, permutationCount:number, bodyCount:number}} Container and its body accounting.
 */
export function buildCarbonEffectContainer(
    reader,
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

    // Header projection reuses the same retained reader.
    const header = effectHeader(reader);
    const unitsByKey = new Map(backendBodySet.passUnits.map((unit) => [ unit.key, unit ]));
    const bodyByKey = new Map(backendBodySet.bodies.map((body) => [ body.bodyKey, body ]));
    const writeOptions = {
        backend: true,
        // Not defaulted from the SOURCE effect's version. The source can be any
        // version the reader accepts; what we emit is a version we have a
        // writer for. Conflating the two would have us claim to emit whatever
        // we happened to read.
        ...(options.version === undefined ? {} : { version: options.version }),
        compilerVersion: options.compilerVersion ?? header.compilerVersionBytes ?? [ 0, 0, 0, 0 ],
        ...(options.sourceHash ? { sourceHash: options.sourceHash } : {})
    };

    const bodies = [];

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
                reader,
                body?.representativePermutationIndex ?? permutationIndex,
                body?.status === "translated" ? unitsByPassKey(body, unitsByKey) : null,
                backend
            );
            describedByBodyKey.set(variant.bodyKey, description);
        }

        bodies.push({ index: permutationIndex, description });
    }

    return {
        bytes: CjsCarbonEffectFormat.write({ ...writeOptions, permutations: permutationGraph.axes, bodies }),
        permutationCount: permutationGraph.variants.length,
        bodyCount: describedByBodyKey.size
    };
}

export default buildCarbonEffectContainer;
