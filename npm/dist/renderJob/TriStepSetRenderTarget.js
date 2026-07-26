import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderJob as _TriRenderJob } from './TriRenderJob.js';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_renderTarget, _init_extra_renderTarget;

/**
 * Step that binds a render target to slot 0 directly, without touching the
 * render-target stack.
 */
let _TriStepSetRenderTarg;
class TriStepSetRenderTarget extends _TriRenderStep {
  static {
    ({
      e: [_init_renderTarget, _init_extra_renderTarget, _initProto],
      c: [_TriStepSetRenderTarg, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepSetRenderTarget",
      family: "renderJob"
    })], [[[io, io.persist, void 0, type.objectRef("Tr2RenderTarget")], 16, "renderTarget"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_renderTarget(this);
  }
  renderTarget = (_initProto(this), _init_renderTarget(this, null));

  /** Stores the render target to bind. */
  __init__(renderTarget = null) {
    this.renderTarget = renderTarget ?? null;
  }

  /**
   * Binds the render target to slot 0; with none set the current binding is left
   * alone rather than cleared.
   */
  Execute(_realTime, _simTime, executor) {
    if (this.renderTarget) executor?.SetRenderTarget?.(0, this.renderTarget);
    return _TriRenderJob.StepResult.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepSetRenderTarg as TriStepSetRenderTarget };
//# sourceMappingURL=TriStepSetRenderTarget.js.map
