import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_scene, _init_extra_scene;

/** A render step that renders one scene at its point in the job order. */
let _TriStepRenderScene;
class TriStepRenderScene extends _TriRenderStep {
  static {
    ({
      e: [_init_scene, _init_extra_scene, _initProto],
      c: [_TriStepRenderScene, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepRenderScene",
      family: "renderJob"
    })], [[[io, io.persist, void 0, type.model("ITr2Scene")], 16, "scene"], [[carbon, carbon.method, impl, impl.implemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_scene(this);
  }
  /** m_scene (ITr2ScenePtr) [READWRITE, PERSIST] */
  scene = (_initProto(this), _init_scene(this, null));

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(scene = null) {
    this.scene = scene;
  }

  /**
   * Renders the bound scene through the executor and reports the step complete.
   */
  Execute(_realTime, _simTime, executor) {
    this.scene?.Render?.(executor);
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepRenderScene as TriStepRenderScene };
//# sourceMappingURL=TriStepRenderScene.js.map
