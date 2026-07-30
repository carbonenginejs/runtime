import { normalizeResourceTransformPlan } from './wgsl/buildResourceTransformPlan.js';
import { WGSL_SET_VERSION } from './wgsl/buildWgslSet.js';
import { DXBC_WGSL_TRANSLATOR_NAME, WEBGPU_BACKEND_NAME, FORMAT_WEBGPU_PACKAGE_NAME } from './packageMetadata.js';
import { EFFECT_PERMUTATION_GRAPH_CHUNK, EFFECT_PERMUTATION_GRAPH_FORMAT, EFFECT_PERMUTATION_GRAPH_VERSION, validateEffectPermutationGraph } from '../../../format/effect/effectPermutationGraph.js';
import { validateEffectReflectionPointer, EFFECT_REFLECTION_VERSION, effectReflectionForPermutation, EFFECT_REFLECTION_CHUNK, EFFECT_REFLECTION_BLOB_CHUNK } from '../../../format/effect/effectReflectionPackage.js';
import { sha256Bytes } from '../../../format/effect/sha256.js';
import { markEffectPackageValidated } from './cewgpu/CewgpuPackage.js';
import { EFFECT_BACKEND_BODY_SET_CHUNK, EFFECT_BACKEND_BODY_SET_FORMAT, EFFECT_BACKEND_BODY_SET_VERSION } from './effectBackendBodySet.js';

const EFFECT_INFO_VERSION = 3;
const REQUIRED_EFFECT_CHUNKS = Object.freeze(["INFO", "META", "ANLS", "WGSL"]);
const EFFECT_PACKAGE_KIND = "tr2-effect-webgpu";
const SEMANTIC_VERSION = new RegExp("^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)" + "(?:-(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*))" + "(?:\\.(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*)))*)?" + "(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$", "u");
const STAGE_SCHEMA = Object.freeze({
  vertex: Object.freeze({
    stage: "vertex",
    stageType: 0
  }),
  pixel: Object.freeze({
    stage: "fragment",
    stageType: 1
  }),
  compute: Object.freeze({
    stage: "compute",
    stageType: 2
  })
});
const VISIBILITIES = new Set(["vertex", "fragment", "compute"]);
const BUFFER_TYPES = new Set(["uniform", "read-only-storage", "storage"]);
const TEXTURE_BINDING_TYPES = Object.freeze({
  "texture_2d<f32>": Object.freeze({
    sampleType: "float",
    viewDimension: "2d",
    multisampled: false
  }),
  "texture_2d_array<f32>": Object.freeze({
    sampleType: "float",
    viewDimension: "2d-array",
    multisampled: false
  }),
  "texture_cube<f32>": Object.freeze({
    sampleType: "float",
    viewDimension: "cube",
    multisampled: false
  }),
  "texture_3d<f32>": Object.freeze({
    sampleType: "float",
    viewDimension: "3d",
    multisampled: false
  })
});
const SAMPLER_TYPES = new Set(["filtering", "non-filtering", "comparison"]);
const ANALYSIS_BINDING_KINDS = Object.freeze({
  constantBuffer: Object.freeze({
    prefix: "cb",
    registerTypes: Object.freeze([0])
  }),
  sampler: Object.freeze({
    prefix: "s",
    registerTypes: Object.freeze([1])
  }),
  resource: Object.freeze({
    prefix: "t",
    registerTypes: Object.freeze([32, 63])
  }),
  uav: Object.freeze({
    prefix: "u",
    registerTypes: Object.freeze([64, 95])
  })
});

/**
 * Parse one required JSON object chunk with package-specific diagnostics.
 *
 * @param {object} pkg Loaded CEWGPU package.
 * @param {string} tag Required chunk tag.
 * @returns {object} Parsed non-array object.
 */
function requireJsonObject(pkg, tag) {
  if (!pkg.GetChunk(tag)) {
    throw new Error(`CEWGPU ${EFFECT_PACKAGE_KIND} package requires ${tag}`);
  }
  let value;
  try {
    value = pkg.GetJson(tag);
  } catch (error) {
    throw new Error(`CEWGPU ${tag} must contain valid JSON: ${error.message}`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`CEWGPU ${tag} must contain a JSON object`);
  }
  return value;
}

/**
 * Require one closed-schema JSON object.
 *
 * @param {object} value Candidate object.
 * @param {string[]} allowed Exact field names.
 * @param {string} context Diagnostic context.
 * @returns {object} Validated object.
 */
function requireExactKeys(value, allowed, context) {
  const keys = Object.keys(value);
  if (keys.length !== allowed.length || keys.some(key => !allowed.includes(key))) {
    throw new Error(`${context} has unsupported or missing fields`);
  }
  return value;
}

/**
 * Compare JSON-compatible data without depending on object property order.
 *
 * @param {any} left First value.
 * @param {any} right Second value.
 * @returns {boolean} True when the values are structurally equal.
 */
function jsonEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => jsonEqual(value, right[index]));
  }
  if (!left || !right || typeof left !== "object" || typeof right !== "object") {
    return false;
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && jsonEqual(left[key], right[key]));
}

/**
 * Require an array field from one package document.
 *
 * @param {object} value Parent object.
 * @param {string} field Field name.
 * @param {string} context Document context.
 * @returns {any[]} Array field.
 */
function requireArray(value, field, context) {
  if (!Array.isArray(value[field])) {
    throw new Error(`CEWGPU ${context}.${field} must be an array`);
  }
  return value[field];
}

/**
 * Require one non-negative safe integer.
 *
 * @param {any} value Candidate count.
 * @param {string} context Field context.
 * @returns {number} Validated count.
 */
function requireCount(value, context) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`CEWGPU ${context} must be a non-negative safe integer`);
  }
  return value;
}

/**
 * Require one non-empty string.
 *
 * @param {any} value Candidate value.
 * @param {string} context Field context.
 * @returns {string} Validated string.
 */
function requireString(value, context) {
  if (typeof value !== "string" || !value || value !== value.trim()) {
    throw new Error(`CEWGPU ${context} must be a non-empty string`);
  }
  return value;
}

/**
 * Validate selected permutation option records.
 *
 * @param {any} value Candidate option list.
 * @param {string} context Field context.
 * @returns {object[]} Validated option records.
 */
function validateSelectedOptions(value, context) {
  const options = Array.isArray(value) ? value : null;
  const names = new Set();
  if (!options) {
    throw new Error(`CEWGPU ${context} must be an array`);
  }
  for (const [index, option] of options.entries()) {
    if (!option || typeof option !== "object" || Array.isArray(option) || typeof option.name !== "string" || !option.name || typeof option.value !== "string" || !option.value || !Number.isSafeInteger(option.optionIndex) || option.optionIndex < 0 || !Number.isSafeInteger(option.defaultOption) || option.defaultOption < 0 || typeof option.defaultValue !== "string" || !option.defaultValue || !["default", "local", "global"].includes(option.source) || option.source === "default" && option.optionIndex !== option.defaultOption || option.optionIndex === option.defaultOption && option.value !== option.defaultValue || names.has(option.name)) {
      throw new Error(`CEWGPU ${context} option ${index} is malformed or duplicated`);
    }
    names.add(option.name);
  }
  return options;
}

/**
 * Validate the canonical INFO source-identity record.
 *
 * @param {any} value Candidate source identity.
 * @param {boolean} requireSha256 Whether the schema requires a strong hash.
 * @returns {object} Validated source identity.
 */
function validateSourceIdentity(value, requireSha256) {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.logicalPath !== "string" || !value.logicalPath.trim() || !Number.isSafeInteger(value.byteLength) || value.byteLength < 1 || value.md5 !== null && (typeof value.md5 !== "string" || !/^[0-9a-f]{32}$/u.test(value.md5)) || (requireSha256 ? typeof value.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(value.sha256) : value.sha256 !== undefined && value.sha256 !== null && (typeof value.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(value.sha256))) || !["game", "client", "build"].every(field => value[field] === null || typeof value[field] === "string" && !!value[field])) {
    throw new Error("CEWGPU INFO.sourceIdentity is malformed");
  }
  return value;
}

/**
 * Validate an optional INFO-to-PGRF reference and its graph.
 *
 * Legacy selected-effect INFO v1/v2 packages may omit the graph. New
 * producers declare both the pointer and chunk; either without the other is
 * invalid.
 *
 * @param {object} pkg Loaded CEWGPU package.
 * @param {object} info Validated INFO document.
 * @returns {object|null} Validated graph, or null for a legacy package.
 */
/**
 * Validate the all-body backend graph against its INFO pointer, the source
 * permutation graph, and the selected-body `WGSL` document.
 *
 * @param {object} pkg CEWGPU package reader.
 * @param {object} info INFO document.
 * @param {object|null} permutationGraph Validated PGRF document.
 * @returns {object|null} Validated backend body set, or null when absent.
 */
function validateBackendBodySetReference(pkg, info, permutationGraph) {
  const pointer = info.backendBodySet;
  const chunk = pkg.GetChunk(EFFECT_BACKEND_BODY_SET_CHUNK);
  if (pointer === undefined && !chunk) {
    if (info.bodyMode === "all") {
      throw new Error(`CEWGPU body mode all requires ${EFFECT_BACKEND_BODY_SET_CHUNK}`);
    }
    return null;
  }
  if (info.bodyMode !== "all") {
    throw new Error("CEWGPU selected-mode packages cannot declare an all-body backend graph");
  }
  if (!pointer || typeof pointer !== "object" || Array.isArray(pointer) || !chunk) {
    throw new Error("CEWGPU INFO.backendBodySet is malformed");
  }
  requireExactKeys(pointer, ["chunk", "format", "formatVersion", "sha256", "bodyCount", "translatedBodyCount", "passUnitCount"], "CEWGPU INFO.backendBodySet");
  if (pointer.chunk !== EFFECT_BACKEND_BODY_SET_CHUNK || pointer.format !== EFFECT_BACKEND_BODY_SET_FORMAT || pointer.formatVersion !== EFFECT_BACKEND_BODY_SET_VERSION) {
    throw new Error("CEWGPU INFO.backendBodySet is malformed");
  }
  if (typeof pointer.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(pointer.sha256) || sha256Bytes(chunk.bytes) !== pointer.sha256) {
    throw new Error("CEWGPU INFO backend body-set digest disagrees with WGSB");
  }
  if (!permutationGraph) {
    throw new Error("CEWGPU all-body backend graph requires PGRF");
  }
  const bodySet = requireJsonObject(pkg, EFFECT_BACKEND_BODY_SET_CHUNK);
  if (bodySet.format !== EFFECT_BACKEND_BODY_SET_FORMAT || bodySet.formatVersion !== EFFECT_BACKEND_BODY_SET_VERSION) {
    throw new Error("CEWGPU WGSB document is malformed");
  }
  const bodies = requireArray(bodySet, "bodies", EFFECT_BACKEND_BODY_SET_CHUNK);
  const passUnits = requireArray(bodySet, "passUnits", EFFECT_BACKEND_BODY_SET_CHUNK);
  const unitKeys = new Set();
  for (const unit of passUnits) {
    if (!unit || typeof unit !== "object" || typeof unit.key !== "string" || !unit.key || unitKeys.has(unit.key) || !Array.isArray(unit.shaders) || !unit.shaders.length || !Array.isArray(unit.layouts) || !unit.layouts.length || unit.wgslSetVersion !== WGSL_SET_VERSION) {
      throw new Error(`CEWGPU WGSB translation unit ${unit?.key || "<unknown>"} is malformed`);
    }
    unitKeys.add(unit.key);
  }
  const graphBodyKeys = new Set(permutationGraph.bodies.map(body => body.key));
  const seen = new Set();
  let translated = 0;
  for (const body of bodies) {
    if (!body || typeof body !== "object" || !graphBodyKeys.has(body.bodyKey) || seen.has(body.bodyKey) || !["translated", "unsupported"].includes(body.status)) {
      throw new Error(`CEWGPU WGSB body ${body?.bodyKey || "<unknown>"} does not reconcile with PGRF`);
    }
    seen.add(body.bodyKey);
    const variant = permutationGraph.variants[body.representativePermutationIndex];
    if (!variant || variant.bodyKey !== body.bodyKey) {
      throw new Error(`CEWGPU WGSB body ${body.bodyKey} has an inconsistent representative permutation`);
    }
    if (body.status === "unsupported") {
      if (typeof body.error !== "string" || !body.error || body.passCount !== 0 || body.passes.length) {
        throw new Error(`CEWGPU WGSB unsupported body ${body.bodyKey} must retain an explicit reason and no passes`);
      }
      continue;
    }
    translated++;
    if (body.error !== null || !Array.isArray(body.passes) || !body.passes.length || body.passCount !== body.passes.length) {
      throw new Error(`CEWGPU WGSB translated body ${body.bodyKey} is malformed`);
    }
    for (const pass of body.passes) {
      if (!pass || typeof pass.passKey !== "string" || !pass.passKey || !unitKeys.has(pass.unitKey)) {
        throw new Error(`CEWGPU WGSB body ${body.bodyKey} references missing translation unit`);
      }
    }
  }
  if (seen.size !== graphBodyKeys.size) {
    throw new Error("CEWGPU WGSB does not cover every unique permutation-graph body");
  }
  if (requireCount(pointer.bodyCount, "INFO.backendBodySet.bodyCount") !== bodies.length || requireCount(pointer.translatedBodyCount, "INFO.backendBodySet.translatedBodyCount") !== translated || requireCount(pointer.passUnitCount, "INFO.backendBodySet.passUnitCount") !== passUnits.length) {
    throw new Error("CEWGPU INFO backend body-set counts disagree with WGSB");
  }
  if (!translated) {
    throw new Error("CEWGPU WGSB requires at least one translated body");
  }
  const expectedCoverage = translated === bodies.length ? "all-unique" : "partial";
  if (bodySet.coverage?.bodies !== expectedCoverage || info.backendBodyCoverage !== expectedCoverage) {
    throw new Error("CEWGPU WGSB coverage disagrees with its translated body count");
  }
  return bodySet;
}
function validatePermutationGraphReference(pkg, info) {
  const pointer = info.permutationGraph;
  const chunk = pkg.GetChunk(EFFECT_PERMUTATION_GRAPH_CHUNK);
  if (pointer === undefined && !chunk) return null;
  if (info.formatVersion !== EFFECT_INFO_VERSION || !pointer || typeof pointer !== "object" || Array.isArray(pointer)) {
    throw new Error("CEWGPU INFO.permutationGraph is malformed");
  }
  requireExactKeys(pointer, ["chunk", "format", "formatVersion", "sha256", "permutationCount", "uniqueBodyCount"], "CEWGPU INFO.permutationGraph");
  if (pointer.chunk !== EFFECT_PERMUTATION_GRAPH_CHUNK || pointer.format !== EFFECT_PERMUTATION_GRAPH_FORMAT || pointer.formatVersion !== EFFECT_PERMUTATION_GRAPH_VERSION) {
    throw new Error("CEWGPU INFO.permutationGraph is malformed");
  }
  if (!chunk) {
    throw new Error(`CEWGPU INFO.permutationGraph requires ${EFFECT_PERMUTATION_GRAPH_CHUNK}`);
  }
  if (info.formatVersion === 3 && (typeof pointer.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(pointer.sha256) || sha256Bytes(chunk.bytes) !== pointer.sha256)) {
    throw new Error("CEWGPU INFO permutation-graph digest disagrees with PGRF");
  }
  const graph = requireJsonObject(pkg, EFFECT_PERMUTATION_GRAPH_CHUNK);
  const counts = validateEffectPermutationGraph(graph, {
    sourceByteLength: info.sourceIdentity.byteLength
  });
  if (requireCount(pointer.permutationCount, "INFO.permutationGraph.permutationCount") !== counts.permutationCount || requireCount(pointer.uniqueBodyCount, "INFO.permutationGraph.uniqueBodyCount") !== counts.uniqueBodyCount) {
    throw new Error("CEWGPU INFO permutation-graph counts disagree with PGRF");
  }
  return graph;
}

/**
 * Read an optional INFO/RFLX/RBLB reference as one indivisible legacy-aware
 * unit.
 *
 * @param {object} pkg Loaded CEWGPU package.
 * @param {object} info Validated INFO document.
 * @returns {object|null} Reflection pointer and chunks, or null when absent.
 */
function readEffectReflectionReference(pkg, info) {
  const pointer = info.effectReflection;
  const reflectionChunk = pkg.GetChunk(EFFECT_REFLECTION_CHUNK);
  const blobChunk = pkg.GetChunk(EFFECT_REFLECTION_BLOB_CHUNK);
  if (pointer === undefined && !reflectionChunk && !blobChunk) {
    if (info.formatVersion === 3) {
      throw new Error("CEWGPU INFO v3 requires complete effect reflection");
    }
    return null;
  }
  if (info.formatVersion !== EFFECT_INFO_VERSION || pointer === undefined) {
    throw new Error("CEWGPU INFO.effectReflection is malformed");
  }
  if (!reflectionChunk) {
    throw new Error(`CEWGPU INFO.effectReflection requires ${EFFECT_REFLECTION_CHUNK}`);
  }
  if (!blobChunk) {
    throw new Error(`CEWGPU INFO.effectReflection requires ${EFFECT_REFLECTION_BLOB_CHUNK}`);
  }
  return {
    pointer,
    reflection: requireJsonObject(pkg, EFFECT_REFLECTION_CHUNK),
    reflectionBytes: reflectionChunk.bytes,
    blobBytes: blobChunk.bytes
  };
}

/**
 * Reconcile the selected-body documents with a complete permutation graph.
 *
 * @param {object} graph Validated permutation graph.
 * @param {number} bodyIndex Selected permutation index.
 * @param {object[]} selectedOptions Selected option metadata.
 */
function validatePermutationGraphSelection(graph, bodyIndex, selectedOptions) {
  const variant = graph.variants[bodyIndex];
  if (!variant || selectedOptions.length !== graph.axes.length) {
    throw new Error("CEWGPU selected body is absent from PGRF");
  }
  for (let axisIndex = 0; axisIndex < graph.axes.length; axisIndex += 1) {
    const axis = graph.axes[axisIndex];
    const optionIndex = variant.optionIndices[axisIndex];
    const selected = selectedOptions[axisIndex];
    if (selected.name !== axis.name || selected.optionIndex !== optionIndex || selected.value !== axis.options[optionIndex] || selected.defaultOption !== axis.defaultOption || selected.defaultValue !== axis.options[axis.defaultOption]) {
      throw new Error(`CEWGPU selected option ${axisIndex} disagrees with PGRF`);
    }
  }
}

/**
 * Validate and collect unique ANLS pass identities.
 *
 * @param {object[]} passes ANLS pass records.
 * @returns {Set<string>} Unique pass keys.
 */
function collectAnalysisPassKeys(passes) {
  const keys = new Set();
  const indicesByTechnique = new Map();
  for (const [index, pass] of passes.entries()) {
    if (!pass || typeof pass.techniqueName !== "string" || !pass.techniqueName || !Number.isSafeInteger(pass.passIndex) || pass.passIndex < 0 || !Number.isSafeInteger(pass.renderStates) || pass.renderStates < 0 || !Array.isArray(pass.states) || pass.states.some(state => !state || typeof state !== "object" || Array.isArray(state) || !Number.isSafeInteger(state.state) || state.state < 0 || !Number.isSafeInteger(state.value) || state.value < 0 || state.value > 0xFFFFFFFF)) {
      throw new Error(`CEWGPU ANLS pass ${index} has an invalid identity`);
    }
    const key = `${pass.techniqueName}.pass${pass.passIndex}`;
    if (keys.has(key)) {
      throw new Error(`CEWGPU ANLS contains duplicate pass ${key}`);
    }
    keys.add(key);
    if (!indicesByTechnique.has(pass.techniqueName)) {
      indicesByTechnique.set(pass.techniqueName, []);
    }
    indicesByTechnique.get(pass.techniqueName).push(pass.passIndex);
  }
  for (const [techniqueName, indices] of indicesByTechnique) {
    const ordered = indices.sort((left, right) => left - right);
    if (ordered.some((passIndex, index) => passIndex !== index)) {
      throw new Error(`CEWGPU ANLS technique ${techniqueName} has noncontiguous passes`);
    }
  }
  return keys;
}

/**
 * Validate and collect unique canonical stage keys.
 *
 * @param {object[]} records Stage records.
 * @param {string} context Document context.
 * @returns {Set<string>} Unique stage keys.
 */
function collectStageKeys(records, context) {
  const keys = new Set();
  for (const [index, record] of records.entries()) {
    const schema = Object.prototype.hasOwnProperty.call(STAGE_SCHEMA, record?.stageName) ? STAGE_SCHEMA[record.stageName] : null;
    const expected = `${record?.techniqueName}.pass${record?.passIndex}.${record?.stageName}`;
    if (!record || typeof record.techniqueName !== "string" || !record.techniqueName || !Number.isSafeInteger(record.passIndex) || record.passIndex < 0 || !schema || record.stageType !== schema.stageType || record.key !== expected) {
      throw new Error(`CEWGPU ${context} stage ${index} has a noncanonical key`);
    }
    // `context` is a behavioural discriminator, not a chunk tag. Its two
    // values happen to spell "ANLS" and "WGSL" because the caller passes the
    // chunk it is validating, but this branch selects the *emitted-program*
    // rule set. A mechanical chunk-tag migration that rewrites tag strings
    // will rewrite this one too and silently disable the check.
    if (context === "WGSL" && (record.stage !== schema.stage || typeof record.entryPoint !== "string" || !record.entryPoint || typeof record.code !== "string" || !record.code || !Array.isArray(record.sourceMap) || record.sourceMap.some(entry => !entry || typeof entry !== "object" || Array.isArray(entry) || !Number.isSafeInteger(entry.line) || entry.line < 1 || !Number.isSafeInteger(entry.instructionIndex) || entry.instructionIndex < 0 || !Number.isSafeInteger(entry.dxbcOffset) || entry.dxbcOffset < 0) || record.stageName === "compute" && (!Array.isArray(record.threadGroupSize) || record.threadGroupSize.length !== 3 || record.threadGroupSize.some(value => !Number.isSafeInteger(value) || value < 1)) || record.stageName !== "compute" && record.threadGroupSize !== undefined && record.threadGroupSize !== null)) {
      throw new Error(`CEWGPU WGSL shader ${record.key} has invalid stage metadata`);
    }
    if (keys.has(record.key)) {
      throw new Error(`CEWGPU ${context} contains duplicate stage key ${record.key}`);
    }
    keys.add(record.key);
  }
  validatePassTopologies(records, context);
  return keys;
}

/**
 * Reject mixed compute/render stage sets within one pass.
 *
 * @param {object[]} records Canonical stage records.
 * @param {string} context Document context.
 * @returns {true} True when every pass topology is representable.
 */
function validatePassTopologies(records, context) {
  const stagesByPass = new Map();
  for (const record of records) {
    const passKey = `${record.techniqueName}.pass${record.passIndex}`;
    if (!stagesByPass.has(passKey)) stagesByPass.set(passKey, []);
    stagesByPass.get(passKey).push(record.stageName);
  }
  for (const [passKey, stages] of stagesByPass) {
    if (stages.includes("compute") && (stages.length !== 1 || stages[0] !== "compute")) {
      throw new Error(`CEWGPU ${context} pass ${passKey} mixes compute and render stages`);
    }
  }
  return true;
}

/**
 * Validate and collect unique canonical pass-layout keys.
 *
 * @param {object[]} layouts WGSL layout records.
 * @returns {Set<string>} Unique layout keys.
 */
function collectLayoutKeys(layouts) {
  const keys = new Set();
  for (const [index, layout] of layouts.entries()) {
    const match = /^(.+)\.pass(0|[1-9][0-9]*)$/u.exec(layout?.key);
    if (!layout || !match || layout.techniqueName !== match[1] || layout.passIndex !== Number(match[2]) || !Number.isSafeInteger(layout.passIndex)) {
      throw new Error(`CEWGPU WGSL layout ${index} has a noncanonical key`);
    }
    if (keys.has(layout.key)) {
      throw new Error(`CEWGPU WGSL contains duplicate layout key ${layout.key}`);
    }
    keys.add(layout.key);
    validateBindGroups(layout, index);
  }
  return keys;
}

/**
 * Require each layout's bind groups and binding records to be unambiguous.
 *
 * @param {object} layout Layout record.
 * @param {number} layoutIndex Layout array index.
 * @returns {true} True when the groups are representable.
 */
function validateBindGroups(layout, layoutIndex) {
  const groups = requireArray(layout, "bindGroups", `WGSL.layouts[${layoutIndex}]`);
  const groupNumbers = new Set();
  const slots = new Set();
  const scopes = new Set();
  const scopesByIdentity = new Map();
  const symbolVisibility = new Map();
  for (const [groupIndex, group] of groups.entries()) {
    if (!group || !Number.isSafeInteger(group.group) || group.group < 0 || groupNumbers.has(group.group)) {
      throw new Error(`CEWGPU WGSL layout ${layout.key} contains an invalid or duplicate bind group`);
    }
    groupNumbers.add(group.group);
    const bindings = requireArray(group, "bindings", `WGSL.layouts[${layoutIndex}].bindGroups[${groupIndex}]`);
    for (const [bindingIndex, binding] of bindings.entries()) {
      validateBinding(binding, group.group, bindingIndex, layout.key, slots, scopes, scopesByIdentity, symbolVisibility);
    }
  }
  const orderedGroups = Array.from(groupNumbers).sort((left, right) => left - right);
  if (orderedGroups.some((group, index) => group !== index)) {
    throw new Error(`CEWGPU WGSL layout ${layout.key} bind groups must be contiguous from zero`);
  }
  return true;
}

/**
 * Validate one portable WGSL layout binding.
 *
 * @param {object} binding Binding record.
 * @param {number} group Owning bind-group number.
 * @param {number} index Binding index for diagnostics.
 * @param {string} layoutKey Owning layout key.
 * @param {Set<string>} slots Slots already used by the layout.
 * @param {Set<string>} scopes Physical identities already used by the layout.
 * @param {Map<string,Set<string>>} scopesByIdentity Scope forms by D3D identity.
 * @param {Map<string,Set<string>>} symbolVisibility Visibility by generated symbol.
 * @returns {true} True when the binding is structurally valid.
 */
function validateBinding(binding, group, index, layoutKey, slots, scopes, scopesByIdentity, symbolVisibility) {
  const visibility = binding?.visibility;
  const expectedDescriptors = {
    "uniform-buffer": ["buffer"],
    "sampled-resource": ["buffer", "texture"],
    "storage-resource": ["buffer"],
    sampler: ["sampler"]
  }[binding?.resourceKind];
  const descriptors = ["buffer", "texture", "sampler"].filter(key => binding?.[key] !== undefined);
  const identity = `${binding?.resourceKind}:${binding?.registerSpace}:${binding?.registerIndex}`;
  const slot = `${group}:${binding?.binding}`;
  const sharedScope = binding?.scopeIdentity === identity;
  const stageScope = Array.isArray(visibility) && visibility.length === 1 ? `${identity}@${visibility[0]}` : null;
  if (!binding || typeof binding !== "object" || Array.isArray(binding) || binding.group !== group || !Number.isSafeInteger(binding.binding) || binding.binding < 0 || !Number.isSafeInteger(binding.registerSpace) || binding.registerSpace < 0 || !Number.isSafeInteger(binding.registerIndex) || binding.registerIndex < 0 || typeof binding.generatedSymbol !== "string" || !binding.generatedSymbol || typeof binding.type !== "string" || !binding.type || binding.identity !== identity || typeof binding.scopeIdentity !== "string" || !binding.scopeIdentity || !Array.isArray(visibility) || !visibility.length || new Set(visibility).size !== visibility.length || visibility.some(value => !VISIBILITIES.has(value)) || (sharedScope ? visibility.length < 2 : binding.scopeIdentity !== stageScope) || !expectedDescriptors || descriptors.length !== 1 || !expectedDescriptors.includes(descriptors[0]) || !binding[descriptors[0]] || typeof binding[descriptors[0]] !== "object" || !validateBindingDescriptor(binding, descriptors[0]) || !validateTransformBinding(binding) || slots.has(slot) || scopes.has(binding.scopeIdentity)) {
    throw new Error(`CEWGPU WGSL layout ${layoutKey} binding ${index} is malformed or duplicated`);
  }
  const priorScopes = scopesByIdentity.get(identity) ?? new Set();
  if (sharedScope && Array.from(priorScopes).some(scope => scope !== identity) || !sharedScope && priorScopes.has(identity)) {
    throw new Error(`CEWGPU WGSL layout ${layoutKey} mixes shared and stage-scoped bindings`);
  }
  const priorVisibility = symbolVisibility.get(binding.generatedSymbol) ?? new Set();
  if (visibility.some(stage => priorVisibility.has(stage))) {
    throw new Error(`CEWGPU WGSL layout ${layoutKey} duplicates a shader binding symbol`);
  }
  slots.add(slot);
  scopes.add(binding.scopeIdentity);
  priorScopes.add(binding.scopeIdentity);
  scopesByIdentity.set(identity, priorScopes);
  for (const stage of visibility) priorVisibility.add(stage);
  symbolVisibility.set(binding.generatedSymbol, priorVisibility);
  return true;
}

/**
 * Validate the WebGPU layout descriptor attached to one binding.
 *
 * @param {object} binding Binding record.
 * @param {string} descriptor Descriptor property name.
 * @returns {boolean} True when the descriptor shape matches the resource kind.
 */
function validateBindingDescriptor(binding, descriptor) {
  const value = binding[descriptor];
  if (descriptor === "buffer") {
    const expectedType = {
      "uniform-buffer": "uniform",
      "sampled-resource": "read-only-storage",
      "storage-resource": "storage"
    }[binding.resourceKind];
    return BUFFER_TYPES.has(value.type) && value.type === expectedType && value.hasDynamicOffset === false && Number.isSafeInteger(value.minBindingSize) && value.minBindingSize > 0 && value.minBindingSize % (value.type === "uniform" ? 16 : 4) === 0 && !/^(?:sampler|texture_)/u.test(binding.type);
  }
  if (descriptor === "texture") {
    const expected = TEXTURE_BINDING_TYPES[binding.type];
    return binding.resourceKind === "sampled-resource" && !!expected && value.sampleType === expected.sampleType && value.viewDimension === expected.viewDimension && value.multisampled === expected.multisampled;
  }
  return descriptor === "sampler" && binding.resourceKind === "sampler" && SAMPLER_TYPES.has(value.type) && binding.type === (value.type === "comparison" ? "sampler_comparison" : "sampler");
}

/**
 * Validate optional compiler-owned resource-transform binding metadata.
 *
 * @param {object} binding Binding record.
 * @returns {boolean} True when transform fields are absent or coherent.
 */
function validateTransformBinding(binding) {
  const hasId = Object.prototype.hasOwnProperty.call(binding, "transformId");
  const hasLayers = Object.prototype.hasOwnProperty.call(binding, "arrayLayerCount");
  if (!hasId && !hasLayers) return true;
  return hasId && hasLayers && binding.resourceKind === "sampled-resource" && typeof binding.transformId === "string" && !!binding.transformId && Number.isSafeInteger(binding.arrayLayerCount) && binding.arrayLayerCount >= 2 && binding.type === "texture_2d_array<f32>" && binding.texture?.viewDimension === "2d-array";
}

/**
 * Compare two sets for exact membership.
 *
 * @param {Set<string>} left First set.
 * @param {Set<string>} right Second set.
 * @returns {boolean} True when both sets contain the same keys.
 */
function setsEqual(left, right) {
  return left.size === right.size && Array.from(left).every(value => right.has(value));
}

/**
 * Derive canonical pass keys from canonical shader keys.
 *
 * @param {object[]} shaders WGSL shader records.
 * @returns {Set<string>} Emitted pass keys.
 */
function collectShaderPassKeys(shaders) {
  return new Set(shaders.map(shader => `${shader.techniqueName}.pass${shader.passIndex}`));
}

/**
 * Validate the explicit or implicit WGSL selection against emitted shaders.
 *
 * @param {object} metadata META document.
 * @param {object[]} stages All selected-body analysis stage records.
 * @param {Set<string>} shaderKeys Emitted WGSL stage keys.
 * @returns {true} True when selection coverage is exact.
 */
function validateSelection(metadata, stages, shaderKeys) {
  const selection = metadata.wgslSelection;
  const analysisKeys = new Set(stages.map(stage => stage.key));
  if (selection === undefined) {
    if (!setsEqual(analysisKeys, shaderKeys)) {
      throw new Error("CEWGPU implicit WGSL selection does not cover every ANLS stage");
    }
    return true;
  }
  if (!selection || typeof selection !== "object" || Array.isArray(selection) || selection.mode !== "explicit" || selection.completePasses !== true || typeof selection.techniqueName !== "string" || !selection.techniqueName || selection.passIndex !== null && (!Number.isSafeInteger(selection.passIndex) || selection.passIndex < 0)) {
    throw new Error("CEWGPU META.wgslSelection is malformed");
  }
  const requestedStageNames = requireArray(selection, "requestedStageNames", "META.wgslSelection");
  const selectedStageKeys = requireArray(selection, "selectedStageKeys", "META.wgslSelection");
  const selectedStages = stages.filter(stage => stage.techniqueName === selection.techniqueName && (selection.passIndex === null || stage.passIndex === selection.passIndex));
  const selectedNames = new Set(selectedStages.map(stage => stage.stageName));
  const requestedNames = new Set(requestedStageNames);
  const expectedKeys = new Set(selectedStages.map(stage => stage.key));
  if (!selectedStages.length || selection.passIndex === null && requestedStageNames.length || requestedStageNames.some(name => !Object.prototype.hasOwnProperty.call(STAGE_SCHEMA, name)) || requestedNames.size !== requestedStageNames.length || requestedNames.size && !setsEqual(requestedNames, selectedNames) || selectedStageKeys.some(key => typeof key !== "string") || new Set(selectedStageKeys).size !== selectedStageKeys.length || !setsEqual(new Set(selectedStageKeys), expectedKeys) || !setsEqual(expectedKeys, shaderKeys)) {
    throw new Error("CEWGPU explicit WGSL selection does not match its complete ANLS scope");
  }
  return true;
}

/**
 * Validate selected-effect completeness flags and compact ANLS invariants.
 *
 * @param {object} info INFO document.
 * @param {object[]} stages ANLS stage records.
 * @returns {true} True when the partial-package boundary is truthful.
 */
function validatePartialBoundary(info, stages, effectName) {
  const completeness = info.completeness;
  const sourceComplete = info.formatVersion === 3;
  if (!completeness || typeof completeness !== "object" || completeness.packageValid !== true || completeness.sourceComplete !== sourceComplete || completeness.backendComplete !== false || completeness.runtimeComplete !== false) {
    throw new Error("CEWGPU INFO.completeness is inconsistent with source/backend coverage");
  }
  const expectedBackendCoverage = info.bodyMode === "all" ? ["all-unique", "partial"] : ["selected"];
  if (sourceComplete && (info.sourceBodyCoverage !== "all-unique" || !expectedBackendCoverage.includes(info.backendBodyCoverage))) {
    throw new Error("CEWGPU INFO v3 source/backend body coverage is inconsistent");
  }
  if (!sourceComplete && (Object.prototype.hasOwnProperty.call(info, "sourceBodyCoverage") || Object.prototype.hasOwnProperty.call(info, "backendBodyCoverage"))) {
    throw new Error("CEWGPU legacy INFO cannot declare version 3 body coverage");
  }
  for (const stage of stages) {
    const bytecode = stage.shaderBytecode;
    if (!bytecode || typeof bytecode !== "object" || Array.isArray(bytecode) || bytecode.stageType !== stage.stageType || bytecode.stageName !== stage.stageName || !Number.isSafeInteger(bytecode.shaderSize) || bytecode.shaderSize < 1 || !Number.isSafeInteger(bytecode.stringTableOffset) || bytecode.stringTableOffset < 0 || bytecode.effectName !== effectName || Object.prototype.hasOwnProperty.call(bytecode, "bytes") || !Number.isSafeInteger(stage.shaderHandle) || stage.shaderHandle < 0 || !validateAnalysisThreadGroup(stage) || !Array.isArray(stage.pipelineInputs) || stage.pipelineInputs.some(input => !validatePipelineInput(input)) || !Array.isArray(stage.bindings) || !validateAnalysisBindings(stage.bindings, stage.stageType) || stage.dxbc !== null || stage.dxbcError !== null || stage.ir !== null || stage.irError !== null) {
      throw new Error(`CEWGPU ANLS stage ${stage.key} embeds transient compiler data`);
    }
  }
  return true;
}

/**
 * Validate one ANLS thread-group record.
 *
 * @param {object} stage ANLS stage record.
 * @returns {boolean} True when its dimensions match the stage kind.
 */
function validateAnalysisThreadGroup(stage) {
  const size = stage.threadGroupSize;
  if (!size || typeof size !== "object" || Array.isArray(size) || ![size.x, size.y, size.z].every(value => Number.isSafeInteger(value) && value >= 0)) {
    return false;
  }
  return stage.stageName !== "compute" || [size.x, size.y, size.z].every(value => value >= 1);
}

/**
 * Validate one compact pipeline-input record.
 *
 * @param {object} input Pipeline-input record.
 * @returns {boolean} True when its numeric signature is representable.
 */
function validatePipelineInput(input) {
  return !!input && typeof input === "object" && !Array.isArray(input) && typeof input.usageName === "string" && !!input.usageName && ["registerIndex", "usage", "usageIndex", "usedMask", "type", "dimension"].every(field => Number.isSafeInteger(input[field]) && input[field] >= 0);
}

/**
 * Validate one stage's binding records and their producer precedence.
 *
 * @param {object[]} bindings Binding records.
 * @param {number} stageType Owning Trinity stage type.
 * @returns {boolean} True when the manifest records are unambiguous.
 */
function validateAnalysisBindings(bindings, stageType) {
  const exactIdentities = new Set();
  const byKindIndex = new Map();
  for (const binding of bindings) {
    if (!validateAnalysisBinding(binding, stageType)) return false;
    const exact = `${binding.kind}:${binding.registerSpace}:${binding.registerIndex}`;
    if (exactIdentities.has(exact)) return false;
    exactIdentities.add(exact);
    const kindIndex = `${binding.kind}:${binding.registerIndex}`;
    const records = byKindIndex.get(kindIndex) ?? [];
    records.push(binding);
    byKindIndex.set(kindIndex, records);
  }
  return Array.from(byKindIndex.values()).every(records => !records.some(binding => binding.sourceTruth === "carbon-register-map") || records.length === 1);
}

/**
 * Validate one compact ANLS binding-manifest record.
 *
 * @param {object} binding Binding record.
 * @param {number} stageType Owning Trinity stage type.
 * @returns {boolean} True when its source register identity is complete.
 */
function validateAnalysisBinding(binding, stageType) {
  if (!binding || typeof binding !== "object" || Array.isArray(binding)) return false;
  const classification = ANALYSIS_BINDING_KINDS[binding.kind];
  if (!classification) return false;
  const registerType = binding.registerType;
  const registerTypeMatches = Number.isSafeInteger(registerType) && (classification.registerTypes.length === 1 ? registerType === classification.registerTypes[0] : registerType >= classification.registerTypes[0] && registerType <= classification.registerTypes[1]);
  const carbonMatchesKind = validateAnalysisCarbon(binding.kind, binding.carbon);
  const sourceShapeMatches = binding.sourceTruth === "carbon-stage-register" ? registerTypeMatches && (binding.kind === "constantBuffer" ? binding.heapView === false && carbonMatchesKind : binding.dynamic === true && (binding.carbon === null || carbonMatchesKind)) : binding.sourceTruth === "carbon-signature-sampler" ? binding.kind === "sampler" && registerType === 1 && binding.registerCount === 1 && binding.arrayCount === 1 && carbonMatchesKind : binding.sourceTruth === "carbon-register-map" && binding.kind !== "constantBuffer" && registerType === null && binding.registerSpace === stageType && binding.dynamic === true && carbonMatchesKind && (binding.kind !== "sampler" || binding.registerCount === 1) && (binding.kind === "sampler" || binding.registerCount === (binding.carbon.arrayElements || 1));
  return sourceShapeMatches && Number.isSafeInteger(binding.registerIndex) && binding.registerIndex >= 0 && Number.isSafeInteger(binding.registerSpace) && binding.registerSpace >= 0 && Number.isSafeInteger(binding.registerCount) && binding.registerCount >= 1 && Number.isSafeInteger(binding.arrayCount) && binding.arrayCount >= 1 && binding.registerCount === binding.arrayCount && binding.generatedSymbol === `${classification.prefix}${binding.registerIndex}` && typeof binding.dynamic === "boolean" && typeof binding.heapView === "boolean" && Array.isArray(binding.annotations) && (binding.metadataName === null || typeof binding.metadataName === "string" && !!binding.metadataName);
}

/**
 * Validate the compact Carbon metadata payload for one binding class.
 *
 * @param {string} kind Binding kind.
 * @param {any} value Candidate Carbon payload.
 * @returns {boolean} True when the payload matches the producer's JSON shape.
 */
function validateAnalysisCarbon(kind, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (kind === "constantBuffer") {
    return typeof value.hasLocalConstants === "boolean" && Number.isSafeInteger(value.constantValueSize) && value.constantValueSize >= 0 && Array.isArray(value.constants) && value.constants.every(entry => !!entry && typeof entry === "object" && !Array.isArray(entry)) && (value.hasLocalConstants ? value.constants.length > 0 : value.constantValueSize === 0 && value.constants.length === 0);
  }
  if (kind === "sampler") {
    return (value.name === null || typeof value.name === "string") && validateAnalysisSampler(value.sampler);
  }
  return (value.name === null || typeof value.name === "string") && Number.isSafeInteger(value.type) && value.type >= 0 && Number.isSafeInteger(value.arrayElements) && value.arrayElements >= 0 && typeof value.isSRGB === "boolean" && typeof value.isAutoregister === "boolean";
}

/**
 * Validate one Carbon sampler-description snapshot.
 *
 * @param {any} value Candidate sampler description.
 * @returns {boolean} True when all authored sampler fields are present.
 */
function validateAnalysisSampler(value) {
  return !!value && typeof value === "object" && !Array.isArray(value) && typeof value.comparison === "boolean" && (value.isDynamic === undefined || typeof value.isDynamic === "boolean") && ["minFilter", "magFilter", "mipFilter", "addressU", "addressV", "addressW", "maxAnisotropy", "comparisonFunc"].every(field => Number.isSafeInteger(value[field]) && value[field] >= 0) && ["mipLODBias", "minLOD", "maxLOD"].every(field => Number.isFinite(value[field])) && (Number.isSafeInteger(value.borderColor) && value.borderColor >= 0 || Array.isArray(value.borderColor) && value.borderColor.length === 4 && value.borderColor.every(Number.isFinite));
}

/**
 * Validate the canonical selected-effect package envelope when declared.
 *
 * Generic CEWGPU packages without `INFO.packageKind: "tr2-effect-webgpu"`
 * remain readable and may contain unknown chunks or raw WGSL text.
 *
 * @param {object} pkg Loaded CEWGPU package.
 * @returns {true} True when the package is generic or the effect contract passes.
 */
function validateEffectPackageEnvelope(pkg) {
  if (!pkg.GetChunk("INFO")) return true;
  let info;
  try {
    info = pkg.GetJson("INFO");
  } catch (error) {
    throw new Error(`CEWGPU INFO must contain valid JSON: ${error.message}`);
  }
  if (!info || typeof info !== "object" || Array.isArray(info)) {
    throw new Error("CEWGPU INFO must contain a JSON object");
  }
  if (info.packageKind !== EFFECT_PACKAGE_KIND) return true;
  for (const tag of REQUIRED_EFFECT_CHUNKS) {
    if (!pkg.GetChunk(tag)) {
      throw new Error(`CEWGPU ${EFFECT_PACKAGE_KIND} package requires ${tag}`);
    }
  }
  const metadata = requireJsonObject(pkg, "META");
  const analysis = requireJsonObject(pkg, "ANLS");
  const wgsl = requireJsonObject(pkg, "WGSL");
  if (info.format !== "CEWGPU" || info.formatVersion !== EFFECT_INFO_VERSION) {
    throw new Error(`CEWGPU INFO schema must be selected-effect version ${EFFECT_INFO_VERSION}`);
  }
  if (analysis.format !== "CEWGPU_ANALYSIS" || analysis.formatVersion !== 1) {
    throw new Error("CEWGPU ANLS schema must be CEWGPU_ANALYSIS version 1");
  }
  if (wgsl.format !== "CJS_WGSL_SET" || wgsl.formatVersion !== WGSL_SET_VERSION) {
    throw new Error("CEWGPU WGSL schema must be CJS_WGSL_SET version 3");
  }
  const stages = requireArray(analysis, "stages", "ANLS");
  const passes = requireArray(analysis, "passes", "ANLS");
  const shaders = requireArray(wgsl, "shaders", "WGSL");
  const layouts = requireArray(wgsl, "layouts", "WGSL");
  if (!stages.length || !shaders.length || !layouts.length) {
    throw new Error("CEWGPU selected-effect documents must contain stages, shaders, and layouts");
  }
  if (requireCount(info.stageCount, "INFO.stageCount") !== stages.length || requireCount(info.selectedStageCount, "INFO.selectedStageCount") !== shaders.length || requireCount(info.shaderCount, "INFO.shaderCount") !== shaders.length || requireCount(info.layoutCount, "INFO.layoutCount") !== layouts.length) {
    throw new Error("CEWGPU INFO counts do not match ANLS/WGSL documents");
  }
  const sourcePath = requireString(info.sourcePath, "INFO.sourcePath");
  if (info.formatVersion === 1 && info.translator !== DXBC_WGSL_TRANSLATOR_NAME) {
    throw new Error("CEWGPU INFO.translator must identify dxbc-js-wgsl");
  }
  if (info.formatVersion >= 2) {
    if (info.targetBackend !== WEBGPU_BACKEND_NAME) {
      throw new Error("CEWGPU INFO.targetBackend must identify webgpu");
    }
    if (info.backendPackage !== FORMAT_WEBGPU_PACKAGE_NAME || typeof info.backendPackageVersion !== "string" || !SEMANTIC_VERSION.test(info.backendPackageVersion)) {
      throw new Error("CEWGPU INFO.backendPackage provenance is malformed");
    }
    if (info.translator !== DXBC_WGSL_TRANSLATOR_NAME || typeof info.translatorVersion !== "string" || !SEMANTIC_VERSION.test(info.translatorVersion)) {
      throw new Error("CEWGPU INFO.translator provenance is malformed");
    }
  }
  validateSourceIdentity(info.sourceIdentity, info.formatVersion >= 2);
  const permutationGraph = validatePermutationGraphReference(pkg, info);
  validateBackendBodySetReference(pkg, info, permutationGraph);
  const effectReflection = readEffectReflectionReference(pkg, info);
  if (info.outputPath !== null && (typeof info.outputPath !== "string" || !info.outputPath)) {
    throw new Error("CEWGPU INFO.outputPath must be a non-empty string or null");
  }
  const effectName = requireString(metadata.effectName, "META.effectName");
  const bodyIndex = requireCount(metadata.bodyIndex, "META.bodyIndex");
  const metadataOptions = validateSelectedOptions(metadata.selectedOptions, "META.selectedOptions");
  validateSelectedOptions(analysis.selectedOptions, "ANLS.selectedOptions");
  if (!Number.isSafeInteger(analysis.effectVersion) || analysis.effectVersion < 8 || analysis.effectVersion > 15 || analysis.compilerVersion !== null && (!Number.isSafeInteger(analysis.compilerVersion) || analysis.compilerVersion < 0)) {
    throw new Error("CEWGPU ANLS effect/compiler version metadata is malformed");
  }
  requireString(metadata.sourcePath, "META.sourcePath");
  requireString(analysis.source, "ANLS.source");
  requireString(analysis.effectName, "ANLS.effectName");
  requireCount(analysis.bodyIndex, "ANLS.bodyIndex");
  if (info.bodyMode !== "selected" && info.bodyMode !== "all" || metadata.bodyMode !== info.bodyMode || metadata.sourcePath !== sourcePath || analysis.source !== sourcePath) {
    throw new Error("CEWGPU INFO/META/ANLS source or body mode disagree");
  }
  if (effectName !== analysis.effectName || bodyIndex !== analysis.bodyIndex || !jsonEqual(metadataOptions, analysis.selectedOptions)) {
    throw new Error("CEWGPU META and ANLS effect selection disagree");
  }
  if (permutationGraph) {
    validatePermutationGraphSelection(permutationGraph, bodyIndex, metadataOptions);
  }
  if (effectReflection) {
    if (!permutationGraph) {
      throw new Error("CEWGPU effect reflection requires PGRF");
    }
    const reflectionCounts = validateEffectReflectionPointer(effectReflection.pointer, effectReflection.reflection, effectReflection.blobBytes, {
      permutationGraph,
      permutationIndex: bodyIndex,
      sourceIdentity: info.sourceIdentity,
      sourcePath,
      reflectionBytes: effectReflection.reflectionBytes
    });
    if (info.formatVersion === 3) {
      if (effectReflection.pointer.formatVersion !== EFFECT_REFLECTION_VERSION || info.sourceBodyCoverage !== "all-unique" || !(info.bodyMode === "all" ? ["all-unique", "partial"].includes(info.backendBodyCoverage) : info.backendBodyCoverage === "selected") || reflectionCounts.permutationCount !== permutationGraph.variants.length || reflectionCounts.bodyCount !== permutationGraph.bodies.length) {
        throw new Error("CEWGPU INFO v3 source/backend body coverage is inconsistent");
      }
    } else if (effectReflection.pointer.formatVersion === EFFECT_REFLECTION_VERSION) {
      throw new Error("CEWGPU complete RFLX requires INFO version 3");
    }
    if (effectReflection.reflection.source.effectVersion !== analysis.effectVersion || effectReflection.reflection.source.compilerVersion !== analysis.compilerVersion) {
      throw new Error("CEWGPU RFLX source versions disagree with ANLS");
    }
  }
  const analysisPassKeys = collectAnalysisPassKeys(passes);
  const analysisKeys = collectStageKeys(stages, "ANLS");
  if (effectReflection) {
    validateReflectionAnalysis(effectReflectionForPermutation(effectReflection.reflection, permutationGraph, bodyIndex), passes, stages);
  }
  const shaderKeys = collectStageKeys(shaders, "WGSL");
  if (stages.some(stage => !analysisPassKeys.has(`${stage.techniqueName}.pass${stage.passIndex}`))) {
    throw new Error("CEWGPU ANLS stage references an absent pass");
  }
  if (Array.from(shaderKeys).some(key => !analysisKeys.has(key))) {
    throw new Error("CEWGPU WGSL contains a shader absent from ANLS");
  }
  const layoutKeys = collectLayoutKeys(layouts);
  const shaderPassKeys = collectShaderPassKeys(shaders);
  if (!setsEqual(layoutKeys, shaderPassKeys)) {
    throw new Error("CEWGPU WGSL layouts do not match emitted shader passes");
  }
  validateLayoutVisibility(layouts, shaders);
  validateComputeSizes(stages, shaders);
  validateSelection(metadata, stages, shaderKeys);
  validateResourceTransforms(wgsl, layoutKeys, shaderKeys, layouts);
  validatePartialBoundary(info, stages, effectName);
  markEffectPackageValidated(pkg);
  return true;
}

/**
 * Reconcile complete source reflection with compact ANLS identities.
 *
 * @param {object} reflectedEffect Selected body-local reflected effect graph.
 * @param {object[]} analysisPasses Validated ANLS pass records.
 * @param {object[]} analysisStages Validated ANLS stage records.
 * @returns {true} True when the two documents agree.
 */
function validateReflectionAnalysis(reflectedEffect, analysisPasses, analysisStages) {
  const reflectedPasses = new Map();
  const reflectedStages = new Map();
  for (const technique of reflectedEffect.techniques) {
    for (const [passIndex, pass] of technique.passes.entries()) {
      const passKey = `${technique.name}.pass${passIndex}`;
      if (reflectedPasses.has(passKey)) {
        throw new Error(`CEWGPU RFLX contains duplicate pass ${passKey}`);
      }
      reflectedPasses.set(passKey, pass);
      for (const stage of pass.stages) {
        const stageKey = `${passKey}.${stage.stageName}`;
        if (reflectedStages.has(stageKey)) {
          throw new Error(`CEWGPU RFLX contains duplicate stage ${stageKey}`);
        }
        reflectedStages.set(stageKey, stage);
      }
    }
  }
  if (reflectedPasses.size !== analysisPasses.length || reflectedStages.size !== analysisStages.length) {
    throw new Error("CEWGPU RFLX and ANLS pass/stage counts disagree");
  }
  for (const pass of analysisPasses) {
    const key = `${pass.techniqueName}.pass${pass.passIndex}`;
    const reflected = reflectedPasses.get(key);
    if (!reflected || !jsonEqual(reflected.renderStates, pass.states)) {
      throw new Error(`CEWGPU RFLX pass ${key} disagrees with ANLS`);
    }
  }
  for (const stage of analysisStages) {
    const reflected = reflectedStages.get(stage.key);
    const program = reflected?.sourceProgram;
    const signature = reflected?.input?.signature;
    if (!reflected || reflected.stageType !== stage.stageType || reflected.stageName !== stage.stageName || program?.kind !== "stage" || program.stageType !== stage.stageType || program.stageName !== stage.stageName || program.shaderSize !== stage.shaderBytecode?.shaderSize || program.stringTableOffset !== stage.shaderBytecode?.stringTableOffset || !jsonEqual(signature?.threadGroupSize, stage.threadGroupSize) || !samePipelineInputs(signature?.pipelineInputs, stage.pipelineInputs)) {
      throw new Error(`CEWGPU RFLX stage ${stage.key} disagrees with ANLS`);
    }
  }
  return true;
}

/**
 * Compare authored pipeline-input numeric fields while ignoring ANLS display
 * names.
 *
 * @param {object[]} reflected RFLX pipeline inputs.
 * @param {object[]} analysis ANLS pipeline inputs.
 * @returns {boolean} True when the ordered source fields agree.
 */
function samePipelineInputs(reflected, analysis) {
  const fields = ["usage", "registerIndex", "usageIndex", "usedMask", "type", "dimension"];
  return Array.isArray(reflected) && Array.isArray(analysis) && reflected.length === analysis.length && reflected.every((entry, index) => fields.every(field => entry[field] === analysis[index]?.[field]));
}

/**
 * Require binding visibility to name stages emitted by the owning pass.
 *
 * @param {object[]} layouts WGSL layout records.
 * @param {object[]} shaders WGSL shader records.
 * @returns {true} True when visibility does not claim absent stages.
 */
function validateLayoutVisibility(layouts, shaders) {
  for (const layout of layouts) {
    const passStages = new Set(shaders.filter(shader => shader.techniqueName === layout.techniqueName && shader.passIndex === layout.passIndex).map(shader => shader.stage));
    for (const binding of layout.bindGroups.flatMap(group => group.bindings)) {
      if (binding.visibility.some(stage => !passStages.has(stage))) {
        throw new Error(`CEWGPU WGSL layout ${layout.key} exposes an absent shader stage`);
      }
    }
  }
  return true;
}

/**
 * Reconcile compute thread-group metadata between ANLS and WGSL.
 *
 * @param {object[]} stages ANLS stage records.
 * @param {object[]} shaders WGSL shader records.
 * @returns {true} True when every compute size is exact.
 */
function validateComputeSizes(stages, shaders) {
  for (const shader of shaders.filter(entry => entry.stageName === "compute")) {
    const stage = stages.find(entry => entry.key === shader.key);
    const size = stage?.threadGroupSize;
    if (!size || typeof size !== "object" || Array.isArray(size) || ![size.x, size.y, size.z].every(value => Number.isSafeInteger(value) && value >= 1) || !jsonEqual([size.x, size.y, size.z], shader.threadGroupSize)) {
      throw new Error(`CEWGPU compute stage ${shader.key} has inconsistent thread-group metadata`);
    }
  }
  return true;
}

/**
 * Validate WGSL-set version coupling and resource-transform links.
 *
 * @param {object} wgsl WGSL document.
 * @param {Set<string>} layoutKeys Canonical emitted layout keys.
 * @param {Set<string>} shaderKeys Canonical emitted shader keys.
 * @param {object[]} layouts WGSL layout records.
 * @returns {true} True when transform metadata is coherent.
 */
function validateResourceTransforms(wgsl, layoutKeys, shaderKeys, layouts) {
  const hasTransforms = Object.prototype.hasOwnProperty.call(wgsl, "resourceTransforms");
  const transformedBindings = layouts.flatMap(layout => layout.bindGroups.flatMap(group => group.bindings.filter(binding => binding.transformId)));
  // Resource transforms are an optional payload, not a schema version: a
  // package either declares them and binds them, or declares neither.
  if (!hasTransforms) {
    if (transformedBindings.length) {
      throw new Error("CEWGPU WGSL transformed bindings require resource recipes");
    }
    return true;
  }
  if (!transformedBindings.length) {
    throw new Error("CEWGPU WGSL resource transforms require transformed bindings");
  }
  const plan = normalizeResourceTransformPlan({
    format: "CJS_WGSL_RESOURCE_TRANSFORM_PLAN",
    formatVersion: 1,
    resourceTransforms: wgsl.resourceTransforms
  });
  const transformIds = new Set(plan.resourceTransforms.map(transform => transform.id));
  if (transformedBindings.some(binding => !transformIds.has(binding.transformId))) {
    throw new Error("CEWGPU WGSL binding references an absent resource transform");
  }
  for (const transform of plan.resourceTransforms) {
    if (!layoutKeys.has(transform.layoutKey) || !shaderKeys.has(`${transform.layoutKey}.pixel`)) {
      throw new Error(`CEWGPU WGSL resource transform ${transform.id} targets an absent pass`);
    }
    const layout = layouts.find(entry => entry.key === transform.layoutKey);
    const bindings = layout.bindGroups.flatMap(group => group.bindings);
    const links = bindings.filter(binding => binding.transformId === transform.id);
    if (links.length !== 1) {
      throw new Error(`CEWGPU WGSL resource transform ${transform.id} must link one binding`);
    }
    const binding = links[0];
    if (binding.identity !== transform.output.identity || binding.scopeIdentity !== transform.output.scopeIdentity || binding.texture?.viewDimension !== transform.output.viewDimension || binding.arrayLayerCount !== transform.output.layerCount) {
      throw new Error(`CEWGPU WGSL resource transform ${transform.id} disagrees with its binding`);
    }
    const physicalScopes = new Set(bindings.map(entry => entry.scopeIdentity));
    if (transform.inputs.slice(1).some(input => physicalScopes.has(input.scopeIdentity))) {
      throw new Error(`CEWGPU WGSL resource transform ${transform.id} retains a removed input`);
    }
  }
  return true;
}

export { EFFECT_INFO_VERSION, validateEffectPackageEnvelope };
//# sourceMappingURL=effectPackageValidation.js.map
