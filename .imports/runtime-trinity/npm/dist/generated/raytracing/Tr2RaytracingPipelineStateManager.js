import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_pipelineDesc, _init_extra_pipelineDesc, _init_pipelineState, _init_extra_pipelineState, _init_nextName, _init_extra_nextName, _init_isDirty, _init_extra_isDirty;

/** Tr2RaytracingPipelineStateManager (raytracing) - generated from schema shapeHash 2cdb201b.... */
let _Tr2RaytracingPipelin;
class Tr2RaytracingPipelineStateManager extends CjsModel {
  static {
    ({
      e: [_init_pipelineDesc, _init_extra_pipelineDesc, _init_pipelineState, _init_extra_pipelineState, _init_nextName, _init_extra_nextName, _init_isDirty, _init_extra_isDirty],
      c: [_Tr2RaytracingPipelin, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2RaytracingPipelineStateManager",
      family: "raytracing"
    })], [[type.rawStruct("Tr2RtPipelineStateDescriptionAL"), 0, "pipelineDesc"], [type.rawStruct("Tr2RtPipelineStateAL"), 0, "pipelineState"], [[type, type.uint32], 16, "nextName"], [[type, type.boolean], 16, "isDirty"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_isDirty(this);
  }
  /** m_pipelineDesc (Tr2RtPipelineStateDescriptionAL) */
  pipelineDesc = _init_pipelineDesc(this, null);

  /** m_pipelineState (Tr2RtPipelineStateAL) */
  pipelineState = (_init_extra_pipelineDesc(this), _init_pipelineState(this, null));

  /** m_nextName (uint32_t) */
  nextName = (_init_extra_pipelineState(this), _init_nextName(this, 0));

  /** m_isDirty (bool) */
  isDirty = (_init_extra_nextName(this), _init_isDirty(this, false));
  static {
    _initClass();
  }
}

export { _Tr2RaytracingPipelin as Tr2RaytracingPipelineStateManager };
//# sourceMappingURL=Tr2RaytracingPipelineStateManager.js.map
