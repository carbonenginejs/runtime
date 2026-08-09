import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { ITr2ControllerAction } from './action/ITr2ControllerAction.js';

let _initProto, _initClass, _init_mask, _init_extra_mask;

/**
 * State finalizer that holds a state machine in its current state until the
 * animation layer named by `mask` has finished playing.
 */
let _Tr2SyncToAnimation;
class Tr2SyncToAnimation extends CjsModel {
  static {
    ({
      e: [_init_mask, _init_extra_mask, _initProto],
      c: [_Tr2SyncToAnimation, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2SyncToAnimation",
      family: "controllers"
    })], [[[io, io.persist, type, type.string], 16, "mask"], [[carbon, carbon.method, impl, impl.adapted], 18, "CanTransition"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_mask(this);
  }
  mask = (_initProto(this), _init_mask(this, ""));

  /**
   * Carbon allows transition once the matching animation layer has finished.
   */
  CanTransition(controller) {
    const owner = controller.GetOwner?.();
    const animationController = ITr2ControllerAction.getAnimationController(owner);
    if (!animationController) {
      return true;
    }
    const layer = ITr2ControllerAction.callTarget(animationController, "GetAnimationLayer", this.mask || null);
    if (!layer) {
      return true;
    }
    const remaining = Number(ITr2ControllerAction.callTarget(layer, "GetAnimationRemainingTime") ?? 0);
    return !Number.isFinite(remaining) || remaining <= 0;
  }
  static {
    _initClass();
  }
}

export { _Tr2SyncToAnimation as Tr2SyncToAnimation };
//# sourceMappingURL=Tr2SyncToAnimation.js.map
