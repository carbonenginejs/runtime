import { CjsSchema, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { validateEffectBodyReflection, isEffectBodyReflection } from '../../formats/hlsl/core/portableReflection.js';
import { Tr2EffectDescription } from './reflection/Tr2EffectDescription.js';

// Source: trinity/trinity/Shader/Tr2Shader.h
// Source: trinity/trinity/Shader/Tr2Shader.cpp

/** GPU-free selected shader and its complete source reflection graph. */
class Tr2Shader extends CjsModel {
  /** m_sortValue (unsigned int) */
  sortValue = 0;

  /** m_effect (Tr2EffectDescription) */
  effect = new Tr2EffectDescription();

  /** m_hasVertexBufferAccessInRtShadow (bool) */
  hasVertexBufferAccessInRtShadow = false;

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
    return Tr2Shader.findStageValue(this.effect, name, "constants");
  }

  /**
   * The reflected resource of this name, searching stage resources before
   * UAVs; null when neither has it.
   */
  GetResource(name) {
    for (const stage of Tr2Shader.iterateStages(this.effect)) {
      const resource = Tr2Shader.findNamedCollectionValue(stage?.resources, name);
      if (resource) {
        return resource;
      }
      const uav = Tr2Shader.findNamedCollectionValue(stage?.uavs, name);
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
    return Tr2Shader.findAnnotationSet(this.effect?.annotations, parameterName);
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
    if (values?.effect && !(values.effect instanceof Tr2EffectDescription)) {
      normalized = {
        ...values,
        effect: Tr2EffectDescription.from(values.effect, options)
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
    validateEffectBodyReflection(portable);
    const shader = new this();
    shader.effect = Tr2EffectDescription.fromPortable(portable.effect);
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
    return isEffectBodyReflection(value);
  }

  /** Find one named reflection entry across every stage. */
  static findStageValue(effect, name, key) {
    for (const stage of Tr2Shader.iterateStages(effect)) {
      const found = Tr2Shader.findNamedCollectionValue(stage?.[key], name);
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
}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2Shader, {
  className: "Tr2Shader",
  family: "shader",
  methods: [{
    name: "fromPortable",
    impl: {
      custom: true,
      status: "custom",
      reason: "Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the validated browser-safe portable-reflection contract after format parsing."
    }
  }, {
    name: "isPortableReflection",
    impl: {
      custom: true,
      status: "custom",
      reason: "Carbon has no portable-reflection document API; CarbonEngineJS validates that browser-safe interchange contract before hydration."
    }
  }, {
    name: "findStageValue",
    impl: {
      custom: true,
      status: "custom",
      reason: "Carbon performs this traversal inline; CarbonEngineJS exposes a collection-shape-neutral helper for the canonical device-free graph."
    }
  }, {
    name: "iterateStages",
    impl: {
      custom: true,
      status: "custom",
      reason: "Carbon performs pass-stage traversal inline; CarbonEngineJS centralizes the same ordering for device-free reflection lookup."
    }
  }, {
    name: "findNamedCollectionValue",
    impl: {
      custom: true,
      status: "custom",
      reason: "Carbon collections have fixed native types; CarbonEngineJS accepts canonical maps plus JSON-compatible collection shapes."
    }
  }, {
    name: "findAnnotationSet",
    impl: {
      custom: true,
      status: "custom",
      reason: "Carbon uses one native annotation map; CarbonEngineJS accepts the canonical map and JSON-compatible serialized forms."
    }
  }]
});
CjsSchema.decorateField(Tr2Shader, "sortValue", type.uint32);
CjsSchema.decorateField(Tr2Shader, "effect", type.rawStruct("Tr2EffectDescription"));
CjsSchema.decorateField(Tr2Shader, "hasVertexBufferAccessInRtShadow", type.boolean);
CjsSchema.decorateMethod(Tr2Shader, "GetTechniqueIndex", carbon.method, impl.adapted, impl.reason("Carbon returns success through a bool plus output index; CarbonEngineJS returns the index directly or -1 while preserving exact name lookup."));
CjsSchema.decorateMethod(Tr2Shader, "GetPassCount", carbon.method, impl.adapted, impl.reason("Carbon assumes an already-validated technique index; CarbonEngineJS safely returns zero for an unavailable index."));
CjsSchema.decorateMethod(Tr2Shader, "GetConstant", carbon.method, impl.implemented);
CjsSchema.decorateMethod(Tr2Shader, "GetResource", carbon.method, impl.implemented);
CjsSchema.decorateMethod(Tr2Shader, "GetParameterAnnotations", carbon.method, impl.implemented);
CjsSchema.decorateMethod(Tr2Shader, "GetSortValue", carbon.method, impl.implemented);
CjsSchema.decorateMethod(Tr2Shader, "GetEffectDescription", carbon.method, impl.implemented);
CjsSchema.decorateMethod(Tr2Shader, "GetEffect", carbon.method, impl.implemented);
CjsSchema.decorateMethod(Tr2Shader, "GetShaderTypeMask", carbon.method, impl.adapted, impl.reason("Carbon assumes an already-validated technique index; CarbonEngineJS safely returns zero for an unavailable index."));
CjsSchema.decorateMethod(Tr2Shader, "ProcessEffect", carbon.method, impl.adapted, impl.reason("Carbon packs renderer handles assigned while reading; the device-free graph leaves the sort key zero until an engine assigns valid handles."));
CjsSchema.decorateMethod(Tr2Shader, "HasVertexBufferAccessInRtShadow", carbon.method, impl.implemented);

export { Tr2Shader };
//# sourceMappingURL=Tr2Shader.js.map
