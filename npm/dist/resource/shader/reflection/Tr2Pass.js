import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { isPlainObject, isArray, isUint32 } from '@carbonenginejs/runtime-utils/is';
import { requirePortableStageType } from '../portable.js';
import { Tr2EffectStageInput as _Tr2EffectStageInput } from './Tr2EffectStageInput.js';

let _initStatic, _initClass, _init_stageInputs, _init_extra_stageInputs, _init_renderStates, _init_extra_renderStates, _init_shaderTypeMask, _init_extra_shaderTypeMask, _init_shaderProgram, _init_extra_shaderProgram, _init_resourceSetDesc, _init_extra_resourceSetDesc, _init_indirectLayout, _init_extra_indirectLayout, _init_renderStateValues, _init_extra_renderStateValues;
const SHADER_TYPE_COUNT = 6;

/** Reflected effect pass; backend program and state handles remain engine-owned. */
let _Tr2Pass;
class Tr2Pass extends CjsModel {
  static {
    ({
      e: [_init_stageInputs, _init_extra_stageInputs, _init_renderStates, _init_extra_renderStates, _init_shaderTypeMask, _init_extra_shaderTypeMask, _init_shaderProgram, _init_extra_shaderProgram, _init_resourceSetDesc, _init_extra_resourceSetDesc, _init_indirectLayout, _init_extra_indirectLayout, _init_renderStateValues, _init_extra_renderStateValues, _initStatic],
      c: [_Tr2Pass, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Pass",
      family: "shader"
    })], [[type.list("Tr2EffectStageInput"), 0, "stageInputs"], [[type, type.uint32], 16, "renderStates"], [[type, type.uint32], 16, "shaderTypeMask"], [[type, type.uint32], 16, "shaderProgram"], [type.rawStruct("Tr2ResourceSetDescriptionAL"), 0, "resourceSetDesc"], [type.rawStruct("Tr2IndirectDrawBufferLayout"), 0, "indirectLayout"], [[impl, impl.adapted, void 0, impl.reason("Carbon stores a renderer-owned render-state handle; the device-free graph retains the authored state/value pairs until an engine realizes them."), void 0, type.rawStruct("CjsEffectRenderStateValues")], 16, "renderStateValues"], [[impl, impl.custom, void 0, impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing.")], 26, "fromPortable"]], 0, void 0, CjsModel));
    _initStatic(this);
  }
  constructor(...args) {
    super(...args);
    _init_extra_renderStateValues(this);
  }
  /** stageInputs (Tr2EffectStageInput) */
  stageInputs = _init_stageInputs(this, []);

  /** renderStates (unsigned int) */
  renderStates = (_init_extra_stageInputs(this), _init_renderStates(this, 0));

  /** shaderTypeMask (unsigned int) */
  shaderTypeMask = (_init_extra_renderStates(this), _init_shaderTypeMask(this, 0));

  /** shaderProgram (unsigned int) */
  shaderProgram = (_init_extra_shaderTypeMask(this), _init_shaderProgram(this, 0));

  /** resourceSetDesc (Tr2ResourceSetDescriptionAL) */
  resourceSetDesc = (_init_extra_shaderProgram(this), _init_resourceSetDesc(this, null));

  /** indirectLayout (Tr2IndirectDrawBufferLayout) */
  indirectLayout = (_init_extra_resourceSetDesc(this), _init_indirectLayout(this, null));

  /** Exact authored render-state pairs retained before an engine creates a state handle. */
  renderStateValues = (_init_extra_indirectLayout(this), _init_renderStateValues(this, []));

  /**
   * Build one pass from its portable JSON reflection record.
   *
   * @param {object} value Portable pass record.
   * @returns {Tr2Pass} Reflected pass.
   */
  static fromPortable(value) {
    if (!isPlainObject(value)) {
      throw new TypeError("Portable effect pass must be an object");
    }
    if (!isArray(value.renderStates)) {
      throw new TypeError("Portable effect render states must be an array");
    }
    if (!isArray(value.stages)) {
      throw new TypeError("Portable effect stages must be an array");
    }
    if (value.renderStateCount !== value.renderStates.length || value.stageCount !== value.stages.length) {
      throw new Error("Portable effect pass counts disagree with its collections");
    }
    const pass = new this();
    const renderStateIds = new Set();
    pass.renderStateValues = value.renderStates.map(entry => {
      if (!isUint32(entry?.state)) {
        throw new RangeError("Portable render-state id must fit uint32");
      }
      if (!isUint32(entry?.value)) {
        throw new RangeError("Portable render-state value must fit uint32");
      }
      if (renderStateIds.has(entry.state)) {
        throw new Error(`Portable render-state id ${entry.state} is duplicated`);
      }
      renderStateIds.add(entry.state);
      return {
        state: entry.state,
        value: entry.value
      };
    });
    const stageTypes = new Set();
    value.stages.forEach(stage => {
      const stageType = requirePortableStageType(stage?.stageType);
      if (stageTypes.has(stageType)) {
        throw new Error(`Portable effect stage type ${stageType} is duplicated`);
      }
      stageTypes.add(stageType);
    });
    pass.stageInputs = Array.from({
      length: SHADER_TYPE_COUNT
    }, (_, stageType) => _Tr2EffectStageInput.createEmpty(stageType));
    pass.shaderTypeMask = 0;
    for (const stageValue of value.stages) {
      const stage = _Tr2EffectStageInput.fromPortable(stageValue);
      pass.stageInputs[stage.stageType] = stage;
      pass.shaderTypeMask = (pass.shaderTypeMask | 1 << stage.stageType) >>> 0;
    }
    return pass;
  }
  static {
    _initClass();
  }
}

export { _Tr2Pass as Tr2Pass };
//# sourceMappingURL=Tr2Pass.js.map
