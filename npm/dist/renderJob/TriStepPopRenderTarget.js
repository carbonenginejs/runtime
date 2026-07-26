import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';
import { TriRenderJob as _TriRenderJob } from './TriRenderJob.js';

let _initProto, _initClass, _init_slot, _init_extra_slot;

/**
 * Step that pops one slot off the executor's render-target stack, undoing an
 * earlier push.
 */
let _TriStepPopRenderTarg;
class TriStepPopRenderTarget extends _TriRenderStep {
  static {
    ({
      e: [_init_slot, _init_extra_slot, _initProto],
      c: [_TriStepPopRenderTarg, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepPopRenderTarget",
      family: "renderJob"
    })], [[[io, io.readwrite, type, type.uint32], 16, "slot"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_slot(this);
  }
  slot = (_initProto(this), _init_slot(this, 0));

  /** Stores the render-target slot to pop. */
  __init__(slot = 0) {
    this.slot = Number(slot) >>> 0;
  }

  /**
   * Pops the recorded slot; the matching push must occur earlier in the same job
   * or the job's stack guard reports an underflow.
   */
  Execute(_realTime, _simTime, executor) {
    executor?.PopRenderTarget?.(this.slot);
    return _TriRenderJob.StepResult.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepPopRenderTarg as TriStepPopRenderTarget };
//# sourceMappingURL=TriStepPopRenderTarget.js.map
