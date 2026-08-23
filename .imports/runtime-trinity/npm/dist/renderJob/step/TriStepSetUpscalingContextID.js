import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_upscalingContextID, _init_extra_upscalingContextID;

/** A render step that selects which upscaling context subsequent work resolves against. */
let _TriStepSetUpscalingC;
class TriStepSetUpscalingContextID extends _TriRenderStep {
  static {
    ({
      e: [_init_upscalingContextID, _init_extra_upscalingContextID, _initProto],
      c: [_TriStepSetUpscalingC, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepSetUpscalingContextID",
      family: "renderJob"
    })], [[[io, io.read, type, type.uint32], 16, "upscalingContextID"], [[carbon, carbon.method, impl, impl.implemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_upscalingContextID(this);
  }
  /** m_upscalingContextID (uint32_t) [READ] */
  upscalingContextID = (_initProto(this), _init_upscalingContextID(this, 0xffffffff));

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(upscalingContextID = 0xffffffff) {
    this.upscalingContextID = Number(upscalingContextID) >>> 0;
  }

  /**
   * Selects the upscaling context subsequent steps resolve against.
   */
  Execute(_realTime, _simTime, executor) {
    executor?.SetUpscalingContextID?.(this.upscalingContextID);
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepSetUpscalingC as TriStepSetUpscalingContextID };
//# sourceMappingURL=TriStepSetUpscalingContextID.js.map
