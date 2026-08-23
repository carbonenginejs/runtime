import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';
import { TriRenderJob as _TriRenderJob } from '../TriRenderJob.js';

let _initProto, _initClass, _init_pushCurrent, _init_extra_pushCurrent, _init_depthStencil, _init_extra_depthStencil;

/**
 * Step that pushes either a named depth-stencil or the currently bound one onto
 * the executor's depth-stencil stack.
 */
let _TriStepPushDepthSten;
class TriStepPushDepthStencil extends _TriRenderStep {
  static {
    ({
      e: [_init_pushCurrent, _init_extra_pushCurrent, _init_depthStencil, _init_extra_depthStencil, _initProto],
      c: [_TriStepPushDepthSten, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepPushDepthStencil",
      family: "renderJob"
    })], [[[io, io.readwrite, type, type.boolean], 16, "pushCurrent"], [[io, io.readwrite, void 0, type.objectRef("Tr2DepthStencil")], 16, "depthStencil"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_depthStencil(this);
  }
  pushCurrent = (_initProto(this), _init_pushCurrent(this, false));
  depthStencil = (_init_extra_pushCurrent(this), _init_depthStencil(this, null));

  /**
   * Constructing with no arguments selects push-current mode, meaning re-push
   * whatever is bound at execution time; passing an argument - including null -
   * pushes that value instead.
   */
  __init__(depthStencil) {
    this.pushCurrent = arguments.length === 0;
    this.depthStencil = this.pushCurrent ? null : depthStencil ?? null;
  }

  /**
   * Pushes the depth-stencil, signalling push-current mode by passing undefined;
   * an explicit false from the executor is RS_FAILED. Every push needs a
   * matching pop in the same job or the job's stack guard unwinds it.
   */
  Execute(_realTime, _simTime, executor) {
    const accepted = executor?.PushDepthStencil?.(this.pushCurrent ? undefined : this.depthStencil);
    return accepted === false ? _TriRenderJob.StepResult.RS_FAILED : _TriRenderJob.StepResult.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepPushDepthSten as TriStepPushDepthStencil };
//# sourceMappingURL=TriStepPushDepthStencil.js.map
