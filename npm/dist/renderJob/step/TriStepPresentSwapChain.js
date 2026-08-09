import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderJob as _TriRenderJob } from '../TriRenderJob.js';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_swapChain, _init_extra_swapChain;

/**
 * Step that presents a swap chain, publishing the frame that the preceding steps
 * produced.
 */
let _TriStepPresentSwapCh;
class TriStepPresentSwapChain extends _TriRenderStep {
  static {
    ({
      e: [_init_swapChain, _init_extra_swapChain, _initProto],
      c: [_TriStepPresentSwapCh, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepPresentSwapChain",
      family: "renderJob"
    })], [[[io, io.readwrite, void 0, type.objectRef("Tr2SwapChain")], 16, "swapChain"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_swapChain(this);
  }
  swapChain = (_initProto(this), _init_swapChain(this, null));

  /** Stores the swap chain to present. */
  __init__(swapChain = null) {
    this.swapChain = swapChain ?? null;
  }

  /**
   * Asks the executor to present the swap chain; with none set the step is a
   * no-op.
   */
  Execute(_realTime, _simTime, executor) {
    if (this.swapChain) executor?.PresentSwapChain?.(this.swapChain);
    return _TriRenderJob.StepResult.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepPresentSwapCh as TriStepPresentSwapChain };
//# sourceMappingURL=TriStepPresentSwapChain.js.map
