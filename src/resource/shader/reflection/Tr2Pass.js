// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { CjsSchema, impl, type } from "#schema";
import { CjsModel } from "#model";
import {
  isPlainObject
} from "#utils/is";
import { requireShaderStageType, SHADER_STAGE_COUNT } from "./shaderStage.js";
import { Tr2EffectStageInput } from "./Tr2EffectStageInput.js";
import { recordBytes, toRecordBlob } from "./carbonRecordFields.js";

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
   * Stage types in the order the file stored them.
   *
   * `stageInputs` is indexed by stage type, as Carbon's fixed array is, so the
   * file's ordering is not recoverable from it. That ordering is authored rather
   * than derivable: measured over 288,528 passes in the shipped corpus, 156 put
   * geometry before pixel (`0,3,1`) and 12 put it after (`0,1,3`). Any sort loses
   * one group or the other, so the sequence is kept.
   */
  stageOrder = [];

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
      { length: SHADER_STAGE_COUNT },
      (_, stageType) => Tr2EffectStageInput.createEmpty(stageType)
    );
    pass.shaderTypeMask = 0;

    for (const stageRecord of record.stages)
    {
      const stage = Tr2EffectStageInput.fromCarbonBinary(stageRecord);
      const stageType = requireShaderStageType(stage.stageType);
      if ((pass.shaderTypeMask & (1 << stageType)) !== 0)
      {
        throw new Error(
          `Carbon effect stage type ${stageType} is duplicated`
        );
      }
      pass.stageInputs[stageType] = stage;
      pass.shaderTypeMask = (pass.shaderTypeMask | (1 << stageType)) >>> 0;
    }

    pass.stageOrder = record.stages.map(stage => stage.type);
    pass.backendBlock = record.backendBlock
      ? { bytes: recordBytes(record.backendBlock), size: record.backendBlock.size }
      : null;

    return pass;
  }


  /**
   * The populated stages in the order they should be written.
   *
   * A retained order wins; anything present but unlisted follows in stage-type
   * order, so a pass assembled by hand still emits every stage it has.
   *
   * @returns {Array<object>} Stages in file order.
   */
  #orderedStages()
  {
    const present = this.stageInputs.filter(stage => stage?.exists);
    const ordered = [];
    for (const stageType of this.stageOrder)
    {
      const stage = present.find(entry => entry.stageType === stageType);
      if (stage && !ordered.includes(stage)) ordered.push(stage);
    }
    for (const stage of present)
    {
      if (!ordered.includes(stage)) ordered.push(stage);
    }
    return ordered;
  }

  /**
   * Emit this pass as a Carbon v15 record.
   *
   * Only stages that exist are written, in ascending stage type. The class keeps
   * six slots because Carbon addresses them positionally in memory; the file
   * stores a count and only the populated ones.
   *
   * Render states are sorted by id because Carbon holds them in a `std::map`.
   *
   * @returns {object} Carbon pass record.
   */
  toCarbonBinary()
  {
    const record = {
      stages: this.#orderedStages().map(stage => stage.toCarbonBinary()),
      renderStates: this.renderStateValues
        .map(entry => ({ state: entry.state, value: entry.value }))
        .sort((left, right) => left.state - right.state)
    };
    if (this.backendBlock)
    {
      record.backendBlock = toRecordBlob(
        this.backendBlock.bytes,
        this.backendBlock.size
      );
    }
    return record;
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
    stageOrder: [ impl.custom, impl.reason("Carbon indexes pass stages by type in a fixed array and loses the file's ordering; the device-free graph retains it so a body can be re-emitted as the file that produced it."), type.rawStruct("CjsEffectStageOrder") ],
    backendBlock: [ impl.custom, impl.reason("Carbon ends a pass at its render states; CarbonEngineJS containers may append one per-pass block carrying the backend program, which the resource retains uninterpreted for an engine to realize."), type.rawStruct("CjsEffectBackendBlock") ]
  }
});
