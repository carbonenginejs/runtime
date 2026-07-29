import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { copyBytes } from '@carbonenginejs/runtime-utils/bytes';
import { isPlainObject, isArray, isUint32 } from '@carbonenginejs/runtime-utils/is';
import { cloneCarbonValue } from '@carbonenginejs/runtime-utils/types';
import { requirePortableStageType, clonePortableSourceProgram } from '../portable.js';
import { validateEffectBodyInput } from '../../../formats/hlsl/core/portableReflection.js';
import { Tr2SamplerSetup as _Tr2SamplerSetup } from '../sampler/Tr2SamplerSetup.js';
import { Tr2EffectConstant as _Tr2EffectConstant } from './Tr2EffectConstant.js';
import { Tr2EffectParameterAnnotation as _Tr2EffectParameterAn } from './Tr2EffectParameterAnnotation.js';
import { Tr2EffectResource as _Tr2EffectResource } from './Tr2EffectResource.js';

let _initStatic, _initClass, _init_stageType, _init_extra_stageType, _init_exists, _init_extra_exists, _init_resources, _init_extra_resources, _init_uavs, _init_extra_uavs, _init_samplers, _init_extra_samplers, _init_shader, _init_extra_shader, _init_constants, _init_extra_constants, _init_constantValueSize, _init_extra_constantValueSize, _init_constantValues, _init_extra_constantValues, _init_signature, _init_extra_signature, _init_annotation, _init_extra_annotation, _init_sourceProgram, _init_extra_sourceProgram;

/** Complete device-free reflection for one shader stage input. */
let _Tr2EffectStageInput;
class Tr2EffectStageInput extends CjsModel {
  static {
    ({
      e: [_init_stageType, _init_extra_stageType, _init_exists, _init_extra_exists, _init_resources, _init_extra_resources, _init_uavs, _init_extra_uavs, _init_samplers, _init_extra_samplers, _init_shader, _init_extra_shader, _init_constants, _init_extra_constants, _init_constantValueSize, _init_extra_constantValueSize, _init_constantValues, _init_extra_constantValues, _init_signature, _init_extra_signature, _init_annotation, _init_extra_annotation, _init_sourceProgram, _init_extra_sourceProgram, _initStatic],
      c: [_Tr2EffectStageInput, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2EffectStageInput",
      family: "shader"
    })], [[[impl, impl.adapted, void 0, impl.reason("The source format identifies stage inputs by array index; the device-free graph retains the index explicitly for serialization and engine adapters."), type, type.int32], 16, "stageType"], [[type, type.boolean], 16, "exists"], [type.map("Tr2EffectResource"), 0, "resources"], [type.map("Tr2EffectResource"), 0, "uavs"], [type.map("Tr2SamplerSetup"), 0, "samplers"], [[type, type.uint32], 16, "shader"], [type.list("Tr2EffectConstant"), 0, "constants"], [[type, type.uint32], 16, "constantValueSize"], [type.typedArray("Uint8Array"), 0, "constantValues"], [type.rawStruct("Tr2ShaderSignatureAL"), 0, "signature"], [type.list("Tr2EffectParameterAnnotation"), 0, "annotation"], [[impl, impl.adapted, void 0, impl.reason("Carbon replaces source program data with renderer handles while reading; the device-free resource graph must retain the portable source program for later engine realization."), void 0, type.rawStruct("CjsEffectSourceProgram")], 16, "sourceProgram"], [[impl, impl.custom, void 0, impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing.")], 26, "fromPortable"], [[impl, impl.custom, void 0, impl.reason("Carbon reads stage-input bytes in place; CarbonEngineJS also supports the portable stage-input record used by effect packages.")], 26, "fromPortableInput"], [[impl, impl.custom, void 0, impl.reason("Carbon stores six fixed stage slots in each pass; CarbonEngineJS constructs explicit absent canonical slots before portable stages are assigned.")], 26, "createEmpty"], [[impl, impl.custom, void 0, impl.reason("Carbon reads a native register map; CarbonEngineJS indexes validated portable resource records into the canonical numeric map.")], 26, "readPortableResourceMap"], [[impl, impl.custom, void 0, impl.reason("Carbon reads a native sampler map; CarbonEngineJS indexes validated portable sampler records into the canonical numeric map.")], 26, "readPortableSamplerMap"], [[impl, impl.custom, void 0, impl.reason("Carbon has fixed native map types; CarbonEngineJS restores numeric register keys and canonical child identity from JSON-compatible maps.")], 26, "readCanonicalRegisterMap"]], 0, void 0, CjsModel));
    _initStatic(this);
  }
  constructor(...args) {
    super(...args);
    _init_extra_sourceProgram(this);
  }
  /** Portable stage index; Carbon otherwise implies this from the containing array. */
  stageType = _init_stageType(this, -1);

  /** m_exists (bool) */
  exists = (_init_extra_stageType(this), _init_exists(this, false));

  /** resources (Tr2EffectResourceMap) */
  resources = (_init_extra_exists(this), _init_resources(this, new Map()));

  /** uavs (Tr2EffectResourceMap) */
  uavs = (_init_extra_resources(this), _init_uavs(this, new Map()));

  /** samplers (Tr2SamplerSetupMap) */
  samplers = (_init_extra_uavs(this), _init_samplers(this, new Map()));

  /** m_shader (unsigned) */
  shader = (_init_extra_samplers(this), _init_shader(this, 0xffffffff));

  /** constants (Tr2EffectConstantVector) */
  constants = (_init_extra_shader(this), _init_constants(this, []));

  /** m_constantValueSize (unsigned) */
  constantValueSize = (_init_extra_constants(this), _init_constantValueSize(this, 0));

  /** constantValues (char[SHADER_CONSTANTS_MAX]) */
  constantValues = (_init_extra_constantValueSize(this), _init_constantValues(this, new Uint8Array(0)));

  /** signature (Tr2ShaderSignatureAL) */
  signature = (_init_extra_constantValues(this), _init_signature(this, null));

  /** annotation (Tr2EffectParameterAnnotationMap) */
  annotation = (_init_extra_signature(this), _init_annotation(this, []));

  /** Exact source program metadata and owned bytes, before backend realization. */
  sourceProgram = (_init_extra_annotation(this), _init_sourceProgram(this, null));

  /**
   * Construct one canonical stage input from JS/JSON model values.
   *
   * @param {object} values Canonical model values.
   * @param {object} options CjsModel import options.
   * @returns {Tr2EffectStageInput} Hydrated stage input.
   */
  static from(values = {}, options = {}) {
    let normalized = values;
    const maps = new Map();
    for (const [field, Constructor] of [["resources", _Tr2EffectResource], ["uavs", _Tr2EffectResource], ["samplers", _Tr2SamplerSetup]]) {
      if (values && Object.hasOwn(values, field)) {
        normalized = normalized === values ? {
          ...values
        } : normalized;
        normalized[field] = this.readCanonicalRegisterMap(values[field], Constructor, options, field);
        maps.set(field, normalized[field]);
      }
    }
    const stage = super.from(normalized, options);
    for (const [field, value] of maps) {
      stage[field] = value;
    }
    return stage;
  }

  /**
   * Build one stage input from its complete portable JSON stage record.
   *
   * @param {object} value Portable stage record.
   * @returns {Tr2EffectStageInput} Reflected stage input.
   */
  static fromPortable(value) {
    if (!isPlainObject(value)) {
      throw new TypeError("Portable effect stage must be an object");
    }
    const stageType = requirePortableStageType(value.stageType);
    return this.fromPortableInput(value.input, stageType, value.sourceProgram);
  }

  /**
   * Build one input record used by a render stage or shader library.
   *
   * @param {object} value Portable input record.
   * @param {number} stageType Stage index, or -1 for a library input.
   * @param {object|null} sourceProgram Optional stage source program.
   * @returns {Tr2EffectStageInput} Reflected input.
   */
  static fromPortableInput(value, stageType = -1, sourceProgram = null) {
    if (!isPlainObject(value)) {
      throw new TypeError("Portable effect stage input must be an object");
    }
    validateEffectBodyInput(value);
    if (!isArray(value.constants)) {
      throw new TypeError("Portable effect constants must be an array");
    }
    if (!isArray(value.resources)) {
      throw new TypeError("Portable effect resources must be an array");
    }
    if (!isArray(value.uavs)) {
      throw new TypeError("Portable effect UAVs must be an array");
    }
    if (!isArray(value.samplers)) {
      throw new TypeError("Portable effect samplers must be an array");
    }
    if (!isArray(value.annotations)) {
      throw new TypeError("Portable effect stage annotations must be an array");
    }
    if (!isPlainObject(value.constantDefaults)) {
      throw new TypeError("Portable effect constant defaults must be an object");
    }
    if (!(value.constantDefaults.bytes instanceof Uint8Array)) {
      throw new TypeError("Portable effect constant defaults must be Uint8Array bytes");
    }
    const defaults = value.constantDefaults;
    const constantValues = copyBytes(defaults.bytes);
    if (defaults.declaredByteLength !== constantValues.byteLength) {
      throw new Error("Portable effect constant defaults disagree with their declared byte length");
    }
    const input = new this();
    input.stageType = stageType;
    input.exists = true;
    input.constants = value.constants.map(entry => _Tr2EffectConstant.fromPortable(entry));
    input.resources = this.readPortableResourceMap(value.resources);
    input.uavs = this.readPortableResourceMap(value.uavs);
    input.samplers = this.readPortableSamplerMap(value.samplers);
    input.constantValueSize = constantValues.byteLength;
    input.constantValues = constantValues;
    input.signature = cloneCarbonValue(value.signature);
    input.annotation = value.annotations.map(entry => _Tr2EffectParameterAn.fromPortable(entry));
    input.sourceProgram = sourceProgram ? clonePortableSourceProgram(sourceProgram, "stage") : null;
    return input;
  }

  /**
   * Create one explicit absent stage slot.
   *
   * @param {number} stageType Stage index.
   * @returns {Tr2EffectStageInput} Empty stage input.
   */
  static createEmpty(stageType) {
    const stage = new this();
    stage.stageType = requirePortableStageType(stageType);
    return stage;
  }

  /** Build one register-indexed portable resource map. */
  static readPortableResourceMap(values) {
    const result = new Map();
    for (const value of values) {
      if (!isPlainObject(value)) {
        throw new TypeError("Portable effect resource must be an object");
      }
      if (!isUint32(value.registerIndex)) {
        throw new RangeError("Portable resource register index must fit uint32");
      }
      const registerIndex = value.registerIndex;
      if (result.has(registerIndex)) {
        throw new Error(`Portable effect resource register ${registerIndex} is duplicated`);
      }
      result.set(registerIndex, _Tr2EffectResource.fromPortable(value));
    }
    return result;
  }

  /** Build one register-indexed portable sampler map. */
  static readPortableSamplerMap(values) {
    const result = new Map();
    for (const value of values) {
      if (!isPlainObject(value)) {
        throw new TypeError("Portable effect sampler must be an object");
      }
      if (!isUint32(value.registerIndex)) {
        throw new RangeError("Portable sampler register index must fit uint32");
      }
      const registerIndex = value.registerIndex;
      if (result.has(registerIndex)) {
        throw new Error(`Portable effect sampler register ${registerIndex} is duplicated`);
      }
      result.set(registerIndex, _Tr2SamplerSetup.fromPortable(value));
    }
    return result;
  }

  /** Hydrate one numeric-register map from canonical JS/JSON values. */
  static readCanonicalRegisterMap(values, Constructor, options, field) {
    const entries = values instanceof Map ? values : Object.entries(values ?? {});
    const result = new Map();
    for (const [key, value] of entries) {
      const registerIndex = Number(key);
      if (!isUint32(registerIndex)) {
        throw new RangeError(`Effect ${field} register index must fit uint32`);
      }
      if (result.has(registerIndex)) {
        throw new Error(`Effect ${field} register ${registerIndex} is duplicated`);
      }
      result.set(registerIndex, value instanceof Constructor ? value : Constructor.from(value, options));
    }
    return result;
  }
  static {
    _initClass();
  }
}

export { _Tr2EffectStageInput as Tr2EffectStageInput };
//# sourceMappingURL=Tr2EffectStageInput.js.map
