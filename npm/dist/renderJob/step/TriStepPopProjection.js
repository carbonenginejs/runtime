import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';
import { TriRenderJob as _TriRenderJob } from '../TriRenderJob.js';

let _initProto, _initClass;

// Carbon: RenderJob/TriStepPopProjection.cpp — Execute pops the projection
// (Tr2Renderer::PopProjection).

/**
 * Step that pops the executor's projection stack, restoring the projection saved
 * by an earlier push.
 */
let _TriStepPopProjection;
class TriStepPopProjection extends _TriRenderStep {
  static {
    ({
      e: [_initProto],
      c: [_TriStepPopProjection, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepPopProjection",
      family: "renderJob"
    })], [[[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _initProto(this);
  }
  /** Restores the projection saved by the matching push step. */
  Execute(_realTime, _simTime, executor) {
    executor?.PopProjection?.();
    return _TriRenderJob.StepResult.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepPopProjection as TriStepPopProjection };
//# sourceMappingURL=TriStepPopProjection.js.map
