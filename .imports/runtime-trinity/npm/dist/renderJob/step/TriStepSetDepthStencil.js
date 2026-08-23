import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderJob as _TriRenderJob } from '../TriRenderJob.js';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_depthStencil, _init_extra_depthStencil;

/**
 * Step that binds a depth-stencil directly, without touching the depth-stencil
 * stack.
 */
let _TriStepSetDepthStenc;
class TriStepSetDepthStencil extends _TriRenderStep {
  static {
    ({
      e: [_init_depthStencil, _init_extra_depthStencil, _initProto],
      c: [_TriStepSetDepthStenc, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepSetDepthStencil",
      family: "renderJob"
    })], [[[io, io.readwrite, void 0, type.objectRef("Tr2DepthStencil")], 16, "depthStencil"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_depthStencil(this);
  }
  depthStencil = (_initProto(this), _init_depthStencil(this, null));

  /** Stores the depth-stencil to bind. */
  __init__(depthStencil = null) {
    this.depthStencil = depthStencil ?? null;
  }

  /**
   * Binds the depth-stencil, including null to unbind; an explicit false from
   * the executor is RS_FAILED.
   */
  Execute(_realTime, _simTime, executor) {
    const accepted = executor?.SetDepthStencil?.(this.depthStencil);
    return accepted === false ? _TriRenderJob.StepResult.RS_FAILED : _TriRenderJob.StepResult.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepSetDepthStenc as TriStepSetDepthStencil };
//# sourceMappingURL=TriStepSetDepthStencil.js.map
