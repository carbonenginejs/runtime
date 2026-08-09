import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_scene, _init_extra_scene;

/** A render step that draws a scene through its debug representation rather than its normal path. */
let _TriStepRenderSceneDe;
class TriStepRenderSceneDebug extends _TriRenderStep {
  static {
    ({
      e: [_init_scene, _init_extra_scene, _initProto],
      c: [_TriStepRenderSceneDe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepRenderSceneDebug",
      family: "renderJob"
    })], [[[io, io.readwrite, void 0, type.objectRef("ITr2Scene")], 16, "scene"], [[carbon, carbon.method, impl, impl.implemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_scene(this);
  }
  /** m_scene (ITr2ScenePtr) [READWRITE] */
  scene = (_initProto(this), _init_scene(this, null));

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(scene = null) {
    this.scene = scene;
  }

  /**
   * Renders the bound scene through its debug representation and reports the step complete.
   */
  Execute(_realTime, _simTime, executor) {
    this.scene?.RenderDebugInfo?.(executor);
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepRenderSceneDe as TriStepRenderSceneDebug };
//# sourceMappingURL=TriStepRenderSceneDebug.js.map
