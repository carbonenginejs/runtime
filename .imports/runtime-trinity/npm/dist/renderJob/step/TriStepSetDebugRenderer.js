import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_renderer, _init_extra_renderer;

/** A render step that installs the debug renderer subsequent debug drawing routes through. */
let _TriStepSetDebugRende;
class TriStepSetDebugRenderer extends _TriRenderStep {
  static {
    ({
      e: [_init_renderer, _init_extra_renderer, _initProto],
      c: [_TriStepSetDebugRende, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepSetDebugRenderer",
      family: "renderJob"
    })], [[[io, io.readwrite, void 0, type.objectRef("ITr2DebugRenderer")], 16, "renderer"], [[carbon, carbon.method, impl, impl.implemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDebugRenderer"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_renderer(this);
  }
  /** m_debugRenderer (ITr2DebugRendererPtr) [READWRITE] */
  renderer = (_initProto(this), _init_renderer(this, null));

  /** Carbon method __init__ -> SetDebugRenderer (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(renderer = null) {
    this.SetDebugRenderer(renderer);
  }

  /**
   * Binds the debug renderer this step installs; null detaches it.
   */
  SetDebugRenderer(renderer) {
    this.renderer = renderer ?? null;
  }

  /**
   * Installs the bound debug renderer on the executor.
   */
  Execute(_realTime, _simTime, executor) {
    executor?.SetDebugRenderer?.(this.renderer);
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepSetDebugRende as TriStepSetDebugRenderer };
//# sourceMappingURL=TriStepSetDebugRenderer.js.map
