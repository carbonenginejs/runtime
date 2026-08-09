import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderJob as _TriRenderJob } from '../TriRenderJob.js';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_enableWireframe, _init_extra_enableWireframe;

/** Step that turns wireframe rasterization on or off for the steps that follow. */
let _TriStepEnableWirefra;
class TriStepEnableWireframeMode extends _TriRenderStep {
  static {
    ({
      e: [_init_enableWireframe, _init_extra_enableWireframe, _initProto],
      c: [_TriStepEnableWirefra, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepEnableWireframeMode",
      family: "renderJob"
    })], [[[io, io.readwrite, type, type.boolean], 16, "enableWireframe"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_enableWireframe(this);
  }
  enableWireframe = (_initProto(this), _init_enableWireframe(this, false));

  /** Stores the wireframe flag, defaulting to off. */
  __init__(value = false) {
    this.enableWireframe = !!value;
  }

  /**
   * Forwards the flag to the executor; nothing restores the previous mode, so a
   * matching step is needed to turn wireframe back off.
   */
  Execute(_realTime, _simTime, executor) {
    executor?.SetWireframeRendering?.(this.enableWireframe);
    return _TriRenderJob.StepResult.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepEnableWirefra as TriStepEnableWireframeMode };
//# sourceMappingURL=TriStepEnableWireframeMode.js.map
