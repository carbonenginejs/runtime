import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';
import { TriRenderJob as _TriRenderJob } from './TriRenderJob.js';

let _initProto, _initClass;

/** Step that pops the executor's depth-stencil stack, undoing an earlier push. */
let _TriStepPopDepthStenc;
class TriStepPopDepthStencil extends _TriRenderStep {
  static {
    ({
      e: [_initProto],
      c: [_TriStepPopDepthStenc, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepPopDepthStencil",
      family: "renderJob"
    })], [[[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _initProto(this);
  }
  /**
   * Pops the depth-stencil pushed earlier in the job; popping more than was
   * pushed trips the job's stack guard.
   */
  Execute(_realTime, _simTime, executor) {
    executor?.PopDepthStencil?.();
    return _TriRenderJob.StepResult.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepPopDepthStenc as TriStepPopDepthStencil };
//# sourceMappingURL=TriStepPopDepthStencil.js.map
