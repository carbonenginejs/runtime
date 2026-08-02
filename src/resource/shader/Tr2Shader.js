// Source: trinity/trinity/Shader/Tr2Shader.h
// Source: trinity/trinity/Shader/Tr2Shader.cpp
import { CjsSchema, carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import {
  isEffectBodyReflection,
  validateEffectBodyReflection
} from "../../formats/hlsl/portable.js";
import { Tr2EffectDescription } from "./reflection/Tr2EffectDescription.js";

/** GPU-free selected shader and its complete source reflection graph. */
export class Tr2Shader extends CjsModel
{

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
  GetTechniqueIndex(name = "Main")
  {
    const techniques = this.effect?.techniques ?? [];
    if (!techniques.length)
    {
      return -1;
    }
    if (name === "")
    {
      return 0;
    }
    return techniques.findIndex(technique => technique?.name === name);
  }

  /** Number of passes in a technique; 0 for an unknown index. */
  GetPassCount(techniqueIndex = 0)
  {
    return this.effect?.techniques?.[techniqueIndex]?.passes?.length ?? 0;
  }

  /**
   * The reflected constant of this name from any stage of any pass, or null;
   * the description is metadata, not a bound GPU slot.
   */
  GetConstant(name)
  {
    return Tr2Shader.findStageValue(this.effect, name, "constants");
  }

  /**
   * The reflected resource of this name, searching stage resources before
   * UAVs; null when neither has it.
   */
  GetResource(name)
  {
    for (const stage of Tr2Shader.iterateStages(this.effect))
    {
      const resource = Tr2Shader.findNamedCollectionValue(
        stage?.resources,
        name
      );
      if (resource)
      {
        return resource;
      }
      const uav = Tr2Shader.findNamedCollectionValue(stage?.uavs, name);
      if (uav)
      {
        return uav;
      }
    }
    return null;
  }

  /**
   * The annotation set authored for a parameter name, or null; the shape
   * depends on the reflection source.
   */
  GetParameterAnnotations(parameterName)
  {
    return Tr2Shader.findAnnotationSet(
      this.effect?.annotations,
      parameterName
    );
  }

  /** The packed draw-sort key; 0 until ProcessEffect has run. */
  GetSortValue()
  {
    return this.sortValue;
  }

  /** The reflected effect description, by reference rather than copy. */
  GetEffectDescription()
  {
    return this.effect;
  }

  /** The same object GetEffectDescription returns. */
  GetEffect()
  {
    return this.effect;
  }

  /** The technique's bitmask of shader stages, or 0 for an unknown index. */
  GetShaderTypeMask(techniqueIndex = 0)
  {
    return Number(
      this.effect?.techniques?.[techniqueIndex]?.shaderTypeMask ?? 0
    );
  }

  /**
   * Pack the first technique/pass's renderer handles into Carbon's sort key.
   * A device-free source graph retains 0 while its handles remain invalid.
   */
  ProcessEffect()
  {
    this.sortValue = 0;
    const pass = this.effect?.techniques?.[0]?.passes?.[0];
    if (!pass)
    {
      return;
    }
    const stages = pass.stageInputs ?? [];
    const pixelHandle = Number(
      stages[1]?.shader ?? stages[1]?.m_shader ?? 0xffffffff
    );
    const vertexHandle = Number(
      stages[0]?.shader ?? stages[0]?.m_shader ?? 0xffffffff
    );
    if (pixelHandle === 0xffffffff || vertexHandle === 0xffffffff)
    {
      return;
    }
    const pixelShader = pixelHandle & 0x3ff;
    const vertexShader = vertexHandle & 0x3ff;
    const renderStates = Number(pass.renderStates ?? 0) & 0x3ff;
    const passCount = Number(
      this.effect?.techniques?.[0]?.passes?.length ?? 0
    ) & 0x3;
    this.sortValue = (
      (passCount << 30)
      | (pixelShader << 20)
      | (vertexShader << 10)
      | renderStates
    ) >>> 0;
  }

  /** Whether this shader accesses vertex buffers in RT shadow mode. */
  HasVertexBufferAccessInRtShadow()
  {
    return this.hasVertexBufferAccessInRtShadow;
  }

  /**
   * Construct a canonical shader graph from JS/JSON model values.
   *
   * @param {object} values Canonical model values.
   * @param {object} options CjsModel import options.
   * @returns {Tr2Shader} Hydrated shader graph.
   */
  static from(values = {}, options = {})
  {
    let normalized = values;
    if (values?.effect
      && !(values.effect instanceof Tr2EffectDescription))
    {
      normalized = {
        ...values,
        effect: Tr2EffectDescription.from(values.effect, options)
      };
    }
    const shader = super.from(normalized, options);
    if (!Object.hasOwn(values ?? {}, "sortValue"))
    {
      shader.ProcessEffect();
    }
    return shader;
  }

  /**
   * Build one GPU-free shader from one body of a Carbon effect container.
   *
   * `reader` is the container reader the resource opened and retains; this method
   * never opens anything of its own. A body is not independently readable — its
   * strings are offsets into the container's shared arena, and its layout depends
   * on the container's version — so handing each body its own reader would mean
   * re-parsing the header per permutation and losing the arena.
   *
   * Carbon passes exactly that bundle, as loose arguments
   * (`Tr2EffectRes.cpp:126-134`):
   *
   * ```cpp
   * auto offset = m_offsets[index];
   * auto buffer = ...m_data.get() + offset.offset;
   * shader->GetEffect().Read( buffer, offset.size, m_version,
   *                           m_stringTable, m_stringTableSize, path );
   * shader->ProcessEffect();
   * ```
   *
   * The resource owns `m_data`, `m_offsets`, `m_version` and the string table,
   * and hands the body a pointer plus the version and arena. Here that same state
   * is held by the reader the resource retains, so passing the reader passes the
   * whole bundle and the resource itself adds nothing a body needs.
   *
   * Reading is backend-agnostic. A dx11 body reads exactly as a webgl one does;
   * they differ only in what the optional per-pass block carries, and this method
   * retains that block without interpreting it. What can be *realized* from the
   * result is the engine's question, not the reader's.
   *
   * @param {object} reader Container reader owned by the resource.
   * @param {number} index Permutation index within the container.
   * @returns {Tr2Shader} Canonical selected shader.
   */
  static fromCarbonBinary(reader, index)
  {
    const shader = new this();
    shader.effect = Tr2EffectDescription.fromCarbonBinary(
      reader.readDescription(index)
    );
    shader.ProcessEffect();
    return shader;
  }

  /**
   * Build one canonical GPU-free shader from complete portable reflection.
   * Each child reflection class owns conversion of its own portable record.
   *
   * @param {object} portable Portable effect-body reflection.
   * @returns {Tr2Shader} Canonical selected shader.
   */
  static fromPortable(portable)
  {
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
  static isPortableReflection(value)
  {
    return isEffectBodyReflection(value);
  }

  /** Find one named reflection entry across every stage. */
  static findStageValue(effect, name, key)
  {
    for (const stage of Tr2Shader.iterateStages(effect))
    {
      const found = Tr2Shader.findNamedCollectionValue(stage?.[key], name);
      if (found)
      {
        return found;
      }
    }
    return null;
  }

  /** Flatten pass stage inputs in Carbon lookup order. */
  static iterateStages(effect)
  {
    const stages = [];
    for (const technique of effect?.techniques ?? [])
    {
      for (const pass of technique?.passes ?? [])
      {
        stages.push(...pass?.stageInputs ?? []);
      }
    }
    return stages;
  }

  /** Find a named entry in an array, Map, or plain object collection. */
  static findNamedCollectionValue(values, name)
  {
    if (!values)
    {
      return null;
    }
    if (Array.isArray(values))
    {
      return values.find(
        value => value?.name === name || value?.[1]?.name === name
      ) ?? null;
    }
    if (values instanceof Map)
    {
      for (const value of values.values())
      {
        if (value?.name === name)
        {
          return value;
        }
      }
      return null;
    }
    for (const value of Object.values(values))
    {
      if (value?.name === name)
      {
        return value;
      }
    }
    return null;
  }

  /** Resolve a parameter's annotations from a Map, array, or plain object. */
  static findAnnotationSet(annotations, parameterName)
  {
    if (!annotations)
    {
      return null;
    }
    if (annotations instanceof Map)
    {
      return annotations.get(parameterName) ?? null;
    }
    if (Array.isArray(annotations))
    {
      const entry = annotations.find(
        item => item?.name === parameterName
          || item?.[0] === parameterName
      );
      return entry?.annotations ?? entry?.value ?? entry?.[1] ?? null;
    }
    return annotations[parameterName] ?? null;
  }

}

// Declared as data rather than with decorators, so this module stays plain ESM
// that loads from source without a transform. The decorator vocabulary is used
// verbatim as values, so the registered metadata is identical to the decorated
// form. Field order is key order, and it drives GetValues() export order.
// Statics belong in `methods`: the prototype is what carries instance fields.
const UNVALIDATED_TECHNIQUE_INDEX = impl.reason(
  "Carbon assumes an already-validated technique index; CarbonEngineJS safely returns zero for an unavailable index."
);

CjsSchema.define(Tr2Shader, {
  className: "Tr2Shader",
  family: "shader",
  fields: {
    sortValue: type.uint32,
    effect: type.rawStruct("Tr2EffectDescription"),
    hasVertexBufferAccessInRtShadow: type.boolean
  },
  methods: {
    GetTechniqueIndex: [ carbon.method, impl.adapted, impl.reason("Carbon returns success through a bool plus output index; CarbonEngineJS returns the index directly or -1 while preserving exact name lookup.") ],
    GetPassCount: [ carbon.method, impl.adapted, UNVALIDATED_TECHNIQUE_INDEX ],
    GetConstant: [ carbon.method, impl.implemented ],
    GetResource: [ carbon.method, impl.implemented ],
    GetParameterAnnotations: [ carbon.method, impl.implemented ],
    GetSortValue: [ carbon.method, impl.implemented ],
    GetEffectDescription: [ carbon.method, impl.implemented ],
    GetEffect: [ carbon.method, impl.implemented ],
    GetShaderTypeMask: [ carbon.method, impl.adapted, UNVALIDATED_TECHNIQUE_INDEX ],
    ProcessEffect: [ carbon.method, impl.adapted, impl.reason("Carbon packs renderer handles assigned while reading; the device-free graph leaves the sort key zero until an engine assigns valid handles.") ],
    HasVertexBufferAccessInRtShadow: [ carbon.method, impl.implemented ]
  }
});
