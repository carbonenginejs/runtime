import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_passType, _init_extra_passType, _init_scene, _init_extra_scene;

/** A render step that renders one named pass of a multi-pass scene. */
let _TriStepRenderPass;
new class extends _identity {
  static [class TriStepRenderPass extends _TriRenderStep {
    static {
      ({
        e: [_init_passType, _init_extra_passType, _init_scene, _init_extra_scene, _initProto],
        c: [_TriStepRenderPass, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriStepRenderPass",
        family: "renderJob"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("PassType")], 16, "passType"], [[io, io.persist, void 0, type.model("ITr2MultiPassScene")], 16, "scene"], [[carbon, carbon.method, impl, impl.implemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
    }
    constructor(...args) {
      super(...args);
      _init_extra_scene(this);
    }
    /** m_pass (ITr2MultiPassScene::PassType - enum PassType) [READWRITE, PERSIST, ENUM] */
    passType = (_initProto(this), _init_passType(this, 0));

    /** m_scene (ITr2MultiPassScenePtr) [READWRITE, PERSIST] */
    scene = (_init_extra_passType(this), _init_scene(this, null));

    /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
    __init__(scene = null, passType = 0) {
      this.scene = scene;
      this.passType = Number(passType) | 0;
    }

    /**
     * Renders the configured pass of the bound multi-pass scene.
     */
    Execute(_realTime, _simTime, executor) {
      const result = this.scene?.RenderPass?.(this.passType, executor);
      return result === 1 ? _TriRenderStep.Result.RS_TERMINATE : _TriRenderStep.Result.RS_OK;
    }
  }];
  PassType = Object.freeze({
    RP_BEGIN_RENDER: 0,
    RP_PRE_PASS: 1,
    RP_LIGHT_PASS: 2,
    RP_GATHER_PASS: 3,
    RP_FLARE_PASS: 4,
    RP_END_RENDER: 5,
    RP_BACKGROUND_RENDER: 6,
    RP_MAIN_RENDER: 7,
    RP_REFLECTION_RENDER: 8,
    RP_DEPTH_PASS: 9,
    RP_SET_PERFRAME_DATA: 10,
    RP_RENDER_UI: 11,
    RP_COUNT: 12
  });
  constructor() {
    super(_TriStepRenderPass), _initClass();
  }
}();

export { _TriStepRenderPass as TriStepRenderPass };
//# sourceMappingURL=TriStepRenderPass.js.map
