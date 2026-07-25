import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderJob as _TriRenderJob } from './TriRenderJob.js';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_view, _init_extra_view, _init_camera, _init_extra_camera;
let _TriStepSetView;
new class extends _identity {
  static [class TriStepSetView extends _TriRenderStep {
    static {
      ({
        e: [_init_view, _init_extra_view, _init_camera, _init_extra_camera, _initProto],
        c: [_TriStepSetView, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriStepSetView",
        family: "renderJob"
      })], [[[io, io.persist, void 0, type.objectRef("TriView")], 16, "view"], [[io, io.persist, void 0, type.objectRef("EveCamera")], 16, "camera"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetViewCameraParent"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
    }
    constructor(...args) {
      super(...args);
      _init_extra_camera(this);
    }
    view = (_initProto(this), _init_view(this, null));
    camera = (_init_extra_view(this), _init_camera(this, null));
    __init__(view = null, camera = null) {
      this.SetViewCameraParent(view, camera);
    }
    SetViewCameraParent(view, camera) {
      this.view = view ?? null;
      this.camera = camera ?? null;
    }
    Execute(realTime, simTime, executor) {
      if (this.view) {
        executor?.SetViewTransform?.(_TriStepSetView.#getTransform(this.view), this.view);
      } else if (this.camera) {
        const viewport = executor?.GetViewport?.();
        const aspectRatio = viewport?.height ? viewport.width / viewport.height : 1;
        this.camera.Update?.(simTime, aspectRatio, realTime);
        const viewMatrix = this.camera.GetViewMatrix?.() ?? this.camera.viewMatrix ?? null;
        executor?.SetViewTransform?.(_TriStepSetView.#getTransform(viewMatrix), this.camera);
      }
      return _TriRenderJob.StepResult.RS_OK;
    }
  }];
  #getTransform(value) {
    return value?.GetTransform?.() ?? value?.transform ?? value ?? null;
  }
  constructor() {
    super(_TriStepSetView), _initClass();
  }
}();

export { _TriStepSetView as TriStepSetView };
//# sourceMappingURL=TriStepSetView.js.map
