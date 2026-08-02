// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { CjsSchema, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import {
  isArray,
  isPlainObject,
  isUint32
} from "@carbonenginejs/runtime-utils/is";
import { requirePortableStageType } from "../portable.js";
import { Tr2EffectStageInput } from "./Tr2EffectStageInput.js";
import { recordBytes } from "./carbonRecordFields.js";

const SHADER_TYPE_COUNT = 6;

/** Reflected effect pass; backend program and state handles remain engine-owned. */
export class Tr2Pass extends CjsModel
{

  /** stageInputs (Tr2EffectStageInput) */
  stageInputs = [];

  /** renderStates (unsigned int) */
  renderStates = 0;

  /** shaderTypeMask (unsigned int) */
  shaderTypeMask = 0;

  /** shaderProgram (unsigned int) */
  shaderProgram = 0;

  /** resourceSetDesc (Tr2ResourceSetDescriptionAL) */
  resourceSetDesc = null;

  /** indirectLayout (Tr2IndirectDrawBufferLayout) */
  indirectLayout = null;

  /** Exact authored render-state pairs retained before an engine creates a state handle. */
  renderStateValues = [];

  /** Optional per-pass backend block, absent in a stock Carbon file. */
  backendBlock = null;

  /**
   * Build one pass from its Carbon v15 description record.
   *
   * Carbon writes only the stages a pass actually uses, but the class keeps a
   * fixed six-slot array indexed by stage type, so absent stages are filled with
   * explicit empty slots rather than left as holes. The stage's own type byte
   * decides where it lands; position in the record does not.
   *
   * The optional backend block is retained verbatim and not interpreted here. It
   * is the one place the container diverges by backend, and deciding what it
   * means is the engine's job, not the reader's.
   *
   * @param {object} record Carbon pass record.
   * @returns {Tr2Pass} Reflected pass.
   */
  static fromCarbonBinary(record)
  {
    if (!isPlainObject(record))
    {
      throw new TypeError("Carbon effect pass record must be an object");
    }

    const pass = new this();
    const renderStateIds = new Set();
    pass.renderStateValues = record.renderStates.map(entry =>
    {
      if (renderStateIds.has(entry.state))
      {
        throw new Error(
          `Carbon effect render-state id ${entry.state} is duplicated`
        );
      }
      renderStateIds.add(entry.state);
      return { state: entry.state, value: entry.value };
    });

    pass.stageInputs = Array.from(
      { length: SHADER_TYPE_COUNT },
      (_, stageType) => Tr2EffectStageInput.createEmpty(stageType)
    );
    pass.shaderTypeMask = 0;

    for (const stageRecord of record.stages)
    {
      const stage = Tr2EffectStageInput.fromCarbonBinary(stageRecord);
      const stageType = requirePortableStageType(stage.stageType);
      if ((pass.shaderTypeMask & (1 << stageType)) !== 0)
      {
        throw new Error(
          `Carbon effect stage type ${stageType} is duplicated`
        );
      }
      pass.stageInputs[stageType] = stage;
      pass.shaderTypeMask = (pass.shaderTypeMask | (1 << stageType)) >>> 0;
    }

    pass.backendBlock = record.backendBlock
      ? { bytes: recordBytes(record.backendBlock), size: record.backendBlock.size }
      : null;

    return pass;
  }

  /**
   * Build one pass from its portable JSON reflection record.
   *
   * @param {object} value Portable pass record.
   * @returns {Tr2Pass} Reflected pass.
   */
  static fromPortable(value)
  {
    if (!isPlainObject(value))
    {
      throw new TypeError("Portable effect pass must be an object");
    }
    if (!isArray(value.renderStates))
    {
      throw new TypeError(
        "Portable effect render states must be an array"
      );
    }
    if (!isArray(value.stages))
    {
      throw new TypeError("Portable effect stages must be an array");
    }
    if (value.renderStateCount !== value.renderStates.length
      || value.stageCount !== value.stages.length)
    {
      throw new Error(
        "Portable effect pass counts disagree with its collections"
      );
    }

    const pass = new this();
    const renderStateIds = new Set();
    pass.renderStateValues = value.renderStates.map(entry =>
    {
      if (!isUint32(entry?.state))
      {
        throw new RangeError("Portable render-state id must fit uint32");
      }
      if (!isUint32(entry?.value))
      {
        throw new RangeError(
          "Portable render-state value must fit uint32"
        );
      }
      if (renderStateIds.has(entry.state))
      {
        throw new Error(
          `Portable render-state id ${entry.state} is duplicated`
        );
      }
      renderStateIds.add(entry.state);
      return {
        state: entry.state,
        value: entry.value
      };
    });

    const stageTypes = new Set();
    value.stages.forEach(stage =>
    {
      const stageType = requirePortableStageType(stage?.stageType);
      if (stageTypes.has(stageType))
      {
        throw new Error(
          `Portable effect stage type ${stageType} is duplicated`
        );
      }
      stageTypes.add(stageType);
    });
    pass.stageInputs = Array.from(
      { length: SHADER_TYPE_COUNT },
      (_, stageType) => Tr2EffectStageInput.createEmpty(stageType)
    );
    pass.shaderTypeMask = 0;

    for (const stageValue of value.stages)
    {
      const stage = Tr2EffectStageInput.fromPortable(stageValue);
      pass.stageInputs[stage.stageType] = stage;
      pass.shaderTypeMask = (
        pass.shaderTypeMask | (1 << stage.stageType)
      ) >>> 0;
    }

    return pass;
  }

}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2Pass, {
  className: "Tr2Pass",
  family: "shader",
  fields: {
    stageInputs: type.list("Tr2EffectStageInput"),
    renderStates: type.uint32,
    shaderTypeMask: type.uint32,
    shaderProgram: type.uint32,
    resourceSetDesc: type.rawStruct("Tr2ResourceSetDescriptionAL"),
    indirectLayout: type.rawStruct("Tr2IndirectDrawBufferLayout"),
    renderStateValues: [ impl.adapted, impl.reason("Carbon stores a renderer-owned render-state handle; the device-free graph retains the authored state/value pairs until an engine realizes them."), type.rawStruct("CjsEffectRenderStateValues") ],
    backendBlock: [ impl.custom, impl.reason("Carbon ends a pass at its render states; CarbonEngineJS containers may append one per-pass block carrying the backend program, which the resource retains uninterpreted for an engine to realize."), type.rawStruct("CjsEffectBackendBlock") ]
  }
});
