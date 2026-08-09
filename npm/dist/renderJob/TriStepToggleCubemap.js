import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_m_showCubemap, _init_extra_m_showCubemap;

/** A render step that turns a scene cubemap display on or off. */
let _TriStepToggleCubemap;
class TriStepToggleCubemap extends _TriRenderStep {
  static {
    ({
      e: [_init_m_showCubemap, _init_extra_m_showCubemap, _initProto],
      c: [_TriStepToggleCubemap, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepToggleCubemap",
      family: "renderJob"
    })], [[[io, io.readwrite, type, type.boolean], 16, "m_showCubemap"], [[carbon, carbon.method, impl, impl.implemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_m_showCubemap(this);
  }
  /** Carbon-private Tr2InteriorScene pointer; runtime-only and not serialized. */
  #scene = (_initProto(this), null);

  /** m_showCubemap (bool) [READWRITE] */
  m_showCubemap = _init_m_showCubemap(this, true);

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(showCubemap = true, scene = null) {
    this.m_showCubemap = Boolean(showCubemap);
    this.#scene = scene;
  }

  /** Enables or disables the interior scene's background cubemap. */
  Execute(_realTime, _simTime, _renderContext) {
    if (this.#scene) {
      this.#scene.SetRenderBackgroundCubeMap(this.m_showCubemap);
    }
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepToggleCubemap as TriStepToggleCubemap };
//# sourceMappingURL=TriStepToggleCubemap.js.map
