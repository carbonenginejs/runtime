import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';
import { TriRenderJob as _TriRenderJob } from '../TriRenderJob.js';

let _initProto, _initClass;

// Carbon: RenderJob/TriStepPopViewport.cpp — Execute pops the viewport off the
// render context's ESM stack.

/**
 * Step that pops the executor's viewport stack, restoring the viewport saved by
 * an earlier push.
 */
let _TriStepPopViewport;
class TriStepPopViewport extends _TriRenderStep {
  static {
    ({
      e: [_initProto],
      c: [_TriStepPopViewport, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepPopViewport",
      family: "renderJob"
    })], [[[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _initProto(this);
  }
  /** Restores the viewport saved by the matching push step. */
  Execute(_realTime, _simTime, executor) {
    executor?.PopViewport?.();
    return _TriRenderJob.StepResult.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepPopViewport as TriStepPopViewport };
//# sourceMappingURL=TriStepPopViewport.js.map
