import { HlslEffectBindingManifest } from '../../hlsl/core/tr2/shader/HlslEffectBindingManifest.js';
import { enumerateUniqueEffectBodies } from '../../hlsl/core/portableReflection.js';
import { buildEffectAnalysis } from './helpers.js';
import { normalizeBytecodeBytes } from './effectAnalysis.js';
import { lowerDxbcToIr } from './ir/lowerDxbcToIr.js';
import { buildWgslBindingPlan } from './wgsl/buildWgslBindingPlan.js';
import { buildWgsl } from './wgsl/emitWgsl.js';
import { buildWgslSet } from './wgsl/buildWgslSet.js';
import { buildResourceTransformPlan } from './wgsl/buildResourceTransformPlan.js';
import { sha256Utf8, sha256Bytes } from '../../../format/effect/sha256.js';
import { selectEffectStages } from './packageEffectSelection.js';
import { isParticleClearEffectCandidate, preflightParticleClearEffectProfile, particleClearEffectProofFor } from './wgsl/lowerParticleClearComputePrograms.js';

const EFFECT_BACKEND_BODY_SET_CHUNK = "WGSB";
const EFFECT_BACKEND_BODY_SET_FORMAT = "CJS_WGSL_BODY_SET";
const EFFECT_BACKEND_BODY_SET_VERSION = 1;

/**
 * One translation unit is exactly one pass of one body: the binding plan, the
 * resource-transform plan, and every stage's emitted WGSL are derived together.
 * Bodies that share an identical pass signature therefore share one unit.
 *
 * @param {object} pass Pass entry carrying its ordered stage records.
 * @returns {string} Stable signature for the pass translation unit.
 */
function passUnitSignature(pass) {
  return JSON.stringify({
    passKey: pass.passKey,
    stages: pass.stages.map(stage => ({
      stageName: stage.stageName,
      bytecode: stage.bytecodeDigest,
      semanticBindings: stage.semanticBindings,
      // An effect profile changes emission, so two otherwise identical
      // passes must not share one unit when their proofs differ.
      effectProfileProof: stage.effectProfileProof ? sha256Utf8(JSON.stringify(stage.effectProfileProof)) : null
    })).sort((left, right) => left.stageName.localeCompare(right.stageName))
  });
}
function collectBodyStageBytecode(effectDescription) {
  const bytecodeByKey = new Map();
  for (const technique of effectDescription?.techniques ?? []) {
    for (let passIndex = 0; passIndex < technique.passes.length; passIndex++) {
      const stageInputs = technique.passes[passIndex].stageInputs;
      for (let stageType = 0; stageType < stageInputs.length; stageType++) {
        const stage = stageInputs[stageType];
        if (!stage?.m_exists) continue;
        const stageName = stage.cjsShaderBytecode?.stageName;
        const value = stage.cjsShaderBytecode?.bytes;
        if (!stageName || value === undefined || value === null) continue;
        const key = `${technique.name}.pass${passIndex}.${stageName}`;
        const bytes = normalizeBytecodeBytes(value, `${key} stage bytecode`);
        if (!bytes?.length) {
          throw new TypeError(`${key} stage bytecode must be a non-empty byte view`);
        }
        bytecodeByKey.set(key, {
          techniqueName: technique.name,
          passIndex,
          stageType,
          stageName,
          bytes
        });
      }
    }
  }
  return bytecodeByKey;
}
function resolveBody(effectRes, permutationIndex, source) {
  const shader = effectRes.GetShaderByIndex(permutationIndex);
  if (!shader) {
    throw new Error(`Effect body at permutation ${permutationIndex} could not be decoded`);
  }
  const effectDescription = shader.GetEffectDescription();
  if (!effectDescription) {
    throw new Error(`Effect body at permutation ${permutationIndex} has no effect description`);
  }
  const resolved = {
    effectRes,
    shader,
    selection: {
      bodyIndex: permutationIndex,
      selectedOptions: []
    },
    effectDescription,
    bindingManifest: HlslEffectBindingManifest.fromEffectDescription(effectDescription),
    stageBytecodeByKey: collectBodyStageBytecode(effectDescription)
  };
  return {
    resolved,
    analysis: buildEffectAnalysis(resolved, {
      source,
      decodeBytecode: false,
      decodeInstructions: false
    })
  };
}
function buildPassEntries(analysis, resolved, selection, effectProfileContext) {
  const selectedStages = selectEffectStages(analysis.stages, selection);
  const passes = new Map();
  for (const stage of selectedStages) {
    const passKey = `${stage.techniqueName}.pass${stage.passIndex}`;
    if (!passes.has(passKey)) {
      passes.set(passKey, {
        passKey,
        stages: []
      });
    }
    const bytecode = resolved.stageBytecodeByKey.get(stage.key)?.bytes;
    if (!bytecode?.length) {
      throw new Error(`${stage.key} has no shader bytecode`);
    }
    passes.get(passKey).stages.push({
      key: stage.key,
      stageName: stage.stageName,
      bytecodeKey: stage.key,
      bytecodeDigest: sha256Bytes(bytecode),
      semanticBindings: analysis.stages.find(candidate => candidate.techniqueName === stage.techniqueName && candidate.passIndex === stage.passIndex && candidate.stageName === stage.stageName)?.bindings || [],
      effectProfileProof: particleClearEffectProofFor(effectProfileContext, stage.key)
    });
  }
  return Array.from(passes.values());
}
function translatePassUnit(pass, programForKey, source, bindingPolicy) {
  const irEntries = pass.stages.map(stage => ({
    key: stage.key,
    ir: programForKey(stage.bytecodeKey),
    semanticBindings: stage.semanticBindings,
    effectProfileProof: stage.effectProfileProof
  }));
  const resourceTransformPlan = buildResourceTransformPlan(irEntries.map(entry => ({
    ir: entry.ir,
    semanticBindings: entry.semanticBindings
  })), {
    layoutKey: pass.passKey
  });
  const proof = irEntries.find(entry => entry.effectProfileProof)?.effectProfileProof ?? null;
  const plan = buildWgslBindingPlan(irEntries.map(entry => entry.ir), {
    ...(bindingPolicy ?? {}),
    ...(proof ? {
      effectProfileProof: proof
    } : {}),
    ...(resourceTransformPlan ? {
      resourceTransformPlan
    } : {})
  });
  return buildWgslSet(irEntries.map(entry => ({
    key: entry.key,
    shader: buildWgsl(entry.ir, {
      bindingPlan: plan,
      ...(resourceTransformPlan ? {
        resourceTransformPlan
      } : {}),
      ...(entry.effectProfileProof ? {
        effectProfileProof: entry.effectProfileProof
      } : {})
    })
  })));
}

/**
 * Translate every unique source body into backend programs, layouts, and
 * resource transforms, sharing one translation unit between bodies whose pass
 * is byte-for-byte identical.
 *
 * A body that cannot be lowered is retained as an explicitly unsupported
 * record. Its complete source reflection stays in `RFLX`, so a partial backend
 * never removes source truth.
 *
 * @param {object} effectRes Loaded version-15 `Tr2EffectRes`.
 * @param {object} permutationGraph Validated `PGRF` document.
 * @param {object} [options] Source label, stage selection, and binding policy.
 * @returns {object} Frozen `CJS_WGSL_BODY_SET` document.
 */
function buildEffectBackendBodySet(effectRes, permutationGraph, options = {}) {
  const source = options.source || "memory";
  const selection = options.selection ?? null;
  const bindingPolicy = options.bindingPolicy ?? null;
  const groups = enumerateUniqueEffectBodies(effectRes);
  if (groups.length !== permutationGraph.bodies.length) {
    throw new Error("Effect backend body set requires one unique body per permutation-graph body");
  }
  const unitsBySignature = new Map();
  const graphBodiesByKey = new Map(permutationGraph.bodies.map(body => [body.key, body]));
  const passUnits = [];
  const bodies = [];
  const seenBodyKeys = new Set();
  for (const group of groups) {
    const variant = permutationGraph.variants[group.permutationIndex];
    const graphBody = variant ? graphBodiesByKey.get(variant.bodyKey) : null;
    if (!graphBody) {
      throw new Error(`Effect backend body ${group.permutationIndex} does not reconcile with its permutation graph record`);
    }
    if (seenBodyKeys.has(graphBody.key)) {
      throw new Error(`Effect backend body ${graphBody.key} was enumerated more than once`);
    }
    seenBodyKeys.add(graphBody.key);
    let resolvedBody = null;
    let passes = null;
    let programForKey = null;
    try {
      resolvedBody = resolveBody(effectRes, group.permutationIndex, source);

      // One IR cache per body, so a stage shared by two passes lowers once
      // and the effect-profile preflight can seed it exactly as the
      // selected-body path does.
      const programsByKey = new Map();
      programForKey = key => {
        if (programsByKey.has(key)) return programsByKey.get(key);
        const bytecode = resolvedBody.resolved.stageBytecodeByKey.get(key)?.bytes;
        if (!bytecode?.length) {
          throw new Error(`${key} has no shader bytecode`);
        }
        const program = lowerDxbcToIr(bytecode, {
          source: `${source}#${key}`
        });
        programsByKey.set(key, program);
        return program;
      };
      let effectProfileContext = null;
      if (isParticleClearEffectCandidate(resolvedBody.resolved.effectDescription)) {
        programForKey("Main.pass0.compute");
        programForKey("Main.pass1.compute");
        effectProfileContext = preflightParticleClearEffectProfile(resolvedBody.resolved.effectDescription, programsByKey);
      }
      passes = buildPassEntries(resolvedBody.analysis, resolvedBody.resolved, selection, effectProfileContext);
    } catch (error) {
      // Stage selection and profile preflight fail closed per body: an
      // unsupported stage kind in one body must not fail the package.
      bodies.push(Object.freeze({
        bodyKey: graphBody.key,
        representativePermutationIndex: group.permutationIndex,
        status: "unsupported",
        error: String(error?.message ?? error),
        passCount: 0,
        passes: Object.freeze([])
      }));
      continue;
    }
    const bodyPasses = [];
    let failure = null;
    for (const pass of passes) {
      const signature = passUnitSignature(pass);
      let unit = unitsBySignature.get(signature);
      if (!unit) {
        let wgsl = null;
        try {
          wgsl = translatePassUnit(pass, programForKey, source, bindingPolicy);
        } catch (error) {
          failure = String(error?.message ?? error);
          break;
        }
        unit = {
          key: `unit${passUnits.length}`,
          sha256: sha256Utf8(`${JSON.stringify(wgsl)}\n`),
          wgslSetVersion: wgsl.formatVersion,
          shaders: wgsl.shaders,
          layouts: wgsl.layouts,
          ...(wgsl.resourceTransforms ? {
            resourceTransforms: wgsl.resourceTransforms
          } : {})
        };
        unitsBySignature.set(signature, unit);
        passUnits.push(unit);
      }
      bodyPasses.push(Object.freeze({
        passKey: pass.passKey,
        unitKey: unit.key
      }));
    }
    bodies.push(Object.freeze(failure ? {
      bodyKey: graphBody.key,
      representativePermutationIndex: group.permutationIndex,
      status: "unsupported",
      error: failure,
      passCount: 0,
      passes: Object.freeze([])
    } : {
      bodyKey: graphBody.key,
      representativePermutationIndex: group.permutationIndex,
      status: "translated",
      error: null,
      passCount: bodyPasses.length,
      passes: Object.freeze(bodyPasses)
    }));
  }
  const translatedCount = bodies.filter(body => body.status === "translated").length;
  if (!translatedCount) {
    throw new Error("Effect backend body set requires at least one translated body");
  }
  return Object.freeze({
    format: EFFECT_BACKEND_BODY_SET_FORMAT,
    formatVersion: EFFECT_BACKEND_BODY_SET_VERSION,
    coverage: Object.freeze({
      bodies: translatedCount === bodies.length ? "all-unique" : "partial",
      programs: "complete-for-translated"
    }),
    bodyCount: bodies.length,
    translatedBodyCount: translatedCount,
    passUnitCount: passUnits.length,
    passUnits: Object.freeze(passUnits.map(unit => Object.freeze(unit))),
    bodies: Object.freeze(bodies)
  });
}

export { EFFECT_BACKEND_BODY_SET_CHUNK, EFFECT_BACKEND_BODY_SET_FORMAT, EFFECT_BACKEND_BODY_SET_VERSION, buildEffectBackendBodySet };
//# sourceMappingURL=effectBackendBodySet.js.map
