import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { validatePortableEffectReflection, isPortableEffectReflection } from './portableValidation.js';
import { Tr2EffectDescription as _Tr2EffectDescription } from './reflection/Tr2EffectDescription.js';

let _initProto, _initStatic, _initClass, _init_sortValue, _init_extra_sortValue, _init_effect, _init_extra_effect, _init_hasVertexBufferAccessInRtShadow, _init_extra_hasVertexBufferAccessInRtShadow;

/** GPU-free selected shader and its complete source reflection graph. */
let _Tr2Shader;
class Tr2Shader extends CjsModel {
  static {
    ({
      e: [_init_sortValue, _init_extra_sortValue, _init_effect, _init_extra_effect, _init_hasVertexBufferAccessInRtShadow, _init_extra_hasVertexBufferAccessInRtShadow, _initProto, _initStatic],
      c: [_Tr2Shader, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Shader",
      family: "shader"
    })], [[[type, type.uint32], 16, "sortValue"], [type.rawStruct("Tr2EffectDescription"), 0, "effect"], [[type, type.boolean], 16, "hasVertexBufferAccessInRtShadow"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns success through a bool plus output index; CarbonEngineJS returns the index directly or -1 while preserving exact name lookup.")], 18, "GetTechniqueIndex"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon assumes an already-validated technique index; CarbonEngineJS safely returns zero for an unavailable index.")], 18, "GetPassCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetConstant"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetResource"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParameterAnnotations"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEffectDescription"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEffect"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon assumes an already-validated technique index; CarbonEngineJS safely returns zero for an unavailable index.")], 18, "GetShaderTypeMask"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon packs renderer handles assigned while reading; the device-free graph leaves the sort key zero until an engine assigns valid handles.")], 18, "ProcessEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasVertexBufferAccessInRtShadow"], [[impl, impl.custom, void 0, impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the validated browser-safe portable-reflection contract after format parsing.")], 26, "fromPortable"], [[impl, impl.custom, void 0, impl.reason("Carbon has no portable-reflection document API; CarbonEngineJS validates that browser-safe interchange contract before hydration.")], 26, "isPortableReflection"], [[impl, impl.custom, void 0, impl.reason("Carbon performs this traversal inline; CarbonEngineJS exposes a collection-shape-neutral helper for the canonical device-free graph.")], 26, "findStageValue"], [[impl, impl.custom, void 0, impl.reason("Carbon performs pass-stage traversal inline; CarbonEngineJS centralizes the same ordering for device-free reflection lookup.")], 26, "iterateStages"], [[impl, impl.custom, void 0, impl.reason("Carbon collections have fixed native types; CarbonEngineJS accepts canonical maps plus JSON-compatible collection shapes.")], 26, "findNamedCollectionValue"], [[impl, impl.custom, void 0, impl.reason("Carbon uses one native annotation map; CarbonEngineJS accepts the canonical map and JSON-compatible serialized forms.")], 26, "findAnnotationSet"]], 0, void 0, CjsModel));
    _initStatic(this);
  }
  constructor(...args) {
    super(...args);
    _init_extra_hasVertexBufferAccessInRtShadow(this);
  }
  /** m_sortValue (unsigned int) */
  sortValue = (_initProto(this), _init_sortValue(this, 0));

  /** m_effect (Tr2EffectDescription) */
  effect = (_init_extra_sortValue(this), _init_effect(this, new _Tr2EffectDescription()));

  /** m_hasVertexBufferAccessInRtShadow (bool) */
  hasVertexBufferAccessInRtShadow = (_init_extra_effect(this), _init_hasVertexBufferAccessInRtShadow(this, false));

  /**
   * Index of the named technique; 0 for Carbon's empty-string any-technique
   * sentinel and -1 when the shader has no techniques or the name is unknown.
   */
  GetTechniqueIndex(name = "Main") {
    const techniques = this.effect?.techniques ?? [];
    if (!techniques.length) {
      return -1;
    }
    if (name === "") {
      return 0;
    }
    return techniques.findIndex(technique => technique?.name === name);
  }

  /** Number of passes in a technique; 0 for an unknown index. */
  GetPassCount(techniqueIndex = 0) {
    return this.effect?.techniques?.[techniqueIndex]?.passes?.length ?? 0;
  }

  /**
   * The reflected constant of this name from any stage of any pass, or null;
   * the description is metadata, not a bound GPU slot.
   */
  GetConstant(name) {
    return _Tr2Shader.findStageValue(this.effect, name, "constants");
  }

  /**
   * The reflected resource of this name, searching stage resources before
   * UAVs; null when neither has it.
   */
  GetResource(name) {
    for (const stage of _Tr2Shader.iterateStages(this.effect)) {
      const resource = _Tr2Shader.findNamedCollectionValue(stage?.resources, name);
      if (resource) {
        return resource;
      }
      const uav = _Tr2Shader.findNamedCollectionValue(stage?.uavs, name);
      if (uav) {
        return uav;
      }
    }
    return null;
  }

  /**
   * The annotation set authored for a parameter name, or null; the shape
   * depends on the reflection source.
   */
  GetParameterAnnotations(parameterName) {
    return _Tr2Shader.findAnnotationSet(this.effect?.annotations, parameterName);
  }

  /** The packed draw-sort key; 0 until ProcessEffect has run. */
  GetSortValue() {
    return this.sortValue;
  }

  /** The reflected effect description, by reference rather than copy. */
  GetEffectDescription() {
    return this.effect;
  }

  /** The same object GetEffectDescription returns. */
  GetEffect() {
    return this.effect;
  }

  /** The technique's bitmask of shader stages, or 0 for an unknown index. */
  GetShaderTypeMask(techniqueIndex = 0) {
    return Number(this.effect?.techniques?.[techniqueIndex]?.shaderTypeMask ?? 0);
  }

  /**
   * Pack the first technique/pass's renderer handles into Carbon's sort key.
   * A device-free source graph retains 0 while its handles remain invalid.
   */
  ProcessEffect() {
    this.sortValue = 0;
    const pass = this.effect?.techniques?.[0]?.passes?.[0];
    if (!pass) {
      return;
    }
    const stages = pass.stageInputs ?? [];
    const pixelHandle = Number(stages[1]?.shader ?? stages[1]?.m_shader ?? 0xffffffff);
    const vertexHandle = Number(stages[0]?.shader ?? stages[0]?.m_shader ?? 0xffffffff);
    if (pixelHandle === 0xffffffff || vertexHandle === 0xffffffff) {
      return;
    }
    const pixelShader = pixelHandle & 0x3ff;
    const vertexShader = vertexHandle & 0x3ff;
    const renderStates = Number(pass.renderStates ?? 0) & 0x3ff;
    const passCount = Number(this.effect?.techniques?.[0]?.passes?.length ?? 0) & 0x3;
    this.sortValue = (passCount << 30 | pixelShader << 20 | vertexShader << 10 | renderStates) >>> 0;
  }

  /** Whether this shader accesses vertex buffers in RT shadow mode. */
  HasVertexBufferAccessInRtShadow() {
    return this.hasVertexBufferAccessInRtShadow;
  }

  /**
   * Construct a canonical shader graph from JS/JSON model values.
   *
   * @param {object} values Canonical model values.
   * @param {object} options CjsModel import options.
   * @returns {Tr2Shader} Hydrated shader graph.
   */
  static from(values = {}, options = {}) {
    let normalized = values;
    if (values?.effect && !(values.effect instanceof _Tr2EffectDescription)) {
      normalized = {
        ...values,
        effect: _Tr2EffectDescription.from(values.effect, options)
      };
    }
    const shader = super.from(normalized, options);
    if (!Object.hasOwn(values ?? {}, "sortValue")) {
      shader.ProcessEffect();
    }
    return shader;
  }

  /**
   * Build one canonical GPU-free shader from complete portable reflection.
   * Each child reflection class owns conversion of its own portable record.
   *
   * @param {object} portable Portable effect-body reflection.
   * @returns {Tr2Shader} Canonical selected shader.
   */
  static fromPortable(portable) {
    validatePortableEffectReflection(portable);
    const shader = new this();
    shader.effect = _Tr2EffectDescription.fromPortable(portable.effect);
    shader.ProcessEffect();
    return shader;
  }

  /**
   * Whether a value has the supported complete portable-reflection envelope.
   *
   * @param {*} value Candidate value.
   * @returns {boolean} Whether the portable envelope is supported.
   */
  static isPortableReflection(value) {
    return isPortableEffectReflection(value);
  }

  /** Find one named reflection entry across every stage. */
  static findStageValue(effect, name, key) {
    for (const stage of _Tr2Shader.iterateStages(effect)) {
      const found = _Tr2Shader.findNamedCollectionValue(stage?.[key], name);
      if (found) {
        return found;
      }
    }
    return null;
  }

  /** Flatten pass stage inputs in Carbon lookup order. */
  static iterateStages(effect) {
    const stages = [];
    for (const technique of effect?.techniques ?? []) {
      for (const pass of technique?.passes ?? []) {
        stages.push(...(pass?.stageInputs ?? []));
      }
    }
    return stages;
  }

  /** Find a named entry in an array, Map, or plain object collection. */
  static findNamedCollectionValue(values, name) {
    if (!values) {
      return null;
    }
    if (Array.isArray(values)) {
      return values.find(value => value?.name === name || value?.[1]?.name === name) ?? null;
    }
    if (values instanceof Map) {
      for (const value of values.values()) {
        if (value?.name === name) {
          return value;
        }
      }
      return null;
    }
    for (const value of Object.values(values)) {
      if (value?.name === name) {
        return value;
      }
    }
    return null;
  }

  /** Resolve a parameter's annotations from a Map, array, or plain object. */
  static findAnnotationSet(annotations, parameterName) {
    if (!annotations) {
      return null;
    }
    if (annotations instanceof Map) {
      return annotations.get(parameterName) ?? null;
    }
    if (Array.isArray(annotations)) {
      const entry = annotations.find(item => item?.name === parameterName || item?.[0] === parameterName);
      return entry?.annotations ?? entry?.value ?? entry?.[1] ?? null;
    }
    return annotations[parameterName] ?? null;
  }
  static {
    _initClass();
  }
}

export { _Tr2Shader as Tr2Shader };
//# sourceMappingURL=Tr2Shader.js.map
