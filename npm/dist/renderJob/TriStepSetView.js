import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderJob as _TriRenderJob } from './TriRenderJob.js';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_view, _init_extra_view, _init_camera, _init_extra_camera;

/**
 * Step that installs the view transform for the steps that follow, taken either
 * from an authored view or from a camera updated against the current viewport.
 */
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

    /** Stores the view and camera the step chooses between at execution time. */
    __init__(view = null, camera = null) {
      this.SetViewCameraParent(view, camera);
    }

    /**
     * Replaces both operands; either may be null, and the view takes precedence
     * when both are set.
     */
    SetViewCameraParent(view, camera) {
      this.view = view ?? null;
      this.camera = camera ?? null;
    }

    /**
     * Sets the view transform from the view when one is authored; otherwise
     * updates the camera using the executor viewport's aspect ratio (1 when the
     * viewport is missing or has no height) and sets the resulting view matrix.
     * The second argument to SetViewTransform identifies the source object the
     * executor should associate with the transform.
     */
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

    /**
     * Unwraps a transform from a GetTransform() accessor or a transform property,
     * falling back to the value itself when it already is the matrix.
     */
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
