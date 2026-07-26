import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderJob as _TriRenderJob } from './TriRenderJob.js';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_viewport, _init_extra_viewport;

/**
 * Step that installs a viewport, or restores the full-screen viewport when none
 * is authored.
 */
let _TriStepSetViewport;
class TriStepSetViewport extends _TriRenderStep {
  static {
    ({
      e: [_init_viewport, _init_extra_viewport, _initProto],
      c: [_TriStepSetViewport, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepSetViewport",
      family: "renderJob"
    })], [[[io, io.persist, void 0, type.objectRef("TriViewport")], 16, "viewport"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetViewport"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_viewport(this);
  }
  viewport = (_initProto(this), _init_viewport(this, null));

  /** Stores the viewport this step installs. */
  __init__(viewport = null) {
    this.SetViewport(viewport);
  }

  /**
   * Replaces the viewport; null selects the full-screen viewport instead of
   * leaving the current one.
   */
  SetViewport(viewport) {
    this.viewport = viewport ?? null;
  }

  /**
   * Sets the authored viewport, or asks the executor for its full-screen
   * viewport when none is set.
   */
  Execute(_realTime, _simTime, executor) {
    if (this.viewport) executor?.SetViewport?.(this.viewport);else executor?.SetFullScreenViewport?.();
    return _TriRenderJob.StepResult.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepSetViewport as TriStepSetViewport };
//# sourceMappingURL=TriStepSetViewport.js.map
