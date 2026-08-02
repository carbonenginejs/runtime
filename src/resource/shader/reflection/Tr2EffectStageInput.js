// Source: trinity/trinity/Shader/Tr2EffectDescription.h
// Source: trinity/trinity/Shader/Tr2EffectDescription.cpp
import { CjsSchema, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { copyBytes } from "@carbonenginejs/runtime-utils/bytes";
import {
  isArray,
  isPlainObject,
  isUint32
} from "@carbonenginejs/runtime-utils/is";
import { cloneCarbonValue } from "@carbonenginejs/runtime-utils/types";
import { Tr2SamplerSetup } from "../sampler/Tr2SamplerSetup.js";
import { Tr2EffectConstant } from "./Tr2EffectConstant.js";
import { Tr2EffectParameterAnnotation } from "./Tr2EffectParameterAnnotation.js";
import { Tr2EffectResource } from "./Tr2EffectResource.js";
import { recordBytes, recordRawBits } from "./carbonRecordFields.js";
import { requireShaderStageType } from "./shaderStage.js";

/** Complete device-free reflection for one shader stage input. */
export class Tr2EffectStageInput extends CjsModel
{

  /** Portable stage index; Carbon otherwise implies this from the containing array. */
  stageType = -1;

  /** m_exists (bool) */
  exists = false;

  /** resources (Tr2EffectResourceMap) */
  resources = new Map();

  /** uavs (Tr2EffectResourceMap) */
  uavs = new Map();

  /** samplers (Tr2SamplerSetupMap) */
  samplers = new Map();

  /** m_shader (unsigned) */
  shader = 0xffffffff;

  /** constants (Tr2EffectConstantVector) */
  constants = [];

  /** m_constantValueSize (unsigned) */
  constantValueSize = 0;

  /** constantValues (char[SHADER_CONSTANTS_MAX]) */
  constantValues = new Uint8Array(0);

  /** signature (Tr2ShaderSignatureAL) */
  signature = null;

  /** annotation (Tr2EffectParameterAnnotationMap) */
  annotation = [];

  /** Exact source program metadata and owned bytes, before backend realization. */
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

  static fromCarbonBinary(record)
  {
    if (!isPlainObject(record))
    {
      throw new TypeError("Carbon effect stage record must be an object");
    }

    const input = this.fromCarbonBinaryInput(record, record.type);
    input.signature.pipelineInputCount = record.pipelineInputs.length;
    input.signature.pipelineInputs = record.pipelineInputs.map(entry => ({
      usage: entry.usage,
      registerIndex: entry.registerIndex,
      usageIndex: entry.usageIndex,
      usedMask: entry.usedMask,
      type: entry.type,
      dimension: entry.dimension
    }));
    input.signature.threadGroupSize = {
      x: record.threadGroupSize[0],
      y: record.threadGroupSize[1],
      z: record.threadGroupSize[2]
    };
    input.sourceProgram = {
      kind: "stage",
      bytes: copyBytes(recordBytes(record.shaderData)),
      shaderSize: record.shaderData.size
    };
    return input;
  }

  /**
   * Build one stage input from a Carbon v15 `StageData` block.
   *
   * A raytracing library's global and local inputs are the same block without a
   * stage wrapper — no stage type, no pipeline inputs, no thread group, no
   * program of their own — so this is the half both callers share and
   * `fromCarbonBinary` is the stage-only remainder layered on top.
   *
   * Carbon writes textures, samplers and UAVs in ascending register order because
   * they are `std::map`s, and they are re-keyed by register here rather than by
   * position, so the map is authoritative and the record's order is not load
   * bearing.
   *
   * @param {object} record Carbon stage-data record.
   * @param {number} [stageType] Stage index, or -1 for a library input.
   * @returns {Tr2EffectStageInput} Reflected stage input.
   */
  static fromCarbonBinaryInput(record, stageType = -1)
  {
    if (!isPlainObject(record))
    {
      throw new TypeError("Carbon effect stage-data record must be an object");
    }

    const constantValues = copyBytes(recordBytes(record.defaultValues));

    const input = new this();
    input.stageType = stageType;
    input.exists = true;
    input.constants = record.constants.map(
      entry => Tr2EffectConstant.fromCarbonBinary(entry)
    );
    input.resources = this.readCarbonBinaryResourceMap(record.textures);
    input.uavs = this.readCarbonBinaryResourceMap(record.uavs);
    input.samplers = this.readCarbonBinarySamplerMap(record.samplers);
    input.constantValueSize = constantValues.byteLength;
    input.constantValues = constantValues;
    input.annotation = record.annotations.map(
      entry => Tr2EffectParameterAnnotation.fromCarbonBinary(entry)
    );
    input.signature = {
      pipelineInputCount: 0,
      pipelineInputs: [],
      registerCount: record.registers.length,
      // Carbon stores one field its reader calls `arrayCount` and its writer
      // calls `registerCount`. Both names are carried forward from the single
      // stored value, because the write direction refuses to emit a record whose
      // two names disagree.
      registers: record.registers.map(entry => ({
        registerType: entry.registerType,
        registerIndex: entry.registerIndex,
        arrayCount: entry.registerCount,
        registerCount: entry.registerCount,
        registerSpace: entry.registerSpace
      })),
      staticSamplerCount: record.staticSamplers.length,
      staticSamplers: record.staticSamplers.map(entry => ({
        registerIndex: entry.registerIndex,
        registerSpace: entry.registerSpace,
        descriptor: {
          comparison: !!entry.comparison,
          minFilter: entry.minFilter,
          magFilter: entry.magFilter,
          mipFilter: entry.mipFilter,
          addressU: entry.addressU,
          addressV: entry.addressV,
          addressW: entry.addressW,
          mipLODBiasRaw: recordRawBits(entry.mipLODBias),
          maxAnisotropy: entry.maxAnisotropy,
          comparisonFunc: entry.comparisonFunc,
          // A static sampler's border colour is a one-byte enum, not four
          // floats. Sharing the dynamic sampler's mapping here would silently
          // reinterpret it.
          borderColor: entry.borderColor,
          minLODRaw: recordRawBits(entry.minLOD),
          maxLODRaw: recordRawBits(entry.maxLOD)
        }
      })),
      threadGroupSize: { x: 0, y: 0, z: 0 }
    };
    input.sourceProgram = null;
    return input;
  }

  /** Build one register-indexed resource map from Carbon texture or UAV records. */
  static readCarbonBinaryResourceMap(records)
  {
    const result = new Map();
    for (const record of records)
    {
      if (result.has(record.registerIndex))
      {
        throw new Error(
          `Carbon effect resource register ${record.registerIndex} is duplicated`
        );
      }
      result.set(
        record.registerIndex,
        Tr2EffectResource.fromCarbonBinary(record)
      );
    }
    return result;
  }

  /** Build one register-indexed sampler map from Carbon sampler records. */
  static readCarbonBinarySamplerMap(records)
  {
    const result = new Map();
    for (const record of records)
    {
      if (result.has(record.registerIndex))
      {
        throw new Error(
          `Carbon effect sampler register ${record.registerIndex} is duplicated`
        );
      }
      result.set(
        record.registerIndex,
        Tr2SamplerSetup.fromCarbonBinary(record)
      );
    }
    return result;
  }

  /**
   * Create one explicit absent stage slot.
   *
   * @param {number} stageType Stage index.
   * @returns {Tr2EffectStageInput} Empty stage input.
   */
  static createEmpty(stageType)
  {
    const stage = new this();
    stage.stageType = requireShaderStageType(stageType);
    return stage;
  }

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

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2EffectStageInput, {
  className: "Tr2EffectStageInput",
  family: "shader",
  fields: {
    stageType: [ impl.adapted, impl.reason("The source format identifies stage inputs by array index; the device-free graph retains the index explicitly for serialization and engine adapters."), type.int32 ],
    exists: type.boolean,
    resources: type.map("Tr2EffectResource"),
    uavs: type.map("Tr2EffectResource"),
    samplers: type.map("Tr2SamplerSetup"),
    shader: type.uint32,
    constants: type.list("Tr2EffectConstant"),
    constantValueSize: type.uint32,
    constantValues: type.typedArray("Uint8Array"),
    signature: type.rawStruct("Tr2ShaderSignatureAL"),
    annotation: type.list("Tr2EffectParameterAnnotation"),
    sourceProgram: [ impl.adapted, impl.reason("Carbon replaces source program data with renderer handles while reading; the device-free resource graph must retain the portable source program for later engine realization."), type.rawStruct("CjsEffectSourceProgram") ]
  }
});
