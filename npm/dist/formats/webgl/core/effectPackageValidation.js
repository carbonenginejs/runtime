import { EFFECT_PERMUTATION_GRAPH_CHUNK, EFFECT_PERMUTATION_GRAPH_FORMAT, EFFECT_PERMUTATION_GRAPH_VERSION, validateEffectPermutationGraph } from '../../../format/effect/effectPermutationGraph.js';
import { EFFECT_REFLECTION_CHUNK, EFFECT_REFLECTION_BLOB_CHUNK, validateEffectReflectionPointer, effectReflectionForPermutation } from '../../../format/effect/effectReflectionPackage.js';
import { inspectCewgRasterCompleteness } from './cewgCompleteness.js';
import { markEffectReflectionValidated } from './cewg/CewgPackage.js';
import { sha256Bytes } from '../../../format/effect/sha256.js';

const EFFECT_INFO_VERSION = 3;
const EFFECT_PACKAGE_KINDS = new Set(["tr2-effect-webgl", "tr2-effect-webgl-permutations"]);
const REQUIRED_EFFECT_CHUNKS = Object.freeze(["INFO", "META", "GLSL"]);
const SEMANTIC_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;
const SHA256 = /^[0-9a-f]{64}$/u;

/**
 * Validates the canonical CEWG effect envelope after the binary container has
 * been decoded. Generic CEWG containers without a recognized package kind
 * remain readable.
 *
 * @param {object} pkg Loaded CEWG package.
 * @returns {boolean} True when the package is generic, legacy, or valid.
 */
function validateEffectPackageEnvelope(pkg) {
  if (!pkg.GetChunk("INFO")) return true;
  const info = requireRecord(pkg.GetJson("INFO"), "CEWG INFO");
  if (!EFFECT_PACKAGE_KINDS.has(info.packageKind)) return true;
  for (const tag of REQUIRED_EFFECT_CHUNKS) {
    if (!pkg.GetChunk(tag)) {
      throw new Error(`CEWG effect package requires ${tag}`);
    }
  }
  if (info.format !== "CEWG") {
    throw new Error("CEWG INFO format is malformed");
  }
  if (info.formatVersion === 1) {
    return true;
  }
  if (info.formatVersion !== EFFECT_INFO_VERSION) {
    throw new Error(`CEWG INFO schema must be version ${EFFECT_INFO_VERSION}`);
  }
  if (info.targetBackend !== "webgl" || info.backendPackage !== "@carbonenginejs/format-webgl" || !SEMANTIC_VERSION.test(info.backendPackageVersion) || info.translator !== "dxbc-js-emitter" || !SEMANTIC_VERSION.test(info.translatorVersion)) {
    throw new Error("CEWG INFO producer provenance is malformed");
  }
  const sourceIdentity = validateSourceIdentity(info.sourceIdentity);
  if (info.sourceByteLength !== sourceIdentity.byteLength || info.sourceSha256 !== sourceIdentity.sha256) {
    throw new Error("CEWG INFO source identity fields disagree");
  }
  requireString(info.sourcePath, "CEWG INFO.sourcePath");
  requireUint(info.defaultPermutationIndex, "CEWG INFO.defaultPermutationIndex");
  requireUint(info.sourceEffectVersion, "CEWG INFO.sourceEffectVersion");
  const expectedMode = info.packageKind === "tr2-effect-webgl-permutations" ? "all" : "selected";
  if (info.permutationMode !== expectedMode) {
    throw new Error("CEWG INFO package kind and permutation mode disagree");
  }
  const graphPointer = requireRecord(info.permutationGraph, "CEWG INFO.permutationGraph");
  if (graphPointer.chunk !== EFFECT_PERMUTATION_GRAPH_CHUNK || graphPointer.format !== EFFECT_PERMUTATION_GRAPH_FORMAT || graphPointer.formatVersion !== EFFECT_PERMUTATION_GRAPH_VERSION || !SHA256.test(graphPointer.sha256)) {
    throw new Error("CEWG INFO.permutationGraph is malformed");
  }
  const graphChunk = pkg.GetChunk(EFFECT_PERMUTATION_GRAPH_CHUNK);
  if (!graphChunk) {
    throw new Error(`CEWG INFO.permutationGraph requires ${EFFECT_PERMUTATION_GRAPH_CHUNK}`);
  }
  if (sha256Bytes(graphChunk.bytes) !== graphPointer.sha256) {
    throw new Error("CEWG INFO permutation-graph digest disagrees with PGRF");
  }
  const graph = requireRecord(pkg.GetJson(EFFECT_PERMUTATION_GRAPH_CHUNK), "CEWG PGRF");
  const graphCounts = validateEffectPermutationGraph(graph, {
    sourceByteLength: sourceIdentity.byteLength
  });
  if (requireUint(graphPointer.permutationCount, "CEWG INFO.permutationGraph.permutationCount") !== graphCounts.permutationCount || requireUint(graphPointer.uniqueBodyCount, "CEWG INFO.permutationGraph.uniqueBodyCount") !== graphCounts.uniqueBodyCount || info.sourcePermutationCount !== graphCounts.permutationCount || info.sourceUniqueBodyCount !== graphCounts.uniqueBodyCount) {
    throw new Error("CEWG INFO permutation-graph counts disagree with PGRF");
  }
  if (info.defaultPermutationIndex >= graphCounts.permutationCount) {
    throw new Error("CEWG default permutation index is absent from PGRF");
  }
  const metadata = requireRecord(pkg.GetJson("META"), "CEWG META");
  const glsl = requireRecord(pkg.GetJson("GLSL"), "CEWG GLSL");
  validateBackendGraph(info, metadata, glsl, graph);
  if (metadata.sourcePath !== info.sourcePath) {
    throw new Error("CEWG META source path disagrees with INFO");
  }
  validateCompleteness(info);
  if (info.formatVersion === 2) {
    if (info.sourceEffectVersion < 8 || info.sourceEffectVersion > 14) {
      throw new Error("CEWG INFO v2 source effect version must be 8-14");
    }
    if (Object.prototype.hasOwnProperty.call(info, "effectReflection") || pkg.GetChunk(EFFECT_REFLECTION_CHUNK) || pkg.GetChunk(EFFECT_REFLECTION_BLOB_CHUNK)) {
      throw new Error("CEWG INFO v2 cannot contain complete effect reflection");
    }
    return true;
  }
  const reflectionChunk = pkg.GetChunk(EFFECT_REFLECTION_CHUNK);
  const blobChunk = pkg.GetChunk(EFFECT_REFLECTION_BLOB_CHUNK);
  if (!reflectionChunk || !blobChunk) {
    throw new Error("CEWG INFO v3 requires RFLX and RBLB");
  }
  const reflection = requireRecord(pkg.GetJson(EFFECT_REFLECTION_CHUNK), "CEWG RFLX");
  if (info.sourceEffectVersion !== 15 || reflection.source?.effectVersion !== info.sourceEffectVersion) {
    throw new Error("CEWG INFO v3 source effect version disagrees with RFLX");
  }
  validateEffectReflectionPointer(requireRecord(info.effectReflection, "CEWG INFO.effectReflection"), reflection, blobChunk.bytes, {
    permutationGraph: graph,
    sourceIdentity,
    sourcePath: info.sourcePath,
    reflectionBytes: reflectionChunk.bytes
  });
  validateReflectionBackendGraph(reflection, graph, metadata, glsl);
  markEffectReflectionValidated(pkg);
  return true;
}
function validateReflectionBackendGraph(reflection, graph, metadata, glsl) {
  const metadataBodies = new Map(metadata.bodies.map(body => [body.key, body]));
  const checkedBodies = new Set();
  for (const variant of metadata.variants) {
    if (checkedBodies.has(variant.bodyKey)) continue;
    checkedBodies.add(variant.bodyKey);
    const metadataBody = metadataBodies.get(variant.bodyKey);
    const reflected = effectReflectionForPermutation(reflection, graph, variant.permutationIndex);
    const manifest = requireRecord(metadataBody?.manifest, `CEWG META body ${variant.bodyKey} manifest`);
    const reflectedPasses = [];
    const reflectedStages = [];
    for (const technique of requireArray(reflected.techniques, `CEWG RFLX body ${variant.bodyKey} techniques`)) {
      for (const [passIndex, pass] of requireArray(technique.passes, `CEWG RFLX technique ${technique.name} passes`).entries()) {
        reflectedPasses.push({
          techniqueName: technique.name,
          passIndex,
          states: pass.renderStates
        });
        for (const stage of requireArray(pass.stages, `CEWG RFLX ${technique.name}.pass${passIndex} stages`)) {
          reflectedStages.push({
            techniqueName: technique.name,
            passIndex,
            stage
          });
        }
      }
    }
    const manifestPasses = requireArray(manifest.passes, `CEWG META body ${variant.bodyKey} passes`);
    const manifestStages = requireArray(manifest.stages, `CEWG META body ${variant.bodyKey} stages`);
    if (manifestPasses.length !== reflectedPasses.length || manifestStages.length !== reflectedStages.length) {
      throw new Error(`CEWG META body ${variant.bodyKey} disagrees with RFLX pass/stage counts`);
    }
    for (const reflectedPass of reflectedPasses) {
      const manifestPass = manifestPasses.find(entry => entry.techniqueName === reflectedPass.techniqueName && entry.passIndex === reflectedPass.passIndex);
      if (!manifestPass || !jsonEqual(manifestPass.states, reflectedPass.states)) {
        throw new Error(`CEWG META pass ${reflectedPass.techniqueName}.pass${reflectedPass.passIndex} disagrees with RFLX`);
      }
    }
    for (const reflectedStage of reflectedStages) {
      const stage = reflectedStage.stage;
      const sourceProgram = stage.sourceProgram;
      const signature = stage.input?.signature;
      const manifestStage = manifestStages.find(entry => entry.techniqueName === reflectedStage.techniqueName && entry.passIndex === reflectedStage.passIndex && entry.stageType === stage.stageType && entry.stageName === stage.stageName);
      if (!manifestStage || sourceProgram?.kind !== "stage" || sourceProgram.stageType !== manifestStage.stageType || sourceProgram.stageName !== manifestStage.stageName || sourceProgram.shaderSize !== manifestStage.shaderBytecode?.shaderSize || sourceProgram.stringTableOffset !== manifestStage.shaderBytecode?.stringTableOffset || !samePipelineInputs(signature?.pipelineInputs, manifestStage.pipelineInputs) || !jsonEqual(signature?.threadGroupSize, manifestStage.threadGroupSize)) {
        throw new Error(`CEWG META stage ${reflectedStage.techniqueName}.pass${reflectedStage.passIndex}.${stage.stageName} disagrees with RFLX`);
      }
    }
  }
  if (checkedBodies.size !== metadataBodies.size || requireArray(glsl.bodies, "CEWG GLSL.bodies").some(body => !checkedBodies.has(body.key))) {
    throw new Error("CEWG backend body inventory disagrees with RFLX");
  }
}
function validateSourceIdentity(value) {
  const identity = requireRecord(value, "CEWG INFO.sourceIdentity");
  requireString(identity.logicalPath, "CEWG INFO.sourceIdentity.logicalPath");
  requireUint(identity.byteLength, "CEWG INFO.sourceIdentity.byteLength");
  if (!SHA256.test(identity.sha256)) {
    throw new Error("CEWG INFO.sourceIdentity.sha256 is malformed");
  }
  return identity;
}
function validateCompleteness(info) {
  const completeness = requireRecord(info.completeness, "CEWG INFO.completeness");
  for (const key of ["packageValid", "sourceComplete", "backendComplete", "runtimeComplete"]) {
    if (typeof completeness[key] !== "boolean") {
      throw new Error(`CEWG INFO.completeness.${key} must be boolean`);
    }
  }
  if (!completeness.packageValid || completeness.runtimeComplete) {
    throw new Error("CEWG INFO completeness overstates runtime coverage");
  }
  if (info.formatVersion === 3) {
    if (info.sourceBodyCoverage !== "all-unique" || !completeness.sourceComplete || info.backendProgramCoverage !== (selectionCoversWholeEffect(info.selection) ? "all-stages" : "filtered")) {
      throw new Error("CEWG INFO v3 source coverage is inconsistent");
    }
  } else if (Object.prototype.hasOwnProperty.call(info, "sourceBodyCoverage") || Object.prototype.hasOwnProperty.call(info, "backendBodyCoverage") || Object.prototype.hasOwnProperty.call(info, "backendProgramCoverage") || completeness.sourceComplete) {
    throw new Error("CEWG INFO v2 source coverage is inconsistent");
  }
  const expectedBackendCoverage = info.permutationMode === "all" ? "all" : "selected";
  if (info.formatVersion === 3 && info.backendBodyCoverage !== expectedBackendCoverage || completeness.backendComplete) {
    throw new Error("CEWG INFO backend coverage is inconsistent");
  }
}
function selectionCoversWholeEffect(value) {
  const selection = requireRecord(value, "CEWG INFO.selection");
  return selection.technique === null && selection.pass === null && selection.stage === null;
}
function validateBackendGraph(info, metadata, glsl, graph) {
  if (glsl.format !== "CEWG_GLSL_SET" || glsl.formatVersion !== 1 || glsl.permutationMode !== info.permutationMode || !jsonEqual(glsl.selection, info.selection)) {
    throw new Error("CEWG GLSL envelope disagrees with INFO");
  }
  const metadataVariants = requireArray(metadata.variants, "CEWG META.variants");
  const glslVariants = requireArray(glsl.variants, "CEWG GLSL.variants");
  const metadataBodies = requireArray(metadata.bodies, "CEWG META.bodies");
  const glslBodies = requireArray(glsl.bodies, "CEWG GLSL.bodies");
  const stages = requireArray(glsl.stages, "CEWG GLSL.stages");
  const shaders = requireArray(glsl.shaders, "CEWG GLSL.shaders");
  if (metadataVariants.length !== info.permutationCount || glslVariants.length !== info.permutationCount) {
    throw new Error("CEWG backend variant counts disagree with INFO");
  }
  const expectedIndices = info.permutationMode === "all" ? graph.variants.map(variant => variant.permutationIndex) : [info.defaultPermutationIndex];
  if (expectedIndices.length !== metadataVariants.length) {
    throw new Error("CEWG backend permutation coverage disagrees with INFO");
  }
  for (let index = 0; index < expectedIndices.length; index++) {
    const expected = expectedIndices[index];
    const metadataVariant = requireRecord(metadataVariants[index], `CEWG META variant ${index}`);
    const glslVariant = requireRecord(glslVariants[index], `CEWG GLSL variant ${index}`);
    if (metadataVariant.permutationIndex !== expected || glslVariant.permutationIndex !== expected || metadataVariant.key !== glslVariant.key || metadataVariant.bodyKey !== glslVariant.bodyKey) {
      throw new Error(`CEWG backend variant ${index} is inconsistent`);
    }
    const sourceVariant = graph.variants[expected];
    if (metadataVariant.bodyOffset !== sourceVariant.sourceRecord.offset || metadataVariant.bodySize !== sourceVariant.sourceRecord.byteLength) {
      throw new Error(`CEWG backend variant ${index} disagrees with PGRF`);
    }
  }
  if (metadataBodies.length !== info.uniqueBodyCount || glslBodies.length !== info.uniqueBodyCount || stages.length !== info.bodyStageCount || shaders.length !== info.uniqueShaderCount) {
    throw new Error("CEWG backend graph counts disagree with INFO");
  }
  const metadataBodyMap = keyedRecordMap(metadataBodies, "CEWG META body");
  const glslBodyMap = keyedRecordMap(glslBodies, "CEWG GLSL body");
  const stageMap = keyedRecordMap(stages, "CEWG GLSL stage");
  const shaderMap = keyedRecordMap(shaders, "CEWG GLSL shader");
  const variantKeys = new Set();
  const referencedBodies = new Set();
  for (const [index, variant] of glslVariants.entries()) {
    if (typeof variant.key !== "string" || !variant.key || variantKeys.has(variant.key) || !glslBodyMap.has(variant.bodyKey) || !metadataBodyMap.has(metadataVariants[index].bodyKey)) {
      throw new Error(`CEWG backend variant ${index} references an invalid body`);
    }
    variantKeys.add(variant.key);
    referencedBodies.add(variant.bodyKey);
  }
  const referencedStages = new Set();
  for (const body of glslBodies) {
    const metadataBody = metadataBodyMap.get(body.key);
    const bodyStages = requireArray(body.stages, `CEWG GLSL body ${body.key}.stages`);
    if (!metadataBody || referencedBodies.has(body.key) === false || bodyStages.length !== new Set(bodyStages).size) {
      throw new Error(`CEWG backend body ${body.key} is inconsistent`);
    }
    for (const stageKey of bodyStages) {
      const stage = stageMap.get(stageKey);
      if (!stage || stage.bodyKey !== body.key) {
        throw new Error(`CEWG backend body ${body.key} references an invalid stage`);
      }
      referencedStages.add(stageKey);
    }
  }
  const referencedShaders = new Set();
  for (const stage of stages) {
    if (!referencedStages.has(stage.key) || !glslBodyMap.has(stage.bodyKey) || !shaderMap.has(stage.shaderKey)) {
      throw new Error(`CEWG backend stage ${stage.key} is inconsistent`);
    }
    referencedShaders.add(stage.shaderKey);
  }
  if (referencedStages.size !== stageMap.size || referencedShaders.size !== shaderMap.size) {
    throw new Error("CEWG backend graph contains orphan stages or shaders");
  }
  const excludedShaderCount = shaders.filter(shader => shader.excluded).length;
  const failedShaderCount = shaders.filter(shader => !shader.hlsl2webgl?.ok && !shader.excluded).length;
  const failedBodyCount = glslBodies.filter(body => body.error).length;
  const availableShaderCount = shaders.filter(shader => shader.hlsl2webgl?.ok && shader.source).length;
  const raster = inspectCewgRasterCompleteness(stages, shaders);
  const counts = {
    translatedShaderCount: shaders.length - failedShaderCount - excludedShaderCount,
    excludedShaderCount,
    failedShaderCount,
    failedBodyCount,
    availableShaderCount,
    expectedRasterPassCount: raster.expectedPassCount,
    completeRasterPassCount: raster.completePassCount,
    incompleteRasterPassCount: raster.incompletePasses.length
  };
  for (const [field, actual] of Object.entries(counts)) {
    if (info[field] !== actual) {
      throw new Error(`CEWG INFO.${field} disagrees with the backend graph`);
    }
  }
}
function keyedRecordMap(records, context) {
  const map = new Map();
  for (const [index, value] of records.entries()) {
    const record = requireRecord(value, `${context} ${index}`);
    if (typeof record.key !== "string" || !record.key || map.has(record.key)) {
      throw new Error(`${context} ${index} has a missing or duplicate key`);
    }
    map.set(record.key, record);
  }
  return map;
}
function samePipelineInputs(reflected, manifest) {
  const fields = ["usage", "registerIndex", "usageIndex", "usedMask", "type", "dimension"];
  return Array.isArray(reflected) && Array.isArray(manifest) && reflected.length === manifest.length && reflected.every((entry, index) => fields.every(field => entry[field] === manifest[index]?.[field]));
}
function requireRecord(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${context} must be an object`);
  }
  return value;
}
function requireArray(value, context) {
  if (!Array.isArray(value)) {
    throw new Error(`${context} must be an array`);
  }
  return value;
}
function requireString(value, context) {
  if (typeof value !== "string" || !value) {
    throw new Error(`${context} must be a non-empty string`);
  }
  return value;
}
function requireUint(value, context) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${context} must be a non-negative safe integer`);
  }
  return value;
}
function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export { EFFECT_INFO_VERSION, validateEffectPackageEnvelope };
//# sourceMappingURL=effectPackageValidation.js.map
