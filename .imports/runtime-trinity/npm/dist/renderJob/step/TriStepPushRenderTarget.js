import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';
import { TriRenderJob as _TriRenderJob } from '../TriRenderJob.js';

let _initProto, _initClass, _init_slot, _init_extra_slot, _init_renderTarget, _init_extra_renderTarget;

/** Step that pushes a render target onto the executor's stack for a given slot. */
let _TriStepPushRenderTar;
class TriStepPushRenderTarget extends _TriRenderStep {
  static {
    ({
      e: [_init_slot, _init_extra_slot, _init_renderTarget, _init_extra_renderTarget, _initProto],
      c: [_TriStepPushRenderTar, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepPushRenderTarget",
      family: "renderJob"
    })], [[[io, io.readwrite, type, type.uint32], 16, "slot"], [[io, io.readwrite, void 0, type.objectRef("Tr2RenderTarget")], 16, "renderTarget"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_renderTarget(this);
  }
  slot = (_initProto(this), _init_slot(this, 0));
  renderTarget = (_init_extra_slot(this), _init_renderTarget(this, null));

  /** Stores the render target and the slot it is pushed for. */
  __init__(renderTarget = null, slot = 0) {
    this.renderTarget = renderTarget ?? null;
    this.slot = Number(slot) >>> 0;
  }

  /**
   * Pushes the render target for its slot; every push needs a matching
   * TriStepPopRenderTarget in the same job or the job's stack guard unwinds it.
   */
  Execute(_realTime, _simTime, executor) {
    executor?.PushRenderTarget?.(this.renderTarget, this.slot);
    return _TriRenderJob.StepResult.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepPushRenderTar as TriStepPushRenderTarget };
//# sourceMappingURL=TriStepPushRenderTarget.js.map
