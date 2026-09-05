// Source: trinity/trinity/Controllers/Actions/ITr2ControllerAction.h
//
// The contract a controller ACTION answers to - the other half of the pair
// whose controller side is ITr2Controller.js. Carbon gives every lifecycle
// verb here an EMPTY BODY: an action that does not care about Link, Unlink,
// Start, Stop or RebaseSimTime inherits a harmless nothing, and only
// CanTransition has an opinionated default (true). Before this contract was
// ported, 10 of our 18 concrete actions lacked Stop, 10 lacked Unlink and 8
// lacked Link, so every owner of an `actions` list hedged each call with
// `action.Stop?.()` - emulating the empty body one call site at a time.
//
// The statics below predate the contract: they are shared JavaScript adapters
// the concrete actions use to duck-type their OWNERS (which have no common
// contract yet). They are unrelated to the instance surface.

import { CjsSchema, impl } from "#schema";
import { Adopt, Brand } from "../ITr2Controller.js";


const ITR2_CONTROLLER_ACTION = Symbol.for("carbonenginejs.contract.ITr2ControllerAction");

const ACTION_NOOPS = [ "Link", "Unlink", "Start", "Stop", "RebaseSimTime" ];
const ACTION_DEFAULTS = [ "CanTransition" ];


/** Contract for an action a controller drives between Start and Stop. */
export class ITr2ControllerAction
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITR2_CONTROLLER_ACTION] === true;
  }

  /**
   * Attaches this action to the controller that will drive it.
   *
   * @param {object} _controller The driving action controller.
   */
  Link(_controller)
  {
  }

  /** Detaches this action, dropping every reference to the controller. */
  Unlink()
  {
  }

  /**
   * Begins the action.
   *
   * @param {object} _controller The driving action controller.
   */
  Start(_controller)
  {
  }

  /**
   * Stops the action.
   *
   * @param {object} _controller The driving action controller.
   */
  Stop(_controller)
  {
  }

  /**
   * Shifts any absolute sim-clock times this action holds.
   *
   * @param {number} _diff Seconds added to the sim clock.
   */
  RebaseSimTime(_diff)
  {
  }

  /**
   * Whether the owning state may transition away while this action runs.
   *
   * THE ONE METHOD CARBON GIVES A CONCRETE DEFAULT: an action does not hold
   * its state hostage unless it says so.
   *
   * @returns {boolean} True unless the action needs to finish first.
   */
  CanTransition()
  {
    return true;
  }

  /**
   * Resolves the object an action operates on, preferring an explicitly supplied
   * owner over the controller's own owner.
   */
  static getOwner(controller, owner = null)
  {
    return owner ?? controller?.GetOwner() ?? null;
  }

  /**
   * Throws a TypeError naming the calling method when an action is invoked
   * without a controller.
   */
  static requireController(controller, methodName)
  {
    if (!controller)
    {
      throw new TypeError(`${methodName} expects a Tr2Controller as a parameter.`);
    }
    return controller;
  }

  /**
   * Gets the controller's current frame time in seconds, preferring the JS-only
   * CjsGetCurrentFrameTime hook and falling back to GetTime, then to the
   * supplied fallback.
   */
  static getTime(controller, fallback = 0)
  {
    if (controller?.CjsGetCurrentFrameTime)
    {
      return this.toNumber(controller.CjsGetCurrentFrameTime(), fallback);
    }
    return this.toNumber(controller?.GetTime?.(), fallback);
  }

  /**
   * Calls a method on a duck-typed target if it exists, returning undefined
   * rather than throwing when the target does not implement it.
   */
  static callTarget(target, methodName, ...args)
  {
    return this.hasFunction(target, methodName) ? target[methodName](...args) : undefined;
  }

  /**
   * Converts a value to a finite number, substituting the fallback for NaN and
   * infinities.
   */
  static toNumber(value, fallback = 0)
  {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  /**
   * Checks whether a value is an object carrying the named key, including
   * inherited keys.
   */
  static hasProperty(value, key)
  {
    return !!value && typeof value === "object" && key in value;
  }

  /** Checks whether a value is an object whose named key is callable. */
  static hasFunction(value, key)
  {
    return this.hasProperty(value, key) && typeof value[key] === "function";
  }

  /**
   * Narrows a value to an object reference, returning null for primitives and
   * nullish values.
   */
  static asObject(value)
  {
    return value && typeof value === "object" ? value : null;
  }

  /**
   * Reads a property from a duck-typed target, returning undefined when the
   * target is not an object or lacks the key.
   */
  static getProperty(target, propertyName)
  {
    return this.hasProperty(target, propertyName) ? target[propertyName] : undefined;
  }

  /**
   * Resolves the object held by an owner's named parameter, accepting
   * GetParameterObject, parameterObject or object as the payload accessor.
   */
  static getParameterOwner(owner, name)
  {
    const parameter = this.callTarget(owner, "GetParameterByName", name);
    if (!parameter)
    {
      return null;
    }
    return this.asObject(this.callTarget(parameter, "GetParameterObject") ?? this.getProperty(parameter, "parameterObject") ?? this.getProperty(parameter, "object"));
  }

  /**
   * Finds a named sound emitter on the owner, or null when the owner exposes no
   * emitter lookup.
   */
  static findSoundEmitter(owner, name)
  {
    return this.callTarget(owner, "FindSoundEmitter", name) ?? null;
  }

  /**
   * Resolves an owner's animation controller from either the
   * GetAnimationController method or the animationController property.
   */
  static getAnimationController(owner)
  {
    return this.callTarget(owner, "GetAnimationController") ?? this.getProperty(owner, "animationController") ?? null;
  }
}


Brand(ITr2ControllerAction, ITR2_CONTROLLER_ACTION, ACTION_NOOPS, []);
for (const name of ACTION_DEFAULTS) CjsSchema.decorateMethod(ITr2ControllerAction, name, impl.implemented);
CjsSchema.define(ITr2ControllerAction, { className: "ITr2ControllerAction" });


/**
 * Adds the ITr2ControllerAction contract without replacing an existing model
 * base.
 *
 * Every concrete action extends CjsModel, so the contract arrives as a mixin:
 * the action overrides the verbs it cares about and inherits Carbon's empty
 * body for the rest, and the owner of an `actions` list no longer has to ask.
 *
 * @param {Function} Base The class to extend.
 * @returns {Function} A subclass carrying the contract.
 */
export function withITr2ControllerAction(Base)
{
  const Action = Adopt(Base, ITr2ControllerAction, [ ...ACTION_NOOPS, ...ACTION_DEFAULTS ]);

  Brand(Action, ITR2_CONTROLLER_ACTION, ACTION_NOOPS, []);
  for (const name of ACTION_DEFAULTS) CjsSchema.decorateMethod(Action, name, impl.implemented);

  return Action;
}
