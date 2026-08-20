import { CjsCarbonEffectWriter } from './CjsCarbonEffectWriter.js';
import { CjsCarbonEffectReader } from './CjsCarbonEffectReader.js';
import { HlslShaderStageNames } from '../../formats/hlsl/core/tr2/HlslRenderContextEnum.js';
import { Tr2EffectDescription } from '../../resource/shader/reflection/Tr2EffectDescription.js';
import { CjsFormatWriteError } from '../CjsFormatError.js';

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
function unitsByPassKey(body, unitsByKey) {
  const result = new Map();
  for (const pass of body.passes ?? []) {
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
function describeBody(reader, permutationIndex, passUnits, backend) {
  // Read the source body once, as the resource layer reads any Carbon body,
  // then substitute on the resulting graph and emit it. The substitution is
  // two edits - a stage's program and a pass's trailing block - so there is
  // nothing here that wants a bespoke mapping of its own.
  const effect = Tr2EffectDescription.fromCarbonBinary(reader.readDescription(permutationIndex));
  for (const technique of effect.techniques) {
    for (const [passIndex, pass] of technique.passes.entries()) {
      const passKey = `${technique.name}.pass${passIndex}`;
      const unit = passUnits ? passUnits.get(passKey) : null;
      for (const stage of pass.stageInputs) {
        if (!stage.exists) continue;
        const stageName = HlslShaderStageNames[stage.stageType];
        const shader = unit?.shaders.find(entry => entry.key === `${passKey}.${stageName}`);
        // A body the translator could not lower keeps its describable
        // fields and carries a zero-length program: the wire then says
        // exactly what is known, which is that no backend program was
        // stored. The source DXBC is never re-emitted.
        const bytes = shader ? backend.encodeProgram(shader) : new Uint8Array(0);
        stage.sourceProgram = {
          ...stage.sourceProgram,
          bytes,
          shaderSize: bytes.byteLength
        };
      }
      const block = unit ? backend.encodeBackendBlock(unit, passKey) : null;
      pass.backendBlock = block ? {
        bytes: block,
        size: block.byteLength
      } : null;
    }
  }
  return effect.toCarbonBinary();
}

/**
 * Builds a complete backend effect container.
 *
 * @param {object} effectRes Loaded version-15 `Tr2EffectRes`.
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
function buildCarbonEffectContainer(effectRes, permutationGraph, backendBodySet, backend, options = {}) {
  if (typeof backend?.encodeProgram !== "function" || typeof backend?.encodeBackendBlock !== "function") {
    throw new CjsFormatWriteError("buildCarbonEffectContainer requires a backend with encodeProgram and encodeBackendBlock");
  }

  // One reader over the source file, shared by every body: the arena and the
  // offset table are read once, and a body is a seek into them. A dx11 effect
  // is a Carbon v15 container, so the same reader serves here and at load.
  const reader = new CjsCarbonEffectReader(effectRes.m_data, {
    source: effectRes.sourcePath || "effect source"
  });
  const unitsByKey = new Map(backendBodySet.passUnits.map(unit => [unit.key, unit]));
  const bodyByKey = new Map(backendBodySet.bodies.map(body => [body.bodyKey, body]));
  const writer = new CjsCarbonEffectWriter({
    backend: true,
    // Not defaulted from the SOURCE effect's version. The source can be any
    // version the reader accepts; what we emit is a version we have a
    // writer for. Conflating the two would have us claim to emit whatever
    // we happened to read.
    ...(options.version === undefined ? {} : {
      version: options.version
    }),
    compilerVersion: options.compilerVersion ?? effectRes.m_compilerVersionBytes ?? [0, 0, 0, 0],
    ...(options.sourceHash ? {
      sourceHash: options.sourceHash
    } : {})
  });
  for (const axis of permutationGraph.axes) {
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
  for (const [permutationIndex, variant] of permutationGraph.variants.entries()) {
    let description = describedByBodyKey.get(variant.bodyKey);
    if (!description) {
      const body = bodyByKey.get(variant.bodyKey);
      description = describeBody(reader, body?.representativePermutationIndex ?? permutationIndex, body?.status === "translated" ? unitsByPassKey(body, unitsByKey) : null, backend);
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

export { buildCarbonEffectContainer };
//# sourceMappingURL=buildCarbonEffectContainer.js.map
