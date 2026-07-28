import { isPlainObject, isUint32, isUint8 } from '@carbonenginejs/runtime-utils/is';

const EFFECT_BODY_REFLECTION_FORMAT = "CJS_EFFECT_BODY_REFLECTION";
const EFFECT_BODY_REFLECTION_VERSION = 1;
const PORTABLE_EFFECT_VERSION = 15;
const UINT32_MAX = 0xffffffff;
const CONSTANT_BYTES_MAX = 4096;
const STAGE_NAMES = Object.freeze(["vertex", "pixel", "compute", "geometry", "hull", "domain"]);

/**
 * Validate the complete portable reflection v1 consumer contract.
 *
 * This intentionally mirrors the browser-safe producer schema without adding
 * a runtime-resource dependency on a format package.
 *
 * @param {object} document Candidate portable reflection.
 * @returns {object} The validated input document.
 */
function validatePortableEffectReflection(document) {
  requireExactKeys(document, ["format", "formatVersion", "mode", "keyScope", "coverage", "source", "permutationIndex", "sourceRecord", "effect"], "Portable effect body reflection");
  requireExactKeys(document.coverage, ["bodies", "reflection", "sourcePrograms", "constantDefaults"], "Portable reflection coverage");
  if (document.format !== EFFECT_BODY_REFLECTION_FORMAT || document.formatVersion !== EFFECT_BODY_REFLECTION_VERSION || document.mode !== "single-body" || document.keyScope !== "body-local" || document.coverage.bodies !== "single" || document.coverage.reflection !== "complete" || document.coverage.sourcePrograms !== "complete" || document.coverage.constantDefaults !== "exact") {
    throw new Error("Portable effect body reflection schema or coverage is unsupported");
  }
  if (!isUint32(document.permutationIndex)) {
    throw new Error("Portable reflection permutationIndex must fit uint32");
  }
  validateSource(document.source);
  if (!isPlainObject(document.sourceRecord)) {
    throw new Error("Portable reflection sourceRecord must be an object");
  }
  const sourceRecord = document.sourceRecord;
  requireExactKeys(sourceRecord, ["offset", "byteLength"], "Portable reflection sourceRecord");
  if (!isUint32(sourceRecord.offset)) {
    throw new Error("Portable reflection sourceRecord offset must fit uint32");
  }
  if (!isUint32(sourceRecord.byteLength)) {
    throw new Error("Portable reflection sourceRecord byteLength must fit uint32");
  }
  if (!sourceRecord.byteLength || sourceRecord.offset + sourceRecord.byteLength > document.source.byteLength) {
    throw new Error("Portable reflection sourceRecord is outside the source envelope");
  }
  if (!isPlainObject(document.effect)) {
    throw new Error("Portable reflection effect must be an object");
  }
  const effect = document.effect;
  requireExactKeys(effect, ["annotations", "annotationGroupCount", "techniqueCount", "techniques"], "Portable reflection effect");
  if (!Array.isArray(effect.annotations) || !Array.isArray(effect.techniques) || effect.annotationGroupCount !== effect.annotations.length || effect.techniqueCount !== effect.techniques.length) {
    throw new Error("Portable reflection effect is malformed");
  }
  validateAnnotationGroups(effect.annotations, "effect annotations");
  const techniqueKeys = new Set();
  for (const [techniqueIndex, technique] of effect.techniques.entries()) {
    const context = `technique ${techniqueIndex}`;
    requireExactKeys(technique, ["key", "name", "passCount", "libraryCount", "passes", "libraries"], `Portable reflection ${context}`);
    requireKey(technique.key, `technique${techniqueIndex}`, context, techniqueKeys);
    if (typeof technique.name !== "string" || !Array.isArray(technique.passes) || !Array.isArray(technique.libraries) || technique.passCount !== technique.passes.length || technique.libraryCount !== technique.libraries.length) {
      throw new Error(`Portable reflection ${context} is malformed`);
    }
    const passKeys = new Set();
    for (const [passIndex, pass] of technique.passes.entries()) {
      const passKey = `${technique.key}.pass${passIndex}`;
      requireExactKeys(pass, ["key", "renderStateCount", "renderStates", "stageCount", "stages"], `Portable reflection ${context} pass ${passIndex}`);
      requireKey(pass.key, passKey, `${context} pass ${passIndex}`, passKeys);
      validatePass(pass, document.source);
    }
    const libraryKeys = new Set();
    for (const [libraryIndex, library] of technique.libraries.entries()) {
      const libraryKey = `${technique.key}.library${libraryIndex}`;
      requireExactKeys(library, ["key", "payloadSize", "sourceProgram", "exportCount", "exports", "hitGroupName", "globalInput", "localInput"], `Portable reflection ${context} library ${libraryIndex}`);
      requireKey(library.key, libraryKey, `${context} library ${libraryIndex}`, libraryKeys);
      validateLibrary(library, document.source);
    }
  }
  return document;
}

/** Whether a value is a complete valid portable reflection v1 document. */
function isPortableEffectReflection(value) {
  try {
    validatePortableEffectReflection(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate one portable stage/library input independently.
 *
 * @param {object} input Portable input record.
 * @param {string} [context] Diagnostic context.
 * @returns {object} The validated input.
 */
function validatePortableEffectInput(input, context = "standalone input") {
  validateInput(input, context);
  return input;
}
function validateSource(source) {
  requireExactKeys(source, ["label", "effectVersion", "compilerVersion", "nativeHash", "stringTableByteLength", "byteLength"], "Portable reflection source");
  if (typeof source.label !== "string") {
    throw new Error("Portable reflection source label is malformed");
  }
  if (!isUint32(source.effectVersion)) {
    throw new Error("Portable reflection effectVersion must fit uint32");
  }
  if (!isUint32(source.stringTableByteLength)) {
    throw new Error("Portable reflection stringTableByteLength must fit uint32");
  }
  if (!isUint32(source.byteLength)) {
    throw new Error("Portable reflection source byteLength must fit uint32");
  }
  if (!source.byteLength || source.stringTableByteLength > source.byteLength || source.effectVersion !== PORTABLE_EFFECT_VERSION) {
    throw new Error("Portable reflection source envelope is unsupported");
  }
  if (source.compilerVersion === null) {
    throw new Error("Portable reflection v15 compiler identity is incomplete");
  }
  if (!isUint32(source.compilerVersion)) {
    throw new Error("Portable reflection compilerVersion must fit uint32");
  }
  if (!(source.nativeHash instanceof Uint8Array) || source.nativeHash.byteLength !== 32) {
    throw new Error("Portable reflection v15 source identity is incomplete");
  }
}
function validatePass(pass, source) {
  if (!Array.isArray(pass.renderStates) || !Array.isArray(pass.stages) || pass.renderStateCount !== pass.renderStates.length || pass.stageCount !== pass.stages.length) {
    throw new Error(`Portable reflection pass ${pass.key} is malformed`);
  }
  validateRegisterIndexed(pass.renderStates, "state", `pass ${pass.key} render states`, entry => {
    requireExactKeys(entry, ["state", "value"], `Portable reflection pass ${pass.key} render state`);
    if (!isUint32(entry.value)) {
      throw new Error(`pass ${pass.key} render-state value must fit uint32`);
    }
  });
  const stageTypes = new Set();
  const stageKeys = new Set();
  for (const stage of pass.stages) {
    requireExactKeys(stage, ["key", "stageType", "stageName", "sourceProgram", "input"], `Portable reflection pass ${pass.key} stage`);
    if (!isUint32(stage.stageType)) {
      throw new Error(`pass ${pass.key} stage type must fit uint32`);
    }
    if (stage.stageType >= STAGE_NAMES.length || stageTypes.has(stage.stageType)) {
      throw new Error(`Portable reflection pass ${pass.key} stage type is invalid or duplicated`);
    }
    stageTypes.add(stage.stageType);
    requireKey(stage.key, `${pass.key}.stage${stage.stageType}`, `pass ${pass.key} stage`, stageKeys);
    if (stage.stageName !== STAGE_NAMES[stage.stageType]) {
      throw new Error(`Portable reflection stage ${stage.key} name disagrees`);
    }
    validateSourceProgram(stage.sourceProgram, "stage", stage.stageType, stage.stageName, source.stringTableByteLength);
    validateInput(stage.input, stage.key);
  }
}
function validateLibrary(library, source) {
  if (!isUint32(library.payloadSize)) {
    throw new Error(`library ${library.key} payloadSize must fit uint32`);
  }
  validateSourceProgram(library.sourceProgram, "library", null, null, source.stringTableByteLength);
  if (!Array.isArray(library.exports) || library.exportCount !== library.exports.length || typeof library.hitGroupName !== "string") {
    throw new Error(`Portable reflection library ${library.key} is malformed`);
  }
  const identities = new Set();
  for (const [index, entry] of library.exports.entries()) {
    requireExactKeys(entry, ["type", "name"], `Portable reflection library ${library.key} export ${index}`);
    if (!isUint8(entry.type)) {
      throw new Error(`library ${library.key} export ${index} type must fit uint8`);
    }
    const identity = `${entry.type}:${entry.name}`;
    if (entry.type > 4 || typeof entry.name !== "string" || !entry.name || identities.has(identity)) {
      throw new Error(`Portable reflection library ${library.key} export ${index} ` + "is malformed or duplicated");
    }
    identities.add(identity);
  }
  validateInput(library.globalInput, `${library.key}.globalInput`);
  validateInput(library.localInput, `${library.key}.localInput`);
}
function validateSourceProgram(program, expectedKind, stageType, stageName, stringTableByteLength) {
  requireExactKeys(program, expectedKind === "stage" ? ["kind", "stageType", "stageName", "shaderSize", "stringTableOffset", "bytes"] : ["kind", "shaderSize", "stringTableOffset", "bytes"], "Portable reflection source program");
  if (program.kind !== expectedKind) {
    throw new Error("Portable reflection source program kind disagrees");
  }
  if (expectedKind === "stage" && (program.stageType !== stageType || program.stageName !== stageName)) {
    throw new Error("Portable reflection source program stage identity disagrees");
  }
  if (!isUint32(program.shaderSize)) {
    throw new Error("Portable reflection source program shaderSize must fit uint32");
  }
  if (!(program.bytes instanceof Uint8Array) || !program.bytes.byteLength || program.shaderSize !== program.bytes.byteLength) {
    throw new Error("Portable reflection source program bytes are incomplete");
  }
  if (!isUint32(program.stringTableOffset)) {
    throw new Error("Portable reflection source program stringTableOffset must fit uint32");
  }
  if (program.stringTableOffset + program.shaderSize > stringTableByteLength) {
    throw new Error("Portable reflection source program is outside the shared string table");
  }
}
function validateInput(input, context) {
  requireExactKeys(input, ["constantDefaults", "constantCount", "constants", "resourceCount", "resources", "uavCount", "uavs", "samplerCount", "samplers", "annotationCount", "annotations", "signature"], `Portable reflection ${context} input`);
  if (!isPlainObject(input.constantDefaults)) {
    throw new Error(`Portable reflection ${context} constant defaults must be an object`);
  }
  const defaults = input.constantDefaults;
  requireExactKeys(defaults, ["declaredByteLength", "bytes"], `Portable reflection ${context} constant defaults`);
  if (!isUint32(defaults.declaredByteLength)) {
    throw new Error(`Portable reflection ${context} constant-default length must fit uint32`);
  }
  if (!(defaults.bytes instanceof Uint8Array) || defaults.declaredByteLength !== defaults.bytes.byteLength || defaults.bytes.byteLength > CONSTANT_BYTES_MAX) {
    throw new Error(`Portable reflection ${context} constant defaults are invalid`);
  }
  if (!Array.isArray(input.constants) || !Array.isArray(input.resources) || !Array.isArray(input.uavs) || !Array.isArray(input.samplers) || !Array.isArray(input.annotations) || input.constantCount !== input.constants.length || input.resourceCount !== input.resources.length || input.uavCount !== input.uavs.length || input.samplerCount !== input.samplers.length || input.annotationCount !== input.annotations.length) {
    throw new Error(`Portable reflection ${context} input collections are malformed`);
  }
  const constantNames = new Set();
  for (const [index, constant] of input.constants.entries()) {
    requireExactKeys(constant, ["name", "offset", "size", "type", "dimension", "elements", "isSRGB", "isAutoregister"], `Portable reflection ${context} constant ${index}`);
    if (typeof constant.name !== "string" || !constant.name || constantNames.has(constant.name)) {
      throw new Error(`Portable reflection ${context} constant ${index} ` + "is malformed or duplicated");
    }
    constantNames.add(constant.name);
    if (!isUint32(constant.offset)) {
      throw new Error(`${context} constant ${constant.name} offset must fit uint32`);
    }
    if (!isUint32(constant.size)) {
      throw new Error(`${context} constant ${constant.name} size must fit uint32`);
    }
    if (!isUint8(constant.type)) {
      throw new Error(`${context} constant ${constant.name} type must fit uint8`);
    }
    if (!isUint8(constant.dimension)) {
      throw new Error(`${context} constant ${constant.name} dimension must fit uint8`);
    }
    if (!isUint32(constant.elements)) {
      throw new Error(`${context} constant ${constant.name} elements must fit uint32`);
    }
    if (!constant.size || constant.type > 4 || constant.dimension < 1 || constant.offset + constant.size > CONSTANT_BYTES_MAX || typeof constant.isSRGB !== "boolean" || typeof constant.isAutoregister !== "boolean") {
      throw new Error(`Portable reflection ${context} constant ${constant.name} is invalid`);
    }
  }
  validateResourceList(input.resources, `${context} resources`);
  validateResourceList(input.uavs, `${context} UAVs`);
  validateSamplerList(input.samplers, `${context} samplers`);
  validateAnnotations(input.annotations, `${context} annotations`);
  validateSignature(input.signature, context);
  validateMapSignatureReconciliation(input, context);
}
function validateResourceList(entries, context) {
  validateRegisterIndexed(entries, "registerIndex", context, entry => {
    requireExactKeys(entry, ["registerIndex", "name", "type", "arrayElements", "isSRGB", "isAutoregister"], `Portable reflection ${context} entry`);
    if (!isUint8(entry.registerIndex)) {
      throw new Error(`${context} registerIndex must fit uint8`);
    }
    if (!isUint8(entry.type)) {
      throw new Error(`${context} type must fit uint8`);
    }
    if (!isUint32(entry.arrayElements)) {
      throw new Error(`${context} arrayElements must fit uint32`);
    }
    if (typeof entry.name !== "string" || !entry.name || typeof entry.isSRGB !== "boolean" || typeof entry.isAutoregister !== "boolean") {
      throw new Error(`Portable reflection ${context} entry is malformed`);
    }
  });
}
function validateSamplerList(entries, context) {
  validateRegisterIndexed(entries, "registerIndex", context, entry => {
    requireExactKeys(entry, ["registerIndex", "name", "isDynamic", "descriptor"], `Portable reflection ${context} entry`);
    if (!isUint8(entry.registerIndex)) {
      throw new Error(`${context} registerIndex must fit uint8`);
    }
    if (typeof entry.isDynamic !== "boolean" || entry.isDynamic && typeof entry.name !== "string" || !entry.isDynamic && entry.name !== null) {
      throw new Error(`Portable reflection ${context} entry is malformed`);
    }
    validateSamplerDescriptor(entry.descriptor, context, false);
  });
}
function validateSignature(signature, context) {
  requireExactKeys(signature, ["pipelineInputCount", "pipelineInputs", "registerCount", "registers", "staticSamplerCount", "staticSamplers", "threadGroupSize"], `Portable reflection ${context} signature`);
  if (!Array.isArray(signature.pipelineInputs) || !Array.isArray(signature.registers) || !Array.isArray(signature.staticSamplers) || signature.pipelineInputCount !== signature.pipelineInputs.length || signature.registerCount !== signature.registers.length || signature.staticSamplerCount !== signature.staticSamplers.length) {
    throw new Error(`Portable reflection ${context} signature is malformed`);
  }
  for (const [index, input] of signature.pipelineInputs.entries()) {
    requireExactKeys(input, ["usage", "registerIndex", "usageIndex", "usedMask", "type", "dimension"], `Portable reflection ${context} pipeline input ${index}`);
    for (const field of ["usage", "registerIndex", "usageIndex", "usedMask", "type", "dimension"]) {
      if (!isUint8(input[field])) {
        throw new Error(`${context} pipeline input ${index} ${field} must fit uint8`);
      }
    }
  }
  const registerRanges = new Map();
  for (const [index, register] of signature.registers.entries()) {
    requireExactKeys(register, ["registerType", "registerIndex", "arrayCount", "registerCount", "registerSpace"], `Portable reflection ${context} register ${index}`);
    if (!isUint8(register.registerType)) {
      throw new Error(`${context} register ${index} type must fit uint8`);
    }
    if (!isUint32(register.registerIndex)) {
      throw new Error(`${context} register ${index} index must fit uint32`);
    }
    if (!isUint32(register.arrayCount)) {
      throw new Error(`${context} register ${index} arrayCount must fit uint32`);
    }
    if (!isUint32(register.registerCount)) {
      throw new Error(`${context} register ${index} registerCount must fit uint32`);
    }
    if (!isUint8(register.registerSpace)) {
      throw new Error(`${context} register ${index} space must fit uint8`);
    }
    const classification = registerClass(register.registerType);
    const unbounded = register.arrayCount === 0 && register.registerCount === 0;
    const rangeEnd = unbounded ? UINT32_MAX + 1 : register.registerIndex + register.registerCount;
    if (register.registerCount !== register.arrayCount || unbounded && classification !== "sampler" && classification !== "resource" && classification !== "uav" || rangeEnd > UINT32_MAX + 1) {
      throw new Error(`Portable reflection ${context} register ${index} is malformed`);
    }
    const rangeKey = `${classification}:${register.registerSpace}`;
    const ranges = registerRanges.get(rangeKey) ?? [];
    if (ranges.some(([start, end]) => register.registerIndex < end && rangeEnd > start)) {
      throw new Error(`Portable reflection ${context} signature register range overlaps`);
    }
    ranges.push([register.registerIndex, rangeEnd]);
    registerRanges.set(rangeKey, ranges);
  }
  validateRegisterIndexed(signature.staticSamplers, "registerIndex", `${context} static samplers`, entry => {
    requireExactKeys(entry, ["registerIndex", "registerSpace", "descriptor"], `Portable reflection ${context} static sampler`);
    if (!isUint8(entry.registerSpace)) {
      throw new Error(`${context} static sampler space must fit uint8`);
    }
    validateSamplerDescriptor(entry.descriptor, context, true);
  }, entry => `${entry.registerSpace}:${entry.registerIndex}`);
  if (!isPlainObject(signature.threadGroupSize)) {
    throw new Error(`Portable reflection ${context} threadGroupSize must be an object`);
  }
  const group = signature.threadGroupSize;
  requireExactKeys(group, ["x", "y", "z"], `Portable reflection ${context} threadGroupSize`);
  for (const field of ["x", "y", "z"]) {
    if (!isUint32(group[field])) {
      throw new Error(`${context} threadGroupSize.${field} must fit uint32`);
    }
  }
}
function validateMapSignatureReconciliation(input, context) {
  validateMappedBindings(input.resources, input.signature.registers.filter(entry => registerClass(entry.registerType) === "resource"), `${context} resources`);
  validateMappedBindings(input.uavs, input.signature.registers.filter(entry => registerClass(entry.registerType) === "uav"), `${context} UAVs`);
  for (const sampler of input.samplers) {
    const matches = sampler.isDynamic ? input.signature.registers.filter(entry => registerClass(entry.registerType) === "sampler" && entry.registerIndex === sampler.registerIndex) : input.signature.staticSamplers.filter(entry => entry.registerIndex === sampler.registerIndex);
    if (matches.length > 1 || matches.length === 1 && sampler.isDynamic && matches[0].arrayCount !== 0 && matches[0].arrayCount !== 1) {
      throw new Error(`Portable reflection ${context} sampler map disagrees with its signature`);
    }
  }
}
function validateMappedBindings(entries, registers, context) {
  for (const entry of entries) {
    const matches = registers.filter(register => register.registerIndex === entry.registerIndex);
    if (matches.length !== 1 || matches[0].arrayCount !== entry.arrayElements) {
      throw new Error(`Portable reflection ${context} map disagrees with its signature`);
    }
  }
}
function registerClass(registerType) {
  if (registerType === 0) return "constantBuffer";
  if (registerType === 1) return "sampler";
  if (registerType >= 32 && registerType <= 63) return "resource";
  if (registerType >= 64 && registerType <= 95) return "uav";
  return `raw${registerType}`;
}
function validateSamplerDescriptor(descriptor, context, staticSampler) {
  requireExactKeys(descriptor, ["comparison", "minFilter", "magFilter", "mipFilter", "addressU", "addressV", "addressW", "mipLODBiasRaw", "maxAnisotropy", "comparisonFunc", staticSampler ? "borderColor" : "borderColorRaw", "minLODRaw", "maxLODRaw"], `Portable reflection ${context} sampler descriptor`);
  if (typeof descriptor.comparison !== "boolean") {
    throw new Error(`Portable reflection ${context} sampler comparison is malformed`);
  }
  for (const field of ["minFilter", "magFilter", "mipFilter", "addressU", "addressV", "addressW", "maxAnisotropy", "comparisonFunc"]) {
    if (!isUint8(descriptor[field])) {
      throw new Error(`${context} sampler ${field} must fit uint8`);
    }
  }
  for (const field of ["mipLODBiasRaw", "minLODRaw", "maxLODRaw"]) {
    if (!isUint32(descriptor[field])) {
      throw new Error(`${context} sampler ${field} must fit uint32`);
    }
  }
  if (staticSampler) {
    if (!isUint8(descriptor.borderColor)) {
      throw new Error(`${context} static sampler borderColor must fit uint8`);
    }
  } else if (!Array.isArray(descriptor.borderColorRaw) || descriptor.borderColorRaw.length !== 4) {
    throw new Error(`Portable reflection ${context} sampler borderColorRaw is malformed`);
  } else {
    for (const [index, value] of descriptor.borderColorRaw.entries()) {
      if (!isUint32(value)) {
        throw new Error(`${context} sampler borderColorRaw[${index}] must fit uint32`);
      }
    }
  }
}
function validateAnnotationGroups(groups, context) {
  const names = new Set();
  for (const [index, group] of groups.entries()) {
    requireExactKeys(group, ["parameterName", "annotations"], `Portable reflection ${context} group ${index}`);
    if (typeof group.parameterName !== "string" || names.has(group.parameterName) || !Array.isArray(group.annotations)) {
      throw new Error(`Portable reflection ${context} group ${index} ` + "is malformed or duplicated");
    }
    names.add(group.parameterName);
    validateAnnotations(group.annotations, `${context} ${group.parameterName}`);
  }
}
function validateAnnotations(annotations, context) {
  for (const [index, annotation] of annotations.entries()) {
    requireExactKeys(annotation, annotation?.type === 3 ? ["name", "type", "stringValue"] : ["name", "type", "rawValue"], `Portable reflection ${context} annotation ${index}`);
    if (typeof annotation.name !== "string" || !annotation.name) {
      throw new Error(`Portable reflection ${context} annotation ${index} is malformed`);
    }
    if (!isUint8(annotation.type)) {
      throw new Error(`${context} annotation ${index} type must fit uint8`);
    }
    if (annotation.type === 3) {
      if (typeof annotation.stringValue !== "string") {
        throw new Error(`Portable reflection ${context} string annotation is malformed`);
      }
    } else if (annotation.type <= 2) {
      if (!isUint32(annotation.rawValue)) {
        throw new Error(`${context} annotation ${index} rawValue must fit uint32`);
      }
    } else {
      throw new Error(`Portable reflection ${context} annotation type is unsupported`);
    }
  }
}
function validateRegisterIndexed(entries, field, context, validate, identityFor = null) {
  const identities = new Set();
  for (const [index, entry] of entries.entries()) {
    if (!isPlainObject(entry)) {
      throw new Error(`Portable reflection ${context} entry ${index} must be an object`);
    }
    if (!isUint32(entry[field])) {
      throw new Error(`${context} entry ${index} ${field} must fit uint32`);
    }
    const identity = identityFor ? identityFor(entry) : entry[field];
    if (identities.has(identity)) {
      throw new Error(`Portable reflection ${context} entry ${index} is duplicated`);
    }
    identities.add(identity);
    validate(entry);
  }
}
function requireKey(value, expected, context, keys) {
  if (value !== expected || keys.has(value)) {
    throw new Error(`Portable reflection ${context} key is malformed or duplicated`);
  }
  keys.add(value);
}
function requireExactKeys(value, allowed, context) {
  if (!isPlainObject(value)) {
    throw new Error(`${context} must be an object`);
  }
  const actual = Reflect.ownKeys(value);
  if (actual.length !== allowed.length || actual.some(key => typeof key !== "string" || !allowed.includes(key))) {
    throw new Error(`${context} has unsupported or missing fields`);
  }
}

export { isPortableEffectReflection, validatePortableEffectInput, validatePortableEffectReflection };
//# sourceMappingURL=portableValidation.js.map
