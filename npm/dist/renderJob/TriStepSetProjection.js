import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderJob as _TriRenderJob } from './TriRenderJob.js';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_projection, _init_extra_projection;

/** Step that installs an authored projection for the steps that follow. */
let _TriStepSetProjection;
class TriStepSetProjection extends _TriRenderStep {
  static {
    ({
      e: [_init_projection, _init_extra_projection, _initProto],
      c: [_TriStepSetProjection, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepSetProjection",
      family: "renderJob"
    })], [[[io, io.persist, void 0, type.objectRef("TriProjection")], 16, "projection"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetProjection"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_projection(this);
  }
  projection = (_initProto(this), _init_projection(this, null));

  /** Stores the projection this step installs. */
  __init__(projection = null) {
    this.SetProjection(projection);
  }

  /**
   * Replaces the projection; null makes the step a no-op rather than clearing
   * the current projection.
   */
  SetProjection(projection) {
    this.projection = projection ?? null;
  }

  /**
   * Installs the projection on the executor when one is authored, leaving the
   * current projection untouched otherwise.
   */
  Execute(_realTime, _simTime, executor) {
    if (this.projection) executor?.SetProjection?.(this.projection);
    return _TriRenderJob.StepResult.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepSetProjection as TriStepSetProjection };
//# sourceMappingURL=TriStepSetProjection.js.map
