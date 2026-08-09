import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderJob as _TriRenderJob } from '../TriRenderJob.js';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_renderTarget, _init_extra_renderTarget;

/** Step that requests regeneration of a render target's mip chain. */
let _TriStepGenerateMipMa;
class TriStepGenerateMipMaps extends _TriRenderStep {
  static {
    ({
      e: [_init_renderTarget, _init_extra_renderTarget, _initProto],
      c: [_TriStepGenerateMipMa, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepGenerateMipMaps",
      family: "renderJob"
    })], [[[io, io.persist, void 0, type.objectRef("Tr2RenderTarget")], 16, "renderTarget"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_renderTarget(this);
  }
  renderTarget = (_initProto(this), _init_renderTarget(this, null));

  /** Stores the render target whose mip chain is regenerated. */
  __init__(renderTarget = null) {
    this.renderTarget = renderTarget ?? null;
  }

  /**
   * Asks the executor to regenerate the target's mip maps; with no target set
   * the step is a no-op.
   */
  Execute(_realTime, _simTime, executor) {
    if (this.renderTarget) executor?.GenerateMipMaps?.(this.renderTarget);
    return _TriRenderJob.StepResult.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepGenerateMipMa as TriStepGenerateMipMaps };
//# sourceMappingURL=TriStepGenerateMipMaps.js.map
