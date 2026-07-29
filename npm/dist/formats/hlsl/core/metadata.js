import { emitRenderStates } from './render-states.js';
import { hlslShaderStageName } from './tr2/HlslRenderContextEnum.js';

/**
 * Metadata-only projection for decoded Tr2 effect containers.
 *
 * This keeps the public shader-inspection endpoint small: permutation axes,
 * selected option sets, techniques, passes, stage inputs, constants,
 * resources, UAVs, samplers, pass render states, and signatures. It
 * intentionally omits shader bytecode, constant value bytes, render-state
 * handles, and other runtime renderer state.
 */


/**
 * Normalize caller-supplied permutation option selections.
 *
 * @param {Array<object>|Map<string, string>|null|undefined} options Option input.
 * @param {string} source Source label for emitted selections.
 * @returns {object[]} Normalized option selections.
 */
function normalizeOptionSelections(options, source) {
  if (options instanceof Map) {
    return Array.from(options.entries()).map(([name, value]) => ({
      name,
      value,
      source
    }));
  }
  if (!Array.isArray(options)) {
    return [];
  }
  return options.map(entry => ({
    name: entry?.name || "",
    value: entry?.value || "",
    source
  }));
}

/**
 * Emit one permutation axis.
 *
 * @param {object} permutation Decoded permutation axis.
 * @returns {object} Plain metadata.
 */
function emitPermutation(permutation) {
  return {
    name: permutation.name,
    options: permutation.options.slice(),
    defaultOption: permutation.defaultOption,
    defaultValue: permutation.options[permutation.defaultOption] ?? null,
    description: permutation.description,
    type: permutation.type
  };
}

/**
 * Resolve the option set that Carbon's `GetShader` lookup will use.
 *
 * @param {object} effect Loaded HlslEffectRes.
 * @param {Array<object>|Map<string, string>|null|undefined} options Local option selections.
 * @returns {{bodyIndex: number, selectedOptions: object[]}} Resolved body index and options.
 */
function resolveSelectedOptions(effect, options = null) {
  const localOptions = normalizeOptionSelections(options, "local");
  const globalOptions = normalizeOptionSelections(effect.constructor.globalEffectOptions || [], "global");
  const selectedOptions = [];
  let multiplier = 1;
  let bodyIndex = 0;
  for (const permutation of effect.m_permutations) {
    let optionIndex = permutation.defaultOption;
    let source = "default";
    const globalOption = globalOptions.find(entry => entry.name === permutation.name);
    const localOption = localOptions.find(entry => entry.name === permutation.name);
    const selected = globalOption || localOption;
    if (selected) {
      const selectedIndex = permutation.options.findIndex(option => option === selected.value);
      if (selectedIndex >= 0) {
        optionIndex = selectedIndex;
        source = selected.source;
      }
    }
    selectedOptions.push({
      name: permutation.name,
      value: permutation.options[optionIndex] ?? null,
      optionIndex,
      defaultOption: permutation.defaultOption,
      defaultValue: permutation.options[permutation.defaultOption] ?? null,
      source
    });
    bodyIndex += optionIndex * multiplier;
    multiplier *= permutation.options.length || 1;
  }
  return {
    bodyIndex,
    selectedOptions
  };
}

/**
 * Emit one constant-buffer field metadata record.
 *
 * @param {object} constant Decoded constant metadata.
 * @returns {object} Plain metadata.
 */
function emitConstant(constant) {
  return {
    name: constant.name,
    offset: constant.offset,
    size: constant.size,
    type: constant.type,
    dimension: constant.dimension,
    elements: constant.elements,
    isSRGB: constant.isSRGB,
    isAutoregister: constant.isAutoregister
  };
}

/**
 * Emit one SRV/UAV metadata record.
 *
 * @param {number} registerIndex Shader register index.
 * @param {object} resource Decoded resource metadata.
 * @returns {object} Plain metadata.
 */
function emitResource(registerIndex, resource) {
  return {
    registerIndex,
    name: resource.name,
    type: resource.type,
    arrayElements: resource.arrayElements,
    isSRGB: resource.isSRGB,
    isAutoregister: resource.isAutoregister
  };
}

/**
 * Emit one sampler metadata record.
 *
 * @param {number} registerIndex Shader register index.
 * @param {object} samplerSetup Decoded sampler setup.
 * @returns {object} Plain metadata.
 */
function emitSampler(registerIndex, samplerSetup) {
  const sampler = samplerSetup.sampler || {};
  return {
    registerIndex,
    name: samplerSetup.name,
    isDynamic: !!sampler.isDynamic,
    comparison: !!sampler.comparison,
    minFilter: sampler.minFilter,
    magFilter: sampler.magFilter,
    mipFilter: sampler.mipFilter,
    addressU: sampler.addressU,
    addressV: sampler.addressV,
    addressW: sampler.addressW,
    mipLODBias: sampler.mipLODBias,
    maxAnisotropy: sampler.maxAnisotropy,
    comparisonFunc: sampler.comparisonFunc,
    borderColor: (sampler.borderColor || []).slice(),
    minLOD: sampler.minLOD,
    maxLOD: sampler.maxLOD
  };
}

/**
 * Emit one stage or library input.
 *
 * @param {object} stageInput Decoded stage input.
 * @param {number} stageType Trinity shader stage enum.
 * @param {object} [options] Emission options.
 * @param {boolean} [options.requireExists] Whether absent stage inputs emit null.
 * @returns {object|null} Plain metadata, or null for absent pass stages.
 */
function emitStageInput(stageInput, stageType, options = {}) {
  const {
    requireExists = true
  } = options;
  if (!stageInput || requireExists && !stageInput.m_exists) return null;
  const signature = stageInput.signature || {};
  return {
    stageType,
    stageName: hlslShaderStageName(stageType),
    constantValueSize: stageInput.m_constantValueSize || 0,
    constants: (stageInput.constants || []).map(emitConstant),
    resources: Array.from(stageInput.resources || [], ([registerIndex, resource]) => emitResource(registerIndex, resource)),
    samplers: Array.from(stageInput.samplers || [], ([registerIndex, sampler]) => emitSampler(registerIndex, sampler)),
    uavs: Array.from(stageInput.uavs || [], ([registerIndex, resource]) => emitResource(registerIndex, resource)),
    annotations: (stageInput.annotation || []).map(entry => entry?.toJSON?.() ?? {
      ...entry
    }),
    signature: {
      pipelineInputs: (signature.pipelineInputs || []).map(entry => ({
        ...entry
      })),
      registers: (signature.registers || []).map(entry => ({
        ...entry
      })),
      samplers: (signature.samplers || []).map(entry => ({
        ...entry
      })),
      threadGroupSize: signature.threadGroupSize ? {
        ...signature.threadGroupSize
      } : null
    }
  };
}

/**
 * Emit ray-tracing shader-library metadata without bytecode or runtime handles.
 *
 * @param {object} library Decoded shader library.
 * @returns {object} Plain metadata.
 */
function emitLibrary(library) {
  return {
    payloadSize: library.payloadSize,
    rayGenName: library.rayGenName,
    missName: library.missName,
    closestHitName: library.closestHitName,
    anyHitName: library.anyHitName,
    intersectionName: library.intersectionName,
    hitGroupName: library.hitGroupName,
    exports: library.exports.map(entry => ({
      ...entry
    })),
    globalInput: emitStageInput(library.globalInput, 2, {
      requireExists: false
    }),
    localInput: emitStageInput(library.localInput, 2, {
      requireExists: false
    })
  };
}

/**
 * Emit one pass metadata record.
 *
 * @param {object} pass Decoded pass.
 * @returns {object} Plain metadata.
 */
function emitPass(pass) {
  return {
    shaderTypeMask: pass.shaderTypeMask,
    renderStates: emitRenderStates(pass.cjsRenderStateSetup),
    stageInputs: pass.stageInputs.map((stageInput, stageType) => emitStageInput(stageInput, stageType))
  };
}

/**
 * Emit one technique metadata record.
 *
 * @param {object} technique Decoded technique.
 * @returns {object} Plain metadata.
 */
function emitTechnique(technique) {
  return {
    name: technique.name,
    shaderTypeMask: technique.shaderTypeMask,
    passes: technique.passes.map(emitPass),
    libraries: technique.libraries.map(emitLibrary)
  };
}

/**
 * Emit one effect-description metadata record.
 *
 * @param {object} description Decoded effect description.
 * @returns {object} Plain metadata.
 */
function emitEffectDescription(description) {
  return {
    version: description.version,
    effectName: description.effectName,
    techniques: description.techniques.map(emitTechnique),
    annotations: Array.from(description.annotations.entries(), ([name, entries]) => ({
      name,
      annotations: entries.map(entry => entry?.toJSON?.() ?? {
        ...entry
      })
    })),
    readError: description.readError ? {
      name: description.readError.name,
      message: description.readError.message
    } : null
  };
}

/**
 * Emit shared effect header metadata.
 *
 * @param {object} effect Loaded HlslEffectRes.
 * @returns {object} Plain metadata.
 */
function emitHeader(effect) {
  return {
    version: effect.m_version,
    compilerVersion: effect.m_compilerVersion,
    sourcePath: effect.sourcePath,
    bodyCount: effect.m_offsetCount,
    permutations: effect.m_permutations.map(emitPermutation),
    loadError: effect.loadError ? {
      name: effect.loadError.name,
      message: effect.loadError.message
    } : null
  };
}

/**
 * Emit metadata for one resolved permutation body.
 *
 * @param {object} effect Loaded HlslEffectRes.
 * @param {object|null} shader Resolved shader, if decoded.
 * @param {{bodyIndex: number, selectedOptions: object[]}} selection Resolved option selection.
 * @returns {object} Plain metadata.
 */
function emitEffectMetadata(effect, shader, selection) {
  return {
    ...emitHeader(effect),
    bodyIndex: selection.bodyIndex,
    selectedOptions: selection.selectedOptions,
    effect: shader ? emitEffectDescription(shader.GetEffectDescription()) : null
  };
}

export { emitEffectMetadata, resolveSelectedOptions };
//# sourceMappingURL=metadata.js.map
