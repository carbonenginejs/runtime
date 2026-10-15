// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlayMeshAnimation.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlayMeshAnimation.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlayMeshAnimation_Blue.cpp
import { IsMatch } from "#blue";
import { INotify } from "#blue/INotify";
import { meta, type, blue } from "#schema";
import { DestinationType, PlayAction, StopAction } from "../enums.js";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { Tr2BindingPoint } from "../expression/Tr2BindingPoint.js";


/**
 * Controller action that plays or enqueues a named geometry animation on a
 * destination object's animation controller when it starts, and stops or
 * enqueues a stop when it ends.
 */
@blue.define("Tr2ActionPlayMeshAnimation")
@blue.inherit(INotify)
@blue.interface(ITr2ControllerAction, INotify)
export class Tr2ActionPlayMeshAnimation extends ITr2ControllerAction
{
  /**
   * Name of the geometry animation to play or enqueue.
   * @type {string}
   */
  @meta.member("animation")
  @blue.readwrite
  @blue.persist
  @type.string
  animation = "";

  /**
   * Animation track-mask and layer name; empty selects the default layer.
   * @type {string}
   */
  @meta.member("mask")
  @blue.readwrite
  @blue.persist
  @type.string
  mask = "";

  /**
   * PlayAction enum selecting immediate or queued playback on Start.
   * @type {number}
   */
  @meta.member("playAction")
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.Tr2ActionPlayMeshAnimation.PlayAction")
  playAction = PlayAction.ENQUEUE_PLAY;

  /**
   * StopAction enum selecting immediate stop, queued stop, or no stop.
   * @type {number}
   */
  @meta.member("stopAction")
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.Tr2ActionPlayMeshAnimation.StopAction")
  stopAction = StopAction.ENQUEUE_STOP;

  /**
   * Signed loop count; native values at or below zero request infinite playback.
   * @type {number}
   */
  @meta.member("loops")
  @blue.readwrite
  @blue.persist
  @type.int32
  loops = -1;

  /**
   * Delay before animation playback, in seconds (native float).
   * @type {number}
   */
  @meta.member("delay")
  @blue.readwrite
  @blue.persist
  @type.float32
  delay = 0;

  /**
   * Animation playback speed multiplier (native float).
   * @type {number}
   */
  @meta.member("speed")
  @blue.readwrite
  @blue.persist
  @type.float32
  speed = 1;

  /**
   * DestinationType enum selecting the controller owner or a bound child.
   * @type {number}
   */
  @meta.member("destinationType")
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.Tr2ActionPlayMeshAnimation.DestinationType")
  destinationType = DestinationType.OWNER;

  /**
   * Child binding path used by the flattened JavaScript destination adapter.
   * @type {string}
   */
  @meta.member("path")
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.string
  path = "";

  /**
   * Explicit destination object in the JavaScript adapter for native embedded Tr2BindingPoint storage.
   * @type {IRoot|null}
   */
  @meta.member("destination")
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.rootRef("IRoot")
  destination = null;

  /**
   * Whether a nonempty destination path is resolved at action execution instead of Link.
   * @type {boolean}
   */
  @meta.member("delayBinding")
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.boolean
  delayBinding = false;

  /**
   * Live binding validity: OWNER is valid; CHILD requires a cached destination.
   * @returns {boolean} Whether the binding is valid without resolving it.
   */
  @blue.read
  @type.boolean
  @meta.implemented
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
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.adapted
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
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (this._controller && !this.HasDelayedBinding()
      && (IsMatch(propertyName, "destinationType") || IsMatch(propertyName, "path") || IsMatch(propertyName, "attribute")
        || IsMatch(propertyName, "destination") || IsMatch(propertyName, "delayBinding")))
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
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.adapted
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
  @meta.ours
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
  @meta.ours
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

  /**
   * Numeric OWNER/CHILD choices exposed for destination selection.
   * @type {Object<string, number>}
   */
  static DestinationType = DestinationType;

  /**
   * Numeric PLAY/ENQUEUE_PLAY choices exposed for playback selection.
   * @type {Object<string, number>}
   */
  static PlayAction = PlayAction;

  /**
   * Numeric STOP/ENQUEUE_STOP/NONE choices exposed for stopping behavior.
   * @type {Object<string, number>}
   */
  static StopAction = StopAction;

}

// Native exposure ends at this concrete table (Tr2ActionPlayMeshAnimation_Blue.cpp:33-35,80).
