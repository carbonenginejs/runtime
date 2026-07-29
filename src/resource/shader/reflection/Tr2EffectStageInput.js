// Source: trinity/trinity/Shader/Tr2EffectDescription.h
// Source: trinity/trinity/Shader/Tr2EffectDescription.cpp
import { impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { copyBytes } from "@carbonenginejs/runtime-utils/bytes";
import {
  isArray,
  isPlainObject,
  isUint32
} from "@carbonenginejs/runtime-utils/is";
import { cloneCarbonValue } from "@carbonenginejs/runtime-utils/types";
import {
  clonePortableSourceProgram,
  requirePortableStageType
} from "../portable.js";
import { validateEffectBodyInput } from "../../../formats/hlsl/portable.js";
import { Tr2SamplerSetup } from "../sampler/Tr2SamplerSetup.js";
import { Tr2EffectConstant } from "./Tr2EffectConstant.js";
import { Tr2EffectParameterAnnotation } from "./Tr2EffectParameterAnnotation.js";
import { Tr2EffectResource } from "./Tr2EffectResource.js";

/** Complete device-free reflection for one shader stage input. */
@type.define({ className: "Tr2EffectStageInput", family: "shader" })
export class Tr2EffectStageInput extends CjsModel
{

  /** Portable stage index; Carbon otherwise implies this from the containing array. */
  @impl.adapted
  @impl.reason("The source format identifies stage inputs by array index; the device-free graph retains the index explicitly for serialization and engine adapters.")
  @type.int32
  stageType = -1;

  /** m_exists (bool) */
  @type.boolean
  exists = false;

  /** resources (Tr2EffectResourceMap) */
  @type.map("Tr2EffectResource")
  resources = new Map();

  /** uavs (Tr2EffectResourceMap) */
  @type.map("Tr2EffectResource")
  uavs = new Map();

  /** samplers (Tr2SamplerSetupMap) */
  @type.map("Tr2SamplerSetup")
  samplers = new Map();

  /** m_shader (unsigned) */
  @type.uint32
  shader = 0xffffffff;

  /** constants (Tr2EffectConstantVector) */
  @type.list("Tr2EffectConstant")
  constants = [];

  /** m_constantValueSize (unsigned) */
  @type.uint32
  constantValueSize = 0;

  /** constantValues (char[SHADER_CONSTANTS_MAX]) */
  @type.typedArray("Uint8Array")
  constantValues = new Uint8Array(0);

  /** signature (Tr2ShaderSignatureAL) */
  @type.rawStruct("Tr2ShaderSignatureAL")
  signature = null;

  /** annotation (Tr2EffectParameterAnnotationMap) */
  @type.list("Tr2EffectParameterAnnotation")
  annotation = [];

  /** Exact source program metadata and owned bytes, before backend realization. */
  @impl.adapted
  @impl.reason("Carbon replaces source program data with renderer handles while reading; the device-free resource graph must retain the portable source program for later engine realization.")
  @type.rawStruct("CjsEffectSourceProgram")
  sourceProgram = null;

  /**
   * Construct one canonical stage input from JS/JSON model values.
   *
   * @param {object} values Canonical model values.
   * @param {object} options CjsModel import options.
   * @returns {Tr2EffectStageInput} Hydrated stage input.
   */
  static from(values = {}, options = {})
  {
    let normalized = values;
    const maps = new Map();
    for (const [ field, Constructor ] of [
      [ "resources", Tr2EffectResource ],
      [ "uavs", Tr2EffectResource ],
      [ "samplers", Tr2SamplerSetup ]
    ])
    {
      if (values && Object.hasOwn(values, field))
      {
        normalized = normalized === values ? { ...values } : normalized;
        normalized[field] = this.readCanonicalRegisterMap(
          values[field],
          Constructor,
          options,
          field
        );
        maps.set(field, normalized[field]);
      }
    }
    const stage = super.from(normalized, options);
    for (const [ field, value ] of maps)
    {
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
  @impl.custom
  @impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing.")
  static fromPortable(value)
  {
    if (!isPlainObject(value))
    {
      throw new TypeError("Portable effect stage must be an object");
    }
    const stageType = requirePortableStageType(value.stageType);
    return this.fromPortableInput(
      value.input,
      stageType,
      value.sourceProgram
    );
  }

  /**
   * Build one input record used by a render stage or shader library.
   *
   * @param {object} value Portable input record.
   * @param {number} stageType Stage index, or -1 for a library input.
   * @param {object|null} sourceProgram Optional stage source program.
   * @returns {Tr2EffectStageInput} Reflected input.
   */
  @impl.custom
  @impl.reason("Carbon reads stage-input bytes in place; CarbonEngineJS also supports the portable stage-input record used by effect packages.")
  static fromPortableInput(value, stageType = -1, sourceProgram = null)
  {
    if (!isPlainObject(value))
    {
      throw new TypeError("Portable effect stage input must be an object");
    }
    validateEffectBodyInput(value);
    if (!isArray(value.constants))
    {
      throw new TypeError("Portable effect constants must be an array");
    }
    if (!isArray(value.resources))
    {
      throw new TypeError("Portable effect resources must be an array");
    }
    if (!isArray(value.uavs))
    {
      throw new TypeError("Portable effect UAVs must be an array");
    }
    if (!isArray(value.samplers))
    {
      throw new TypeError("Portable effect samplers must be an array");
    }
    if (!isArray(value.annotations))
    {
      throw new TypeError(
        "Portable effect stage annotations must be an array"
      );
    }
    if (!isPlainObject(value.constantDefaults))
    {
      throw new TypeError(
        "Portable effect constant defaults must be an object"
      );
    }
    if (!(value.constantDefaults.bytes instanceof Uint8Array))
    {
      throw new TypeError(
        "Portable effect constant defaults must be Uint8Array bytes"
      );
    }

    const defaults = value.constantDefaults;
    const constantValues = copyBytes(defaults.bytes);
    if (defaults.declaredByteLength !== constantValues.byteLength)
    {
      throw new Error(
        "Portable effect constant defaults disagree with their declared byte length"
      );
    }

    const input = new this();
    input.stageType = stageType;
    input.exists = true;
    input.constants = value.constants.map(
      entry => Tr2EffectConstant.fromPortable(entry)
    );
    input.resources = this.readPortableResourceMap(value.resources);
    input.uavs = this.readPortableResourceMap(value.uavs);
    input.samplers = this.readPortableSamplerMap(value.samplers);
    input.constantValueSize = constantValues.byteLength;
    input.constantValues = constantValues;
    input.signature = cloneCarbonValue(value.signature);
    input.annotation = value.annotations.map(
      entry => Tr2EffectParameterAnnotation.fromPortable(entry)
    );
    input.sourceProgram = sourceProgram
      ? clonePortableSourceProgram(sourceProgram, "stage")
      : null;
    return input;
  }

  /**
   * Create one explicit absent stage slot.
   *
   * @param {number} stageType Stage index.
   * @returns {Tr2EffectStageInput} Empty stage input.
   */
  @impl.custom
  @impl.reason("Carbon stores six fixed stage slots in each pass; CarbonEngineJS constructs explicit absent canonical slots before portable stages are assigned.")
  static createEmpty(stageType)
  {
    const stage = new this();
    stage.stageType = requirePortableStageType(stageType);
    return stage;
  }

  /** Build one register-indexed portable resource map. */
  @impl.custom
  @impl.reason("Carbon reads a native register map; CarbonEngineJS indexes validated portable resource records into the canonical numeric map.")
  static readPortableResourceMap(values)
  {
    const result = new Map();
    for (const value of values)
    {
      if (!isPlainObject(value))
      {
        throw new TypeError("Portable effect resource must be an object");
      }
      if (!isUint32(value.registerIndex))
      {
        throw new RangeError(
          "Portable resource register index must fit uint32"
        );
      }
      const registerIndex = value.registerIndex;
      if (result.has(registerIndex))
      {
        throw new Error(
          `Portable effect resource register ${registerIndex} is duplicated`
        );
      }
      result.set(
        registerIndex,
        Tr2EffectResource.fromPortable(value)
      );
    }
    return result;
  }

  /** Build one register-indexed portable sampler map. */
  @impl.custom
  @impl.reason("Carbon reads a native sampler map; CarbonEngineJS indexes validated portable sampler records into the canonical numeric map.")
  static readPortableSamplerMap(values)
  {
    const result = new Map();
    for (const value of values)
    {
      if (!isPlainObject(value))
      {
        throw new TypeError("Portable effect sampler must be an object");
      }
      if (!isUint32(value.registerIndex))
      {
        throw new RangeError(
          "Portable sampler register index must fit uint32"
        );
      }
      const registerIndex = value.registerIndex;
      if (result.has(registerIndex))
      {
        throw new Error(
          `Portable effect sampler register ${registerIndex} is duplicated`
        );
      }
      result.set(
        registerIndex,
        Tr2SamplerSetup.fromPortable(value)
      );
    }
    return result;
  }

  /** Hydrate one numeric-register map from canonical JS/JSON values. */
  @impl.custom
  @impl.reason("Carbon has fixed native map types; CarbonEngineJS restores numeric register keys and canonical child identity from JSON-compatible maps.")
  static readCanonicalRegisterMap(values, Constructor, options, field)
  {
    const entries = values instanceof Map
      ? values
      : Object.entries(values ?? {});
    const result = new Map();
    for (const [ key, value ] of entries)
    {
      const registerIndex = Number(key);
      if (!isUint32(registerIndex))
      {
        throw new RangeError(
          `Effect ${field} register index must fit uint32`
        );
      }
      if (result.has(registerIndex))
      {
        throw new Error(
          `Effect ${field} register ${registerIndex} is duplicated`
        );
      }
      result.set(
        registerIndex,
        value instanceof Constructor
          ? value
          : Constructor.from(value, options)
      );
    }
    return result;
  }

}
