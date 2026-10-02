// Source: trinity/trinity/Controllers/Finalizers/Tr2SyncToAnimation.h
// Source: trinity/trinity/Controllers/Finalizers/Tr2SyncToAnimation.cpp
// Source: trinity/trinity/Controllers/Finalizers/Tr2SyncToAnimation_Blue.cpp
import { carbon, impl, edit, type } from "#schema";
import { ITr2ControllerAction } from "./action/ITr2ControllerAction.js";
import { ITr2StateMachineStateFinalizer } from "./state/ITr2StateMachineStateFinalizer.js";


/**
 * State finalizer that holds a state machine in its current state until the
 * animation layer named by `mask` has finished playing.
 */
@type.define({
  className: "Tr2SyncToAnimation",
  family: "controllers"
})
@carbon.inherit(ITr2StateMachineStateFinalizer)
export class Tr2SyncToAnimation
{
  /**
   * Animation mask/layer whose completion permits leaving the state.
   * An empty string selects the animation controller's base layer.
   * @type {string}
   */
  @edit.readwrite
  @edit.persist
  @type.string
  mask = "";

  /**
   * Allows transition when the matching animation layer has no remaining time.
   * NaN and positive infinity do not satisfy Carbon's completion comparison.
   *
   * Adapted: Resolves the animation controller through the runtime owner adapter
   * instead of Carbon's EveSpaceObject2 cast.
   *
   * @param {Tr2Controller} controller Controller owning the animated object.
   * @returns {boolean} Whether the layer is absent or complete.
   */
  @carbon.method
  @impl.adapted
  CanTransition(controller)
  {
    const owner = controller.GetOwner();
    const animationController = ITr2ControllerAction.getAnimationController(owner);
    if (!animationController)
    {
      return true;
    }
    const layer = animationController.GetAnimationLayer(this.mask || null);
    if (!layer)
    {
      return true;
    }
    const remaining = layer.GetAnimationRemainingTime();
    return remaining <= 0;
  }
}

// Native exposure ends at this concrete table (Tr2SyncToAnimation_Blue.cpp).
carbon.interfaceTable({
  interfaces: [Tr2SyncToAnimation, ITr2StateMachineStateFinalizer],
  chainTo: null
})(Tr2SyncToAnimation);
