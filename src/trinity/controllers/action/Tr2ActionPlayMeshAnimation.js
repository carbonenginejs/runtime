// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlayMeshAnimation.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlayMeshAnimation.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlayMeshAnimation_Blue.cpp
import { INotify } from "#blue/INotify";
import { meta, types } from "#schema";
import { DestinationType, PlayAction, StopAction } from "../enums.js";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { Tr2BindingPoint } from "../expression/Tr2BindingPoint.js";


/**
 * Controller action that plays or enqueues a named geometry animation on a
 * destination object's animation controller when it starts, and stops or
 * enqueues a stop when it ends.
 */
@meta.define({
  className: "Tr2ActionPlayMeshAnimation",
  family: "controllers"
})
@meta.carbon.inherit(INotify)
export class Tr2ActionPlayMeshAnimation extends ITr2ControllerAction
{
  @meta.member("animation")
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  animation = "";

  @meta.member("mask")
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  mask = "";

  @meta.member("playAction")
  @meta.edit.readwrite
  @meta.edit.persist
  @types.int32
  @types.enum("trinity.Tr2ActionPlayMeshAnimation.PlayAction")
  playAction = PlayAction.ENQUEUE_PLAY;

  @meta.member("stopAction")
  @meta.edit.readwrite
  @meta.edit.persist
  @types.int32
  @types.enum("trinity.Tr2ActionPlayMeshAnimation.StopAction")
  stopAction = StopAction.ENQUEUE_STOP;

  @meta.member("loops")
  @meta.edit.readwrite
  @meta.edit.persist
  @types.int32
  loops = -1;

  @meta.member("delay")
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  delay = 0;

  @meta.member("speed")
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  speed = 1;

  @meta.member("destinationType")
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.int32
  @types.enum("trinity.Tr2ActionPlayMeshAnimation.DestinationType")
  destinationType = DestinationType.OWNER;

  @meta.member("path")
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  path = "";

  @meta.member("destination")
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.objectRef("IRoot")
  destination = null;

  @meta.member("delayBinding")
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  delayBinding = false;

  /** Live native READ property observing the cached destination without resolving. */
  @meta.property()
  @meta.edit.read
  @types.boolean
  @meta.impl.implemented
  get isBindingValid()
  {
    return this.destinationType === DestinationType.OWNER || this._resolvedDestination !== null;
  }

  _controller = null;

  _resolvedDestination = null;

  /**
   * Links the destination when this action does not use delayed binding.
   * Adapted: preserves the flattened JavaScript destination/cache adapter
   * instead of Carbon's embedded Tr2BindingPoint.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Link(controller)
  {
    this._controller = controller;
    if (!this.HasDelayedBinding())
    {
      this.LinkDestination(controller);
    }
  }

  /**
   * Clears the resolved destination.
   */
  @meta.carbon.method
  @meta.impl.implemented
  Unlink()
  {
    this._resolvedDestination = null;
    this._controller = null;
  }

  /**
   * Starts or queues a mesh animation.
   * Adapted: preserves structural owner/controller lookup and legacy animation
   * dispatch alternatives. ITr2GrannyAnimationOwner and the native controller's
   * AddAnimationLayerWithTrackMask are not implemented by the shared JS domain.
   * Native Start only rebinds delayed destinations; this adapter retains lazy
   * resolution and optional linked-controller invocation.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Start(controller = this._controller)
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
   * Adapted: retains structural animation lookup, legacy stop alternatives,
   * lazy destination resolution and optional linked-controller invocation.
   * Native Stop observes the already-bound child and does not rebind it. A
   * returned animation layer supplies its required ClearAnimations/EndAnimation.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Stop(controller = this._controller)
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
      if (this.stopAction === StopAction.STOP)
      {
        layer.ClearAnimations();
        return;
      }
      if (this.stopAction === StopAction.ENQUEUE_STOP)
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
   * Adapted: identifies native stored-member notifications by exposed names
   * and preserves the existing flattened destination/cache adapter.
   */
  @meta.carbon.method
  @meta.impl.adapted
  OnModified(propertyName)
  {
    if (this._controller && !this.HasDelayedBinding()
      && (propertyName === "destinationType" || propertyName === "path" || propertyName === "attribute"
        || propertyName === "destination" || propertyName === "delayBinding"))
    {
      this.LinkDestination(this._controller);
    }
    return true;
  }

  /**
   * Resolves and caches the destination object, returning it.
   * Adapted: stores the JavaScript resolved object instead of the native embedded
   * binding. OWNER also retains this adapter's resolution rather than unlinking.
   */
  @meta.carbon.method
  @meta.impl.adapted
  LinkDestination(controller = this._controller)
  {
    this._resolvedDestination = this.ResolveDestination(controller);
    return this._resolvedDestination;
  }

  /**
   * Gets the object whose animation controller is driven: the controller owner
   * for destinationType OWNER, otherwise the cached resolved destination,
   * re-resolved when it is missing or binding is delayed.
   * Adapted: preserves lazy resolution and explicit controller selection; native
   * GetDestination only observes its linked controller or cached child.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetDestination(controller = this._controller)
  {
    if (this.destinationType === DestinationType.OWNER)
    {
      return ITr2ControllerAction.getOwner(controller);
    }
    if (!this._resolvedDestination || this.HasDelayedBinding())
    {
      return this.LinkDestination(controller);
    }
    return this._resolvedDestination;
  }

  /** Reports whether a nonempty binding path defers destination resolution. */
  @meta.carbon.method
  @meta.impl.implemented
  HasDelayedBinding()
  {
    return this.delayBinding && this.path.length !== 0;
  }

  /**
   * Checks whether a destination is reachable; destinationType OWNER is always
   * considered valid.
   * Adapted: the legacy method may resolve the child; the native READ property
   * above observes only the cached destination and never triggers binding.
   */
  @meta.carbon.method
  @meta.impl.adapted
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
   * Custom: retained JavaScript alias; Carbon names this query IsBindingValid.
   */
  @meta.impl.custom
  IsDestinationValid()
  {
    return this.IsBindingValid();
  }

  /**
   * Resolves the destination from the directly assigned object, otherwise by
   * walking the authored path against the controller's binding roots.
   * Custom: retained JavaScript resolver extracted from the native embedded
   * binding. Direct destination precedence over path is an existing adaptation;
   * a supplied controller must implement its GetBindingPathRoots operation.
   */
  @meta.impl.custom
  ResolveDestination(controller)
  {
    if (this.destination)
    {
      return this.destination;
    }
    if (this.path && controller)
    {
      return Tr2BindingPoint.ResolvePath(this.path, controller.GetBindingPathRoots());
    }
    return null;
  }

  static DestinationType = DestinationType;

  static PlayAction = PlayAction;

  static StopAction = StopAction;

}

// Native exposure ends at this concrete table (Tr2ActionPlayMeshAnimation_Blue.cpp:33-35,80).
meta.carbon.interfaceTable({
  interfaces: [Tr2ActionPlayMeshAnimation, ITr2ControllerAction, INotify],
  chainTo: null
})(Tr2ActionPlayMeshAnimation);
