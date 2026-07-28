// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import {
  isArray,
  isPlainObject,
  isUint32
} from "@carbonenginejs/runtime-utils/is";
import { requirePortableStageType } from "../portable.js";
import { Tr2EffectStageInput } from "./Tr2EffectStageInput.js";

const SHADER_TYPE_COUNT = 6;

/** Reflected effect pass; backend program and state handles remain engine-owned. */
@type.define({ className: "Tr2Pass", family: "shader" })
export class Tr2Pass extends CjsModel
{

  /** stageInputs (Tr2EffectStageInput) */
  @type.list("Tr2EffectStageInput")
  stageInputs = [];

  /** renderStates (unsigned int) */
  @type.uint32
  renderStates = 0;

  /** shaderTypeMask (unsigned int) */
  @type.uint32
  shaderTypeMask = 0;

  /** shaderProgram (unsigned int) */
  @type.uint32
  shaderProgram = 0;

  /** resourceSetDesc (Tr2ResourceSetDescriptionAL) */
  @type.rawStruct("Tr2ResourceSetDescriptionAL")
  resourceSetDesc = null;

  /** indirectLayout (Tr2IndirectDrawBufferLayout) */
  @type.rawStruct("Tr2IndirectDrawBufferLayout")
  indirectLayout = null;

  /** Exact authored render-state pairs retained before an engine creates a state handle. */
  @impl.adapted
  @impl.reason("Carbon stores a renderer-owned render-state handle; the device-free graph retains the authored state/value pairs until an engine realizes them.")
  @type.rawStruct("CjsEffectRenderStateValues")
  renderStateValues = [];

  /**
   * Build one pass from its portable JSON reflection record.
   *
   * @param {object} value Portable pass record.
   * @returns {Tr2Pass} Reflected pass.
   */
  @impl.custom
  @impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing.")
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
