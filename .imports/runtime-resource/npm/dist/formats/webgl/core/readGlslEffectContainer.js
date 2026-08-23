import { CjsCarbonEffectReader } from '../../../format/carbonEffect/CjsCarbonEffectReader.js';
import { readGlslBackendBlock } from './glslBackendBlock.js';
import { peekBackendEngineId, CARBON_BACKEND_ENGINE_ID } from '../../../format/carbonEffect/backendEngineId.js';
import { hlslShaderStageName } from '../../hlsl/core/tr2/HlslRenderContextEnum.js';
import { runtimeDescriptionFromCarbon } from '../../hlsl/core/carbonDescriptionToRuntime.js';
import { HlslEffectBindingManifest } from '../../hlsl/core/tr2/shader/HlslEffectBindingManifest.js';

/**
 * Decodes a WebGL effect container into the stage/shader records the
 * completeness rules consume.
 *
 * This exists so the rules run from container bytes alone. The alternative was
 * to hand them the in-memory translation, which works inside `buildEffectPackage`
 * and nowhere else — the validator reads a finished file and has no translation
 * in scope. That would have cost the validator its completeness check while
 * still requiring a decoder to produce the programs it compiles in a browser, so
 * it was strictly more work for strictly less checking.
 *
 * The vocabulary is deliberately the one the rules already speak — `stages` with
 * pass coordinates, `shaders` with source and a translation verdict. The rules
 * are about the translation, not about how it was stored, so retargeting them
 * meant changing where the records come from and nothing about what they mean.
 *
 * **What the wire cannot tell you.** `buildCarbonEffectContainer` stores a body
 * the translator could not lower as its full pass tree with zero-length
 * programs; the *reason* it failed stays in the in-memory build result and is
 * never written. So a shader decoded from bytes reports `ok: false` with
 * "no program was stored" and nothing more specific. That is the honest answer:
 * a file on disk does not know why a translation failed months ago. Callers that
 * do know — `buildEffectPackage`, at build time — keep their specific
 * diagnostics by feeding the rules their own records instead.
 */

/** The verdict a stage carrying no stored program gets. */
const NO_PROGRAM_REASON = "no program was stored";

/**
 * Derives the per-stage binding manifests for one body through the one
 * manifest builder the source path uses.
 *
 * This replaces a hand-built reshape of the wire records into the manifest
 * vocabulary. That copy had already diverged from the real manifest once —
 * `isAutoregister` was silently dropped, making every resource look
 * user-settable — which is the whole argument against a second producer: two
 * hand-maintained spellings of one reflection drift, and the drift is exactly
 * the kind of bug that draws, links and renders black without an error. The
 * record tree now flows through `runtimeDescriptionFromCarbon` — the
 * corpus-proven adapter the runtime read path uses — and
 * `HlslEffectBindingManifest`, so the container read and the build-time
 * package derive their manifests from the same code.
 *
 * No `bytecodeFor` is supplied: program text lives in the shader records this
 * reader emits, so the manifest's `shaderBytecode` stays null rather than
 * duplicating every program into the reflection.
 *
 * @param {object} description Decoded Carbon description record tree.
 * @param {number} version Container data version.
 * @param {string} source Source name for diagnostics.
 * @returns {Map<string, object>} Manifest stage records keyed by
 *     `technique.passN.stageName`.
 */
function bodyManifestStages(description, version, source) {
  const runtime = runtimeDescriptionFromCarbon(description, {
    effectName: source,
    version
  });
  const manifest = HlslEffectBindingManifest.fromEffectDescription(runtime).toJSON();
  return new Map(manifest.stages.map(stage => [`${stage.techniqueName}.pass${stage.passIndex}.${stage.stageName}`, stage]));
}

/**
 * Decodes one pass's backend block, tolerating a pass that has none.
 *
 * @param {object} pass Decoded pass record.
 * @param {string} passKey Enclosing pass key.
 * @param {string} source Source name for error details.
 * @returns {object} Per-stage backend data, keyed by stage name.
 */
function backendStages(pass, passKey, source) {
  if (!pass.backendBlock?.size) return {
    stages: {},
    transforms: []
  };

  // A block belonging to another backend is not an error here. The container
  // is Carbon-shaped whatever it targets, and loading it must not depend on
  // being able to use its programs - a dx11 container loads and simply cannot
  // be executed by this library. Report no backend data and let prepare fail
  // where the backend actually matters.
  const engineId = peekBackendEngineId(pass.backendBlock.bytes);
  if (engineId !== CARBON_BACKEND_ENGINE_ID.webgl2) {
    return {
      stages: {},
      transforms: [],
      foreignEngineId: engineId
    };
  }
  const block = readGlslBackendBlock(pass.backendBlock.bytes, {
    layoutKey: passKey,
    source
  });
  return {
    stages: block.stages ?? {},
    transforms: block.transforms ?? []
  };
}

/**
 * Decodes container bytes into stage and shader records.
 *
 * Bodies are decoded once each rather than once per permutation row: rows alias
 * onto shared bodies, and a rule that saw the same body 4,096 times would report
 * 4,096 identical incomplete passes.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Container payload.
 * @param {object} [values] Read values.
 * @param {string} [values.source] Source name, for diagnostics.
 * @returns {{stages:object[], shaders:object[], recordCount:number, bodyCount:number}}
 *   Stage graph in the completeness rules' vocabulary.
 */
function readGlslEffectContainer(input, values = {}) {
  const source = values.source ?? "memory";
  const reader = new CjsCarbonEffectReader(input, {
    source
  });
  const stages = [];
  const shaders = [];
  const bodyKeyByOffset = new Map();

  // Every permutation index that resolves to each body.
  //
  // This is the bridge a caller actually needs, and the only one that is
  // sound. `bodyKey` here is this reader's own ordinal spelling; the
  // permutation graph mints `body${N}` for the same body, and the two are not
  // merely spelled differently — the graph dedupes by content (SHA-256 plus
  // byte equality) while this reader dedupes by source-record offset. Those
  // partitions coincide only because the container writer aliases
  // byte-identical bodies onto one offset, which is a property of the writer
  // rather than a contract.
  //
  // So a consumer must never map between the two by string surgery on either
  // spelling, and must not assume the two ordinal sequences agree. It holds a
  // permutation index; this gives it the body directly.
  const permutationIndicesByOffset = new Map();
  for (let index = 0; index < reader.records.length; index += 1) {
    const {
      offset
    } = reader.records[index];
    const seen = permutationIndicesByOffset.get(offset);
    if (seen) seen.push(index);else permutationIndicesByOffset.set(offset, [index]);
  }

  // Distinct program texts share one shader record, so `shaders` counts unique
  // translations the way the chunk package's shader table did. Empty stages are
  // deliberately *not* pooled: each keeps its own record so a report can name
  // every pass that is missing a program rather than one shared "absent".
  //
  // The pool key is the program text *and* the backend reflection that came
  // with it, not the text alone. A pooled record carries the bindings and
  // stage inputs of whichever stage was seen first, and
  // `validateShaderRuntimeContract` judges the emitted GLSL against them — so
  // pooling on text alone would let two stages with identical source but
  // different reflection be checked against the wrong metadata, silently. It
  // is unlikely that identical GLSL ever carries different reflection, which
  // is exactly why it would not be noticed.
  const shaderKeyByIdentity = new Map();
  for (let index = 0; index < reader.records.length; index += 1) {
    const {
      offset
    } = reader.records[index];
    if (bodyKeyByOffset.has(offset)) continue;
    const bodyKey = `body_${bodyKeyByOffset.size}`;
    bodyKeyByOffset.set(offset, bodyKey);
    const description = reader.readDescription(index, {
      backend: true
    });
    const manifestStages = bodyManifestStages(description, reader.version, source);
    for (const technique of description.techniques) {
      const techniqueName = technique.name.value;
      for (const [passIndex, pass] of technique.passes.entries()) {
        const passKey = `${techniqueName}.pass${passIndex}`;
        const {
          stages: backend,
          transforms
        } = backendStages(pass, passKey, source);
        for (const stage of pass.stages) {
          const name = hlslShaderStageName(stage.type);
          const stageKey = `${bodyKey}.${passKey}.${name}`;
          const stageBackend = backend[name] ?? {};
          let shaderKey;
          if (stage.shaderData?.size) {
            const code = new TextDecoder().decode(stage.shaderData.bytes);
            const identity = `${JSON.stringify([stageBackend.bindings ?? [], stageBackend.stageInputs ?? [], stageBackend.computeFragment ?? null])} ${code}`;
            const pooled = shaderKeyByIdentity.get(identity);
            if (pooled) {
              shaderKey = pooled;
            } else {
              shaderKey = `shader_${shaderKeyByIdentity.size}`;
              shaderKeyByIdentity.set(identity, shaderKey);
              shaders.push({
                key: shaderKey,
                stageName: name,
                source: code,
                hlsl2webgl: {
                  ok: true
                },
                bindings: stageBackend.bindings ?? [],
                stageInputs: stageBackend.stageInputs ?? [],
                ...(stageBackend.computeFragment ? {
                  computeFragment: stageBackend.computeFragment
                } : {})
              });
            }
          } else {
            shaderKey = `${stageKey}.absent`;
            shaders.push({
              key: shaderKey,
              stageName: name,
              source: "",
              hlsl2webgl: {
                ok: false,
                reason: NO_PROGRAM_REASON
              },
              bindings: stageBackend.bindings ?? [],
              stageInputs: stageBackend.stageInputs ?? []
            });
          }
          stages.push({
            key: stageKey,
            bodyKey,
            techniqueName,
            passIndex,
            stageName: name,
            stageType: stage.type,
            shaderKey,
            manifest: manifestStages.get(`${passKey}.${name}`) ?? null,
            // The pass's D3D render states, verbatim from the
            // description. They are not reflection and nothing in
            // the GLSL implies them, so a consumer that only reads
            // programs and bindings renders every effect with
            // whatever state the previous draw happened to leave
            // set. That is invisible for an effect whose states
            // match the ambient ones and total for one whose do
            // not - an additive pass writing alpha 0 disappears
            // completely under a src-alpha blend.
            //
            // `states`, not `renderStates`. In the shipped format a
            // pass reserves `renderStates` for the integer handle a
            // registered state setup is identified by, and calls
            // the {state, value} pairs themselves `states` - as do
            // the WebGPU analysis passes and both of ccpwgl's
            // legacy readers. This path registers nothing, so it
            // carries the list and no handle rather than inventing
            // a number.
            states: pass.renderStates ?? [],
            // The pass's transforms, so a rule can ask whether a
            // description resource was merged away rather than lost.
            transforms
          });
        }
      }
    }
  }

  // Ordered by first appearance, matching `bodyKey`'s ordinal.
  const bodies = [];
  for (const [offset, key] of bodyKeyByOffset) {
    bodies.push({
      key,
      permutationIndices: Object.freeze(permutationIndicesByOffset.get(offset) ?? [])
    });
  }
  return {
    stages,
    shaders,
    bodies,
    recordCount: reader.records.length,
    bodyCount: bodyKeyByOffset.size
  };
}

export { readGlslEffectContainer };
//# sourceMappingURL=readGlslEffectContainer.js.map
