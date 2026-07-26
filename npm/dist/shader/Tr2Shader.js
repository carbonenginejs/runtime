import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { Tr2EffectDescription as _Tr2EffectDescription } from './reflection/Tr2EffectDescription.js';

let _initClass, _init_sortValue, _init_extra_sortValue, _init_effect, _init_extra_effect, _init_hasVertexBufferAccessInRtShadow, _init_extra_hasVertexBufferAccessInRtShadow;

/** Tr2Shader (shader) - generated from schema shapeHash 39e1616a.... */
let _Tr2Shader;
class Tr2Shader extends CjsModel {
  static {
    ({
      e: [_init_sortValue, _init_extra_sortValue, _init_effect, _init_extra_effect, _init_hasVertexBufferAccessInRtShadow, _init_extra_hasVertexBufferAccessInRtShadow],
      c: [_Tr2Shader, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Shader",
      family: "shader"
    })], [[[type, type.uint32], 16, "sortValue"], [type.rawStruct("Tr2EffectDescription"), 0, "effect"], [[type, type.boolean], 16, "hasVertexBufferAccessInRtShadow"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_hasVertexBufferAccessInRtShadow(this);
  }
  /** m_sortValue (unsigned int) */
  sortValue = _init_sortValue(this, 0);

  /** m_effect (Tr2EffectDescription) */
  effect = (_init_extra_sortValue(this), _init_effect(this, new _Tr2EffectDescription()));

  /** m_hasVertexBufferAccessInRtShadow (bool) */
  hasVertexBufferAccessInRtShadow = (_init_extra_effect(this), _init_hasVertexBufferAccessInRtShadow(this, false));

  /**
   * Index of the named technique; 0 for the any-technique aliases
   * (`ANY_TECHNIQUE`, `Any`, empty string) and -1 when the shader has no
   * techniques or the name is unknown.
   */
  GetTechniqueIndex(name = "Main") {
    const techniques = this.effect?.techniques ?? [];
    if (!techniques.length) {
      return -1;
    }
    if (name === "ANY_TECHNIQUE" || name === "Any" || name === "") {
      return 0;
    }
    return techniques.findIndex(technique => technique?.name === name);
  }

  /** Number of passes in a technique; 0 for an unknown index. */
  GetPassCount(techniqueIndex = 0) {
    return this.effect?.techniques?.[techniqueIndex]?.passes?.length ?? 0;
  }

  /**
   * The reflected constant of this name from any stage of any pass, or null; the
   * description is metadata, not a bound GPU slot.
   */
  GetConstant(name) {
    return _Tr2Shader.findStageValue(this.effect, name, "constants");
  }

  /**
   * The reflected resource of this name, searching stage resources before UAVs;
   * null when neither has it.
   */
  GetResource(name) {
    return _Tr2Shader.findStageValue(this.effect, name, "resources") ?? _Tr2Shader.findStageValue(this.effect, name, "uavs");
  }

  /**
   * The annotation set authored for a parameter name, or null; the shape depends
   * on the reflection source.
   */
  GetParameterAnnotations(parameterName) {
    return _Tr2Shader.findAnnotationSet(this.effect?.annotations, parameterName);
  }

  /** The packed draw-sort key; 0 until ProcessEffect has run. */
  GetSortValue() {
    return this.sortValue;
  }

  /**
   * The reflected effect description this shader wraps, by reference - not a
   * copy.
   */
  GetEffectDescription() {
    return this.effect;
  }

  /** The same object GetEffectDescription returns; Carbon exposes both accessors. */
  GetEffect() {
    return this.effect;
  }

  /**
   * The technique's bitmask of shader stages; 0 when the technique index is
   * unknown.
   */
  GetShaderTypeMask(techniqueIndex = 0) {
    return Number(this.effect?.techniques?.[techniqueIndex]?.shaderTypeMask ?? 0);
  }

  /**
   * Packs a draw-sort key into sortValue from the first technique's pass count
   * and its first pass's pixel shader, vertex shader and render-state ids (2 +
   * 10 + 10 + 10 bits); leaves it 0 when the shader has no passes.
   */
  ProcessEffect() {
    this.sortValue = 0;
    const pass = this.effect?.techniques?.[0]?.passes?.[0];
    if (!pass) {
      return;
    }
    const stages = pass.stageInputs ?? [];
    const pixelShader = Number(stages[1]?.shader ?? stages[1]?.m_shader ?? 0) & 0x3ff;
    const vertexShader = Number(stages[0]?.shader ?? stages[0]?.m_shader ?? 0) & 0x3ff;
    const renderStates = Number(pass.renderStates ?? 0) & 0x3ff;
    const passCount = Number(this.effect?.techniques?.[0]?.passes?.length ?? 0) & 0x3;
    this.sortValue = passCount << 30 | pixelShader << 20 | vertexShader << 10 | renderStates;
  }

  /**
   * Whether the effect description flags vertex-buffer access during ray-traced
   * shadow rendering.
   */
  HasVertexBufferAccessInRtShadow() {
    return this.hasVertexBufferAccessInRtShadow;
  }

  /**
   * First entry named `name` under the given stage key across every stage of the
   * effect, or null.
   */
  static findStageValue(effect, name, key) {
    for (const stage of _Tr2Shader.iterateStages(effect)) {
      const values = stage?.[key];
      const found = _Tr2Shader.findNamedCollectionValue(values, name);
      if (found) {
        return found;
      }
    }
    return null;
  }

  /**
   * Flattens an effect description into every stage input it contains - each
   * pass's stage inputs plus each library's global and local inputs.
   */
  static iterateStages(effect) {
    const stages = [];
    for (const technique of effect?.techniques ?? []) {
      for (const pass of technique?.passes ?? []) {
        stages.push(...(pass?.stageInputs ?? []));
      }
      for (const library of technique?.libraries ?? []) {
        if (library?.globalInput) {
          stages.push(library.globalInput);
        }
        if (library?.localInput) {
          stages.push(library.localInput);
        }
      }
    }
    return stages;
  }

  /**
   * Finds a named entry in a reflection collection stored as an array
   * (optionally of key/value pairs), a Map, or a plain object.
   */
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

  /**
   * Resolves a parameter's annotation set out of a Map keyed by name, an array
   * of entries, or a plain object keyed by name.
   */
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
