// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionPlayMeshAnimation.h
// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionPlayMeshAnimation.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { DestinationType, PlayAction, StopAction } from "./enums.js";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { Tr2BindingPoint } from "./Tr2BindingPoint.js";


/**
 * Controller action that plays or enqueues a named geometry animation on a
 * destination object's animation controller when it starts, and stops or
 * enqueues a stop when it ends.
 */
@type.define({
  className: "Tr2ActionPlayMeshAnimation",
  family: "controllers"
})
export class Tr2ActionPlayMeshAnimation extends CjsModel
{
  @io.notify
  @io.persist
  @type.int32
  @schema.enum("DestinationType")
  destinationType = DestinationType.OWNER;

  @io.persist
  @type.int32
  @schema.enum("PlayAction")
  playAction = PlayAction.ENQUEUE_PLAY;

  @io.persist
  @type.int32
  @schema.enum("StopAction")
  stopAction = StopAction.ENQUEUE_STOP;

  @io.persist
  @type.string
  mask = "";

  @io.persist
  @type.string
  animation = "";

  @io.persist
  @type.float32
  speed = 1;

  @io.persist
  @type.float32
  delay = 0;

  @io.notify
  @io.persist
  @type.objectRef("IRoot")
  destination = null;

  @io.notify
  @io.persist
  @type.boolean
  delayBinding = false;

  @io.persist
  @type.int32
  loops = -1;

  @io.notify
  @io.persist
  @type.string
  path = "";

  #controller = null;

  #resolvedDestination = null;

  /**
   * Links the destination when this action does not use delayed binding.
   */
  @carbon.method
  @impl.adapted
  Link(controller)
  {
    this.#controller = controller;
    if (!this.delayBinding)
    {
      this.LinkDestination(controller);
    }
  }

  /**
   * Clears the resolved destination.
   */
  @carbon.method
  @impl.implemented
  Unlink()
  {
    this.#resolvedDestination = null;
    this.#controller = null;
  }

  /**
   * Starts or queues a mesh animation.
   */
  @carbon.method
  @impl.adapted
  Start(controller = this.#controller)
  {
    const destination = this.GetDestination(controller);
    const animationController = ITr2ControllerAction.getAnimationController(destination);
    if (!animationController || !this.animation)
    {
      return;
    }
    const layerName = this.mask || null;
    if (this.mask && ITr2ControllerAction.hasFunction(animationController, "AddAnimationLayerWithTrackMask"))
    {
      animationController.AddAnimationLayerWithTrackMask(this.mask, this.mask);
    }
    if (ITr2ControllerAction.hasFunction(animationController, "PlayLayerAnimationByName"))
    {
      animationController.PlayLayerAnimationByName(layerName, this.animation, this.playAction === PlayAction.PLAY, Math.max(this.loops, 0), this.delay, this.speed, false);
      return;
    }
    const methodName = this.playAction === PlayAction.ENQUEUE_PLAY ? "EnqueueAnimation" : "PlayAnimation";
    if (ITr2ControllerAction.hasFunction(animationController, methodName))
    {
      animationController[methodName](this.animation, layerName, this.speed, this.delay, this.loops);
      return;
    }
    if (ITr2ControllerAction.hasFunction(animationController, "Play"))
    {
      animationController.Play(this.animation);
    }
  }

  /**
   * Stops or queues a stop for the mesh animation.
   */
  @carbon.method
  @impl.adapted
  Stop(controller = this.#controller)
  {
    if (this.stopAction === StopAction.NONE)
    {
      return;
    }
    const destination = this.GetDestination(controller);
    const animationController = ITr2ControllerAction.getAnimationController(destination);
    if (!animationController || !this.animation)
    {
      return;
    }
    const layerName = this.mask || null;
    if (ITr2ControllerAction.hasFunction(animationController, "GetAnimationLayer"))
    {
      const layer = animationController.GetAnimationLayer(layerName);
      if (!layer)
      {
        return;
      }
      if (this.stopAction === StopAction.STOP && ITr2ControllerAction.hasFunction(layer, "ClearAnimations"))
      {
        layer.ClearAnimations();
        return;
      }
      if (this.stopAction === StopAction.ENQUEUE_STOP && ITr2ControllerAction.hasFunction(layer, "EndAnimation"))
      {
        layer.EndAnimation();
        return;
      }
      return;
    }
    const methodName = this.stopAction === StopAction.ENQUEUE_STOP ? "EnqueueStopAnimation" : "StopAnimation";
    if (ITr2ControllerAction.hasFunction(animationController, methodName))
    {
      animationController[methodName](this.animation, layerName);
      return;
    }
    if (ITr2ControllerAction.hasFunction(animationController, "Stop"))
    {
      animationController.Stop(this.animation);
    }
  }

  /**
   * Relinks after authored destination changes.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    if (this.#controller && !this.delayBinding)
    {
      this.LinkDestination(this.#controller);
    }
    return true;
  }

  /** Resolves and caches the destination object, returning it. */
  LinkDestination(controller = this.#controller)
  {
    this.#resolvedDestination = this.ResolveDestination(controller);
    return this.#resolvedDestination;
  }

  /**
   * Gets the object whose animation controller is driven: the controller owner
   * for destinationType OWNER, otherwise the cached resolved destination,
   * re-resolved when it is missing or binding is delayed.
   */
  @carbon.method
  @impl.adapted
  GetDestination(controller = this.#controller)
  {
    if (this.destinationType === DestinationType.OWNER)
    {
      return ITr2ControllerAction.getOwner(controller);
    }
    if (!this.#resolvedDestination || this.delayBinding)
    {
      return this.LinkDestination(controller);
    }
    return this.#resolvedDestination;
  }

  /**
   * Checks whether a destination is reachable; destinationType OWNER is always
   * considered valid.
   */
  @carbon.method
  @impl.adapted
  IsBindingValid()
  {
    if (this.destinationType === DestinationType.OWNER)
    {
      return true;
    }
    return !!this.GetDestination();
  }

  /**
   * Alias for IsBindingValid, kept for callers using Carbon's destination
   * wording.
   */
  IsDestinationValid()
  {
    return this.IsBindingValid();
  }

  /**
   * Resolves the destination from the directly assigned object, otherwise by
   * walking the authored path against the controller's binding roots.
   */
  ResolveDestination(controller)
  {
    if (this.destination)
    {
      return this.destination;
    }
    if (this.path && controller)
    {
      return Tr2BindingPoint.ResolvePath(this.path, controller.GetBindingPathRoots?.() ?? []);
    }
    return null;
  }

  static DestinationType = DestinationType;

  static PlayAction = PlayAction;

  static StopAction = StopAction;

}
