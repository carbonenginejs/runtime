import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { DestinationType, PlayAction, StopAction } from '../enums.js';
import { ITr2ControllerAction } from './ITr2ControllerAction.js';
import { Tr2BindingPoint as _Tr2BindingPoint } from '../expression/Tr2BindingPoint.js';

let _initProto, _initClass, _init_destinationType, _init_extra_destinationType, _init_playAction, _init_extra_playAction, _init_stopAction, _init_extra_stopAction, _init_mask, _init_extra_mask, _init_animation, _init_extra_animation, _init_speed, _init_extra_speed, _init_delay, _init_extra_delay, _init_destination, _init_extra_destination, _init_delayBinding, _init_extra_delayBinding, _init_loops, _init_extra_loops, _init_path, _init_extra_path;

/**
 * Controller action that plays or enqueues a named geometry animation on a
 * destination object's animation controller when it starts, and stops or
 * enqueues a stop when it ends.
 */
let _Tr2ActionPlayMeshAni;
new class extends _identity {
  static [class Tr2ActionPlayMeshAnimation extends CjsModel {
    static {
      ({
        e: [_init_destinationType, _init_extra_destinationType, _init_playAction, _init_extra_playAction, _init_stopAction, _init_extra_stopAction, _init_mask, _init_extra_mask, _init_animation, _init_extra_animation, _init_speed, _init_extra_speed, _init_delay, _init_extra_delay, _init_destination, _init_extra_destination, _init_delayBinding, _init_extra_delayBinding, _init_loops, _init_extra_loops, _init_path, _init_extra_path, _initProto],
        c: [_Tr2ActionPlayMeshAni, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ActionPlayMeshAnimation",
        family: "controllers"
      })], [[[io, io.notify, io, io.persist, type, type.int32, void 0, schema.enum("DestinationType")], 16, "destinationType"], [[io, io.persist, type, type.int32, void 0, schema.enum("PlayAction")], 16, "playAction"], [[io, io.persist, type, type.int32, void 0, schema.enum("StopAction")], 16, "stopAction"], [[io, io.persist, type, type.string], 16, "mask"], [[io, io.persist, type, type.string], 16, "animation"], [[io, io.persist, type, type.float32], 16, "speed"], [[io, io.persist, type, type.float32], 16, "delay"], [[io, io.notify, io, io.persist, void 0, type.objectRef("IRoot")], 16, "destination"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "delayBinding"], [[io, io.persist, type, type.int32], 16, "loops"], [[io, io.notify, io, io.persist, type, type.string], 16, "path"], [[carbon, carbon.method, impl, impl.adapted], 18, "Link"], [[carbon, carbon.method, impl, impl.implemented], 18, "Unlink"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.adapted], 18, "Stop"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDestination"], [[carbon, carbon.method, impl, impl.adapted], 18, "IsBindingValid"]], 0, void 0, CjsModel));
    }
    destinationType = (_initProto(this), _init_destinationType(this, DestinationType.OWNER));
    playAction = (_init_extra_destinationType(this), _init_playAction(this, PlayAction.ENQUEUE_PLAY));
    stopAction = (_init_extra_playAction(this), _init_stopAction(this, StopAction.ENQUEUE_STOP));
    mask = (_init_extra_stopAction(this), _init_mask(this, ""));
    animation = (_init_extra_mask(this), _init_animation(this, ""));
    speed = (_init_extra_animation(this), _init_speed(this, 1));
    delay = (_init_extra_speed(this), _init_delay(this, 0));
    destination = (_init_extra_delay(this), _init_destination(this, null));
    delayBinding = (_init_extra_destination(this), _init_delayBinding(this, false));
    loops = (_init_extra_delayBinding(this), _init_loops(this, -1));
    path = (_init_extra_loops(this), _init_path(this, ""));
    #controller = (_init_extra_path(this), null);
    #resolvedDestination = null;

    /**
     * Links the destination when this action does not use delayed binding.
     */
    Link(controller) {
      this.#controller = controller;
      if (!this.delayBinding) {
        this.LinkDestination(controller);
      }
    }

    /**
     * Clears the resolved destination.
     */
    Unlink() {
      this.#resolvedDestination = null;
      this.#controller = null;
    }

    /**
     * Starts or queues a mesh animation.
     */
    Start(controller = this.#controller) {
      const destination = this.GetDestination(controller);
      const animationController = ITr2ControllerAction.getAnimationController(destination);
      if (!animationController || !this.animation) {
        return;
      }
      const layerName = this.mask || null;
      if (this.mask && ITr2ControllerAction.hasFunction(animationController, "AddAnimationLayerWithTrackMask")) {
        animationController.AddAnimationLayerWithTrackMask(this.mask, this.mask);
      }
      if (ITr2ControllerAction.hasFunction(animationController, "PlayLayerAnimationByName")) {
        animationController.PlayLayerAnimationByName(layerName, this.animation, this.playAction === PlayAction.PLAY, Math.max(this.loops, 0), this.delay, this.speed, false);
        return;
      }
      const methodName = this.playAction === PlayAction.ENQUEUE_PLAY ? "EnqueueAnimation" : "PlayAnimation";
      if (ITr2ControllerAction.hasFunction(animationController, methodName)) {
        animationController[methodName](this.animation, layerName, this.speed, this.delay, this.loops);
        return;
      }
      if (ITr2ControllerAction.hasFunction(animationController, "Play")) {
        animationController.Play(this.animation);
      }
    }

    /**
     * Stops or queues a stop for the mesh animation.
     */
    Stop(controller = this.#controller) {
      if (this.stopAction === StopAction.NONE) {
        return;
      }
      const destination = this.GetDestination(controller);
      const animationController = ITr2ControllerAction.getAnimationController(destination);
      if (!animationController || !this.animation) {
        return;
      }
      const layerName = this.mask || null;
      if (ITr2ControllerAction.hasFunction(animationController, "GetAnimationLayer")) {
        const layer = animationController.GetAnimationLayer(layerName);
        if (!layer) {
          return;
        }
        if (this.stopAction === StopAction.STOP && ITr2ControllerAction.hasFunction(layer, "ClearAnimations")) {
          layer.ClearAnimations();
          return;
        }
        if (this.stopAction === StopAction.ENQUEUE_STOP && ITr2ControllerAction.hasFunction(layer, "EndAnimation")) {
          layer.EndAnimation();
          return;
        }
        return;
      }
      const methodName = this.stopAction === StopAction.ENQUEUE_STOP ? "EnqueueStopAnimation" : "StopAnimation";
      if (ITr2ControllerAction.hasFunction(animationController, methodName)) {
        animationController[methodName](this.animation, layerName);
        return;
      }
      if (ITr2ControllerAction.hasFunction(animationController, "Stop")) {
        animationController.Stop(this.animation);
      }
    }

    /**
     * Relinks after authored destination changes.
     */
    OnModified(_options = {}) {
      if (this.#controller && !this.delayBinding) {
        this.LinkDestination(this.#controller);
      }
      return true;
    }

    /** Resolves and caches the destination object, returning it. */
    LinkDestination(controller = this.#controller) {
      this.#resolvedDestination = this.ResolveDestination(controller);
      return this.#resolvedDestination;
    }

    /**
     * Gets the object whose animation controller is driven: the controller owner
     * for destinationType OWNER, otherwise the cached resolved destination,
     * re-resolved when it is missing or binding is delayed.
     */
    GetDestination(controller = this.#controller) {
      if (this.destinationType === DestinationType.OWNER) {
        return ITr2ControllerAction.getOwner(controller);
      }
      if (!this.#resolvedDestination || this.delayBinding) {
        return this.LinkDestination(controller);
      }
      return this.#resolvedDestination;
    }

    /**
     * Checks whether a destination is reachable; destinationType OWNER is always
     * considered valid.
     */
    IsBindingValid() {
      if (this.destinationType === DestinationType.OWNER) {
        return true;
      }
      return !!this.GetDestination();
    }

    /**
     * Alias for IsBindingValid, kept for callers using Carbon's destination
     * wording.
     */
    IsDestinationValid() {
      return this.IsBindingValid();
    }

    /**
     * Resolves the destination from the directly assigned object, otherwise by
     * walking the authored path against the controller's binding roots.
     */
    ResolveDestination(controller) {
      if (this.destination) {
        return this.destination;
      }
      if (this.path && controller) {
        return _Tr2BindingPoint.ResolvePath(this.path, controller.GetBindingPathRoots?.() ?? []);
      }
      return null;
    }
  }];
  DestinationType = DestinationType;
  PlayAction = PlayAction;
  StopAction = StopAction;
  constructor() {
    super(_Tr2ActionPlayMeshAni), _initClass();
  }
}();

export { _Tr2ActionPlayMeshAni as Tr2ActionPlayMeshAnimation };
//# sourceMappingURL=Tr2ActionPlayMeshAnimation.js.map
