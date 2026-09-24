// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { assertCarbonRecord } from "../../format/carbonRecordGuard.js";
import { CjsSchema, impl, type } from "#schema";
import { CjsModel } from "#model";
import {
} from "#utils/is";
import { requireShaderStageType, SHADER_STAGE_COUNT, ShaderStageType } from "./shaderStage.js";
import { Tr2EffectStageInput } from "./Tr2EffectStageInput.js";
import { recordBytes, toRecordBlob } from "./carbonRecordFields.js";
import { CARBON_BACKEND_ENGINE_ID, peekBackendEngineId } from "../../format/carbonEffect/backendEngineId.js";
import { readBackendBlock } from "../../format/carbonEffect/carbonEffectBackendBlock.js";
import { readGlslBackendBlock } from "../../formats/webgl/core/glslBackendBlock.js";

/** Reflected effect pass; Carbon's interned program and state handles are kept as authored data. */
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
   * The optional backend block is retained verbatim. It is the one place the
   * container diverges by backend, and deciding what it means is the engine's
   * job, not the reader's - with one exception: the texture merges it records
   * are copied onto the pixel stage's reflected resources
   * (`readMergedResources`).
   *
   * @param {object} record Carbon pass record.
   * @returns {Tr2Pass} Reflected pass.
   */
  static fromCarbonBinary(record)
  {
    assertCarbonRecord(record, "pass");

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

    // THE BLOCK RIDES THE SIGNATURE, STILL UNINTERPRETED. Carbon's signature is
    // the one thing Trinity hands a backend at CreateShader besides the
    // bytecode (Tr2EffectDescription.cpp:589-593), and backends consume it
    // without adding to it - Metal even refuses a field it cannot honour
    // (Tr2ShaderALMetal.mm:24-27). Our per-pass block is backend information
    // of exactly that kind, so it travels the same road: stamped on every stage
    // of the pass, read by the backend whose block it is, ignored by the rest.
    // The pass keeps its own copy for the format libraries that read it today.
    if (pass.backendBlock)
    {
      for (const stage of pass.stageInputs)
      {
        if (stage?.exists && stage.signature) stage.signature.backendBlock = pass.backendBlock;
      }
    }

    // The one part of the block that is not the backend's alone: which textures
    // were merged. The effect binds by register from this reflection, so the
    // merged register has to say what it now holds.
    const pixel = pass.stageInputs[ShaderStageType.PIXEL_SHADER];

    for (const merge of Tr2Pass.readMergedResources(pass.backendBlock))
    {
      const resource = pixel.resources.get(merge.register);

      if (!resource)
      {
        throw new Error(`Backend block merges into t${merge.register}, which the pixel stage does not reflect`);
      }

      resource.arrayLayers = merge.arrayLayers;
      resource.packed = merge.packed;
    }

    return pass;
  }

  /**
   * The texture merges a pass's backend block records, each at the register the
   * merged texture binds to.
   *
   * Not Carbon; see `Tr2EffectResource.arrayLayers`. The merge list is shared by
   * both browser backends, but where the merged texture landed is not: WebGPU
   * tags the binding with the merge's id, and the GLSL emitter declares it as
   * `s` + the merge's output name at the first member it met. A merge with no
   * such binding was never sampled in this body, so it is left out. Blocks of
   * any other backend record no merges.
   *
   * @param {{bytes: Uint8Array}|null} backendBlock The pass's backend block.
   * @returns {Array<{register: number, arrayLayers: string[], packed: boolean}>} The merges.
   */
  static readMergedResources(backendBlock)
  {
    if (!backendBlock) return [];

    const engine = peekBackendEngineId(backendBlock.bytes);
    let transforms;
    let registerOf;

    if (engine === CARBON_BACKEND_ENGINE_ID.webgpu)
    {
      const block = readBackendBlock(backendBlock.bytes, { source: "Tr2Pass.backendBlock" });
      const bindings = block.bindGroups.flatMap(group => group.bindings);

      transforms = block.transforms;
      registerOf = transform => bindings.find(binding => binding.transformId === transform.id)?.registerIndex;
    }
    else if (engine === CARBON_BACKEND_ENGINE_ID.webgl2)
    {
      const block = readGlslBackendBlock(backendBlock.bytes, { source: "Tr2Pass.backendBlock" });
      const bindings = block.stages.pixel?.bindings ?? [];

      transforms = block.transforms;
      registerOf = transform => bindings.find(binding => binding.kind === "resource" && binding.name === `s${transform.output.name}`)?.registerIndex;
    }
    else
    {
      return [];
    }

    const merges = [];

    for (const transform of transforms)
    {
      if (transform.kind !== "texture-2d-array" && transform.kind !== "texture-2d-packed") continue;

      const register = registerOf(transform);

      if (register === undefined) continue;

      merges.push({
        register,
        arrayLayers: transform.inputs.map(input => input.parameter),
        packed: transform.kind === "texture-2d-packed"
      });
    }

    return merges;
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
    renderStateValues: [ impl.adapted, impl.reason("Carbon interns the state block while reading (Tr2EffectStateManager::RegisterRenderStateSetup, .h:118) and keeps only the renderStates index (Tr2EffectDescription.h:202). Ours interns at the Trinity boundary, so the authored state/value pairs are retained until then; see Tr2EffectStateManager.registerShaderHandles."), type.rawStruct("CjsEffectRenderStateValues") ],
    stageOrder: [ impl.custom, impl.reason("Carbon indexes pass stages by type in a fixed array and loses the file's ordering; the port retains it so a body can be re-emitted as the file that produced it."), type.rawStruct("CjsEffectStageOrder") ],
    backendBlock: [ impl.custom, impl.reason("Carbon ends a pass at its render states; CarbonEngineJS containers may append one per-pass block carrying the backend program, which the resource retains, reading only its texture merges."), type.rawStruct("CjsEffectBackendBlock") ]
  },
  methods: {
    readMergedResources: impl.custom
  }
});
