import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';
import { TriRenderJob as _TriRenderJob } from '../TriRenderJob.js';

let _initProto, _initClass;

// Carbon: RenderJob/TriStepPopViewTransform.cpp — Execute pops the view
// transform (Tr2Renderer::PopViewTransform).

/**
 * Step that pops the executor's view-transform stack, restoring the view saved
 * by an earlier push.
 */
let _TriStepPopViewTransf;
class TriStepPopViewTransform extends _TriRenderStep {
  static {
    ({
      e: [_initProto],
      c: [_TriStepPopViewTransf, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepPopViewTransform",
      family: "renderJob"
    })], [[[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _initProto(this);
  }
  /** Restores the view transform saved by the matching push step. */
  Execute(_realTime, _simTime, executor) {
    executor?.PopViewTransform?.();
    return _TriRenderJob.StepResult.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepPopViewTransf as TriStepPopViewTransform };
//# sourceMappingURL=TriStepPopViewTransform.js.map
