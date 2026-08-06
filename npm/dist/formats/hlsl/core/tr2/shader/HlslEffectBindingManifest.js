import { HlslRenderContextEnum, hlslShaderStageName } from '../HlslRenderContextEnum.js';

/**
 * Carbon-backed binding manifest for register-named shader outputs.
 *
 * This maps generated fallback symbols such as `cb0`, `t3`, `s0`, and `u1`
 * back to the exact stage metadata read from Trinity effect data.
 */
class HlslEffectBindingManifest {
  /**
  * Builds a manifest from a loaded `HlslEffectRes`.
  *
  * @param {object} effectRes Loaded effect resource with `GetShader()`.
  * @param {object} [options] Manifest options.
  * @returns {HlslEffectBindingManifest} Carbon binding manifest.
  */
  static fromTr2EffectRes(effectRes, options = {}) {
    const shader = effectRes.GetShader();
    return HlslEffectBindingManifest.fromEffectDescription(shader.GetEffectDescription(), options);
  }

  /**
  * Builds a manifest from a decoded `HlslEffectDescription`.
  *
  * @param {object} effectDescription Decoded effect description.
  * @param {object} [options] Manifest options.
  * @returns {HlslEffectBindingManifest} Carbon binding manifest.
  */
  static fromEffectDescription(effectDescription, options = {}) {
    return new HlslEffectBindingManifest(effectDescription, options);
  }

  /**
  * Creates a binding manifest.
  *
  * @param {object} effectDescription Decoded effect description.
  * @param {object} [options] Manifest options.
  */
  constructor(effectDescription, options = {}) {
    this.effectName = effectDescription?.effectName || options.effectName || "";
    this.version = effectDescription?.version || 0;
    this.passes = buildPasses(effectDescription);
    this.stages = buildStages(effectDescription);
  }

  /**
  * Resolves a generated binding symbol for one stage.
  *
  * @param {object} query Stage and symbol query.
  * @param {string} query.techniqueName Technique name.
  * @param {number} query.passIndex Pass index.
  * @param {number} [query.stageType] Trinity stage enum value.
  * @param {string} [query.stageName] Stage name.
  * @param {string} query.symbol Generated symbol such as `cb0` or `t3`.
  * @param {number} [query.registerSpace] Optional D3D register-space disambiguator.
  * @returns {object|null} Matching binding record, or null.
  */
  resolve(query) {
    const stage = this.stages.find(entry => entry.techniqueName === query.techniqueName && entry.passIndex === query.passIndex && (Number.isInteger(query.stageType) ? entry.stageType === query.stageType : entry.stageName === query.stageName));
    if (!stage) return null;
    return stage.bindings.find(entry => entry.generatedSymbol === query.symbol && (!Number.isInteger(query.registerSpace) || entry.registerSpace === query.registerSpace)) || null;
  }

  /**
  * Returns a JSON-safe manifest snapshot.
  *
  * @returns {object} Serializable binding manifest.
  */
  toJSON() {
    return {
      effectName: this.effectName,
      version: this.version,
      passes: this.passes.map(entry => cloneJson(entry)),
      stages: this.stages.map(entry => cloneJson(entry))
    };
  }
}

/**
 * Builds pass render-state records from the decoded effect description.
 *
 * @param {object} effectDescription Decoded effect description.
 * @returns {object[]} Pass render-state manifest records.
 */
function buildPasses(effectDescription) {
  const passes = [];
  for (const technique of effectDescription?.techniques || []) {
    for (let passIndex = 0; passIndex < technique.passes.length; passIndex += 1) {
      const pass = technique.passes[passIndex];
      passes.push({
        techniqueName: technique.name,
        passIndex,
        renderStates: pass.renderStates,
        states: (pass.cjsRenderStateSetup?.entries || []).map(({
          key,
          value
        }) => ({
          state: key,
          value
        }))
      });
    }
  }
  return passes;
}

/**
 * Builds all stage records from the decoded effect description.
 *
 * @param {object} effectDescription Decoded effect description.
 * @returns {object[]} Stage binding manifest records.
 */
function buildStages(effectDescription) {
  const stages = [];
  for (const technique of effectDescription?.techniques || []) {
    for (let passIndex = 0; passIndex < technique.passes.length; passIndex += 1) {
      const pass = technique.passes[passIndex];
      for (let stageType = 0; stageType < HlslRenderContextEnum.SHADER_TYPE_COUNT; stageType += 1) {
        const stage = pass.stageInputs[stageType];
        if (!stage?.m_exists) continue;
        stages.push(buildStage(effectDescription, technique.name, passIndex, pass, stageType, stage));
      }
    }
  }
  return stages;
}

/**
 * Builds one stage binding manifest record.
 *
 * @param {object} effectDescription Decoded effect description.
 * @param {string} techniqueName Technique name.
 * @param {number} passIndex Pass index.
 * @param {object} pass Pass metadata.
 * @param {number} stageType Stage enum value.
 * @param {object} stage Stage input metadata.
 * @returns {object} Stage binding record.
 */
function buildStage(effectDescription, techniqueName, passIndex, pass, stageType, stage) {
  const bindings = [];
  const seen = new Set();
  for (const register of stage.signature?.registers || []) {
    const binding = buildRegisterBinding(effectDescription, pass, stageType, stage, register);
    if (!binding) continue;
    const identity = bindingIdentity(binding.kind, binding.registerSpace, binding.registerIndex);
    if (seen.has(identity)) continue;
    seen.add(identity);
    bindings.push(binding);
  }
  addSignatureSamplerBindings(effectDescription, pass, stageType, stage, bindings, seen);
  addMapBindings(effectDescription, pass, stageType, stage, bindings, seen, "resource", "t", stage.resources);
  addMapBindings(effectDescription, pass, stageType, stage, bindings, seen, "sampler", "s", stage.samplers);
  addMapBindings(effectDescription, pass, stageType, stage, bindings, seen, "uav", "u", stage.uavs);
  return {
    techniqueName,
    passIndex,
    stageType,
    stageName: hlslShaderStageName(stageType),
    shaderHandle: stage.m_shader,
    shaderBytecode: stage.cjsShaderBytecode?.toJSON?.() ?? stage.cjsShaderBytecode,
    pipelineInputs: cloneJson(stage.signature?.pipelineInputs || []),
    threadGroupSize: cloneJson(stage.signature?.threadGroupSize || null),
    bindings
  };
}

/**
 * Adds v13+ static samplers, which Carbon stores separately from the general
 * signature register list. In particular, SM 5.1 effects may declare `s0`
 * only in `signature.samplers`.
 *
 * @param {object} effectDescription Decoded effect description.
 * @param {object} pass Pass metadata.
 * @param {number} stageType Stage enum value.
 * @param {object} stage Stage input metadata.
 * @param {object[]} bindings Destination bindings.
 * @param {Set<string>} seen Class/space/register identities already added.
 */
function addSignatureSamplerBindings(effectDescription, pass, stageType, stage, bindings, seen) {
  for (const sampler of stage.signature?.samplers || []) {
    if (!Number.isInteger(sampler?.registerIndex)) continue;
    const registerSpace = Number.isInteger(sampler.registerSpace) ? sampler.registerSpace : stageType;
    const identity = bindingIdentity("sampler", registerSpace, sampler.registerIndex);
    if (seen.has(identity)) continue;
    const mapMetadata = stage.samplers.get(sampler.registerIndex) || null;
    const name = metadataName("sampler", mapMetadata || sampler, stage, sampler.registerIndex);
    bindings.push({
      kind: "sampler",
      generatedSymbol: `s${sampler.registerIndex}`,
      registerIndex: sampler.registerIndex,
      registerType: 1,
      registerSpace,
      registerCount: 1,
      arrayCount: 1,
      dynamic: Boolean(mapMetadata?.sampler?.isDynamic),
      metadataName: name,
      carbon: {
        name: mapMetadata?.name || null,
        sampler: cloneJson(sampler.sampler)
      },
      annotations: annotationsFor(effectDescription, name),
      heapView: isHeapView(pass, "sampler", stageType, sampler.registerIndex),
      sourceTruth: "carbon-signature-sampler"
    });
    seen.add(identity);
  }
}

/**
 * Builds one binding from a Carbon register declaration.
 *
 * @param {object} effectDescription Decoded effect description.
 * @param {object} pass Pass metadata.
 * @param {number} stageType Stage enum value.
 * @param {object} stage Stage input metadata.
 * @param {object} register Carbon register declaration.
 * @returns {object|null} Binding record.
 */
function buildRegisterBinding(effectDescription, pass, stageType, stage, register) {
  const classification = classifyRegister(register.registerType);
  if (!classification) return null;
  const metadata = metadataForBinding(stage, classification.kind, register.registerIndex);
  const generatedSymbol = `${classification.prefix}${register.registerIndex}`;
  return {
    kind: classification.kind,
    generatedSymbol,
    registerIndex: register.registerIndex,
    registerType: register.registerType,
    registerSpace: register.registerSpace,
    registerCount: register.registerCount,
    arrayCount: register.arrayCount,
    dynamic: Boolean(register.dynamic),
    metadataName: metadataName(classification.kind, metadata, stage, register.registerIndex),
    carbon: carbonPayload(classification.kind, metadata, stage, register.registerIndex),
    annotations: annotationsFor(effectDescription, metadataName(classification.kind, metadata, stage, register.registerIndex)),
    heapView: isHeapView(pass, classification.kind, stageType, register.registerIndex),
    sourceTruth: "carbon-stage-register"
  };
}

/**
 * Adds bindings found in Carbon maps but absent from the signature register list.
 *
 * @param {object} effectDescription Decoded effect description.
 * @param {object} pass Pass metadata.
 * @param {number} stageType Stage enum value.
 * @param {object} stage Stage input metadata.
 * @param {object[]} bindings Destination bindings.
 * @param {Set<string>} seen Generated symbols already added.
 * @param {string} kind Binding kind.
 * @param {string} prefix Generated symbol prefix.
 * @param {Map<number, object>} map Carbon register map.
 */
function addMapBindings(effectDescription, pass, stageType, stage, bindings, seen, kind, prefix, map) {
  for (const [registerIndex, metadata] of map.entries()) {
    // Carbon register maps do not carry a register space. When an exact
    // signature source already names this class/index, it wins regardless
    // of space; treating stageType as an additional exact space would
    // manufacture duplicate SM 5.1 bindings.
    if (bindings.some(entry => entry.kind === kind && entry.registerIndex === registerIndex)) continue;
    const registerSpace = stageType;
    const identity = bindingIdentity(kind, registerSpace, registerIndex);
    const generatedSymbol = `${prefix}${registerIndex}`;
    if (seen.has(identity)) continue;
    bindings.push({
      kind,
      generatedSymbol,
      registerIndex,
      registerType: null,
      registerSpace,
      registerCount: metadata?.arrayElements || 1,
      arrayCount: metadata?.arrayElements || 1,
      dynamic: true,
      metadataName: metadataName(kind, metadata, stage, registerIndex),
      carbon: carbonPayload(kind, metadata, stage, registerIndex),
      annotations: annotationsFor(effectDescription, metadataName(kind, metadata, stage, registerIndex)),
      heapView: isHeapView(pass, kind, stageType, registerIndex),
      sourceTruth: "carbon-register-map"
    });
    seen.add(identity);
  }
}

/**
 * Builds a class-aware identity for one D3D register binding.
 *
 * @param {string} kind Binding class.
 * @param {number} registerSpace D3D register space.
 * @param {number} registerIndex D3D register index.
 * @returns {string} Stable identity.
 */
function bindingIdentity(kind, registerSpace, registerIndex) {
  return `${kind}:${registerSpace}:${registerIndex}`;
}

/**
 * Classifies a Carbon register type into generated-symbol kind.
 *
 * @param {number} registerType Carbon register type.
 * @returns {{kind:string,prefix:string}|null} Binding classification.
 */
function classifyRegister(registerType) {
  if (registerType === 0) return {
    kind: "constantBuffer",
    prefix: "cb"
  };
  if (registerType === 1) return {
    kind: "sampler",
    prefix: "s"
  };
  if (registerType >= 32 && registerType <= 63) return {
    kind: "resource",
    prefix: "t"
  };
  if (registerType >= 64 && registerType <= 95) return {
    kind: "uav",
    prefix: "u"
  };
  return null;
}

/**
 * Gets register metadata for a classified binding.
 *
 * @param {object} stage Stage input metadata.
 * @param {string} kind Binding kind.
 * @param {number} registerIndex Register index.
 * @returns {object|null} Carbon metadata object.
 */
function metadataForBinding(stage, kind, registerIndex) {
  if (kind === "resource") return stage.resources.get(registerIndex) || null;
  if (kind === "sampler") return stage.samplers.get(registerIndex) || null;
  if (kind === "uav") return stage.uavs.get(registerIndex) || null;
  return null;
}

/**
 * Gets the best Carbon metadata name for one binding.
 *
 * @param {string} kind Binding kind.
 * @param {object|null} metadata Carbon metadata object.
 * @param {object} stage Stage input metadata.
 * @param {number} registerIndex Register index.
 * @returns {string|null} Metadata name.
 */
function metadataName(kind, metadata, stage, registerIndex) {
  if (metadata?.name) return metadata.name;
  if (kind === "constantBuffer" && registerIndex === 0 && stage.constants.length) return "$LocalConstants";
  return null;
}

/**
 * Builds the Carbon metadata payload for one binding.
 *
 * @param {string} kind Binding kind.
 * @param {object|null} metadata Carbon metadata object.
 * @param {object} stage Stage input metadata.
 * @param {number} registerIndex Register index.
 * @returns {object|null} JSON-safe Carbon payload.
 */
function carbonPayload(kind, metadata, stage, registerIndex) {
  if (kind === "constantBuffer") {
    const hasLocalConstants = registerIndex === 0 && stage.constants.length > 0;
    return {
      hasLocalConstants,
      constantValueSize: hasLocalConstants ? stage.m_constantValueSize : 0,
      constants: hasLocalConstants ? stage.constants.map(entry => entry?.toJSON?.() ?? entry) : [],
      // The exact authored default bytes for the stage's local constant
      // buffer. A consumer that zero-fills instead of using these
      // changes every authored default the scene does not override -
      // the effect-resource contract calls the bytes mandatory, and a
      // background effect whose Tint and intensity read zero renders
      // pure black while drawing "correctly".
      constantValues: hasLocalConstants && stage.constantValues ? Array.from(stage.constantValues) : []
    };
  }
  return metadata?.toJSON?.() ?? cloneJson(metadata);
}

/**
 * Gets top-level annotations for a named parameter.
 *
 * @param {object} effectDescription Decoded effect description.
 * @param {string|null} name Parameter name.
 * @returns {object[]} JSON-safe annotations.
 */
function annotationsFor(effectDescription, name) {
  if (!name) return [];
  const annotations = effectDescription.annotations?.get(name) || [];
  return annotations.map(entry => entry?.toJSON?.() ?? entry);
}

/**
 * Checks whether a binding is marked as a heap view in the resource-set description.
 *
 * @param {object} pass Pass metadata.
 * @param {string} kind Binding kind.
 * @param {number} stageType Stage enum value.
 * @param {number} registerIndex Register index.
 * @returns {boolean} True when the binding is a heap view.
 */
function isHeapView(pass, kind, stageType, registerIndex) {
  const heapKind = kind === "resource" ? "srv" : kind === "sampler" ? "sampler" : kind === "uav" ? "uav" : null;
  if (!heapKind) return false;
  return Boolean(pass.resourceSetDesc?.heapViews?.some(entry => entry.kind === heapKind && entry.stageType === stageType && entry.registerIndex === registerIndex));
}

/**
 * Deep-clones JSON-like values.
 *
 * @param {*} value Value to clone.
 * @returns {*} JSON-like clone.
 */
function cloneJson(value) {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneJson(entry)]));
  }
  return value;
}

export { HlslEffectBindingManifest };
//# sourceMappingURL=HlslEffectBindingManifest.js.map
