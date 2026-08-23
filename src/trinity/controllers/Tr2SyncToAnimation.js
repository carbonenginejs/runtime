// Source: trinity/trinity/Controllers/Finalizers/Tr2SyncToAnimation.h
// Source: trinity/trinity/Controllers/Finalizers/Tr2SyncToAnimation.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { ITr2ControllerAction } from "./action/ITr2ControllerAction.js";


/**
 * State finalizer that holds a state machine in its current state until the
 * animation layer named by `mask` has finished playing.
 */
@type.define({
  className: "Tr2SyncToAnimation",
  family: "controllers"
})
export class Tr2SyncToAnimation extends CjsModel
{
  @io.persist
  @type.string
  mask = "";

  /**
   * Carbon allows transition once the matching animation layer has finished.
   */
  @carbon.method
  @impl.adapted
  CanTransition(controller)
  {
    const owner = controller.GetOwner?.();
    const animationController = ITr2ControllerAction.getAnimationController(owner);
    if (!animationController)
    {
      return true;
    }
    const layer = ITr2ControllerAction.callTarget(animationController, "GetAnimationLayer", this.mask || null);
    if (!layer)
    {
      return true;
    }
    const remaining = Number(ITr2ControllerAction.callTarget(layer, "GetAnimationRemainingTime") ?? 0);
    return !Number.isFinite(remaining) || remaining <= 0;
  }
}
