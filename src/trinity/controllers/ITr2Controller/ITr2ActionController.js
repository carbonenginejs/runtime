// Source: trinity/trinity/Controllers/ITr2Controller.h
//
// The contract a controller answers to, and the reason 235 call sites in this
// runtime were written as `controller?.Update?.()`.
//
// WHAT WAS WRONG. Our schema already names this interface - EveStretch3 and its
// neighbours declare `@type.list("ITr2Controller") controllers = []` - but no
// class implemented it, so nothing guaranteed that a thing in one of those
// lists could be told to Update, Start or Stop. Every caller hedged instead,
// and a hedge cannot tell "this controller does not care about Update" from
// "this object is not a controller at all". Carbon never has that ambiguity,
// because the base answers the first case and the type system answers the
// second.
//
// THE KEY DETAIL, AND WHY THE HEDGES CAN SIMPLY GO. Only `IsLinked` is pure
// virtual. `Link`, `Unlink`, `Start`, `Stop`, `Update`, `SetVariable` and
// `HandleEvent` all have EMPTY BODIES in Carbon's header. The optional chain
// was emulating exactly that - a call that harmlessly does nothing when the
// controller has no opinion - one call site at a time. Inheriting the empty
// body gives the same behaviour in one place, and turns a genuinely absent
// method back into the error it should be.
//
// TWO INTERFACES, ONE HEADER, as Carbon has them. A plain controller answers
// the eight verbs below; `ITr2ActionController` adds what a controller driving
// controller ACTIONS must also provide, all of it pure virtual there and
// abstract here.
//
// `IRoot`, Carbon's base for both, is not ported: it is Blue's reference-counted
// object root, which a garbage-collected runtime has no use for.

import { CjsSchema } from "#schema";
import { ITr2Controller, Brand, ITR2_CONTROLLER, Adopt, CONTROLLER_NOOPS } from "./ITr2Controller.js";

const ITR2_ACTION_CONTROLLER = Symbol.for("carbonenginejs.contract.ITr2ActionController");

/** Contract for a controller that also drives controller actions. */
export class ITr2ActionController extends ITr2Controller
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITR2_ACTION_CONTROLLER] === true;
  }

  /**
   * The object this controller was linked to.
   *
   * @returns {object} The owner.
   */
  GetOwner()
  {
    throw new Error("ITr2ActionController.GetOwner must be implemented by an action controller.");
  }

  /**
   * Delivers a named callback to the controller.
   *
   * @param {string} _callbackName The callback's name.
   */
  Callback(_callbackName)
  {
    throw new Error("ITr2ActionController.Callback must be implemented by an action controller.");
  }

  /**
   * Registers an object to be updated whenever this controller updates.
   *
   * @param {object} _updateable The object to update.
   */
  RegisterUpdateable(_updateable)
  {
    throw new Error("ITr2ActionController.RegisterUpdateable must be implemented by an action controller.");
  }

  /**
   * Stops updating a previously registered object.
   *
   * @param {object} _updateable The object to stop updating.
   */
  UnRegisterUpdateable(_updateable)
  {
    throw new Error("ITr2ActionController.UnRegisterUpdateable must be implemented by an action controller.");
  }

  /**
   * The named root objects a dynamic binding path may start from.
   *
   * @returns {Array} Name and root pairs.
   */
  GetBindingPathRoots()
  {
    throw new Error("ITr2ActionController.GetBindingPathRoots must be implemented by an action controller.");
  }

  /**
   * One float variable by name.
   *
   * Carbon returns an optional, so a missing name is ABSENT rather than zero -
   * a distinction an expression needs, since zero is a legitimate value.
   *
   * @param {string} _name The variable's name.
   * @returns {number|null} Its value, or null when there is no such variable.
   */
  GetFloatVariableByName(_name)
  {
    throw new Error("ITr2ActionController.GetFloatVariableByName must be implemented by an action controller.");
  }

  /**
   * Adds the functions and variables this controller offers to expressions.
   *
   * @param {Array} _out Term info collected from every contributor.
   */
  GetExpressionTermInfo(_out)
  {
    throw new Error("ITr2ActionController.GetExpressionTermInfo must be implemented by an action controller.");
  }

  /**
   * The layout of this controller's variable buffer.
   *
   * @returns {Array} The variable view.
   */
  GetVariableView()
  {
    throw new Error("ITr2ActionController.GetVariableView must be implemented by an action controller.");
  }

  /**
   * The buffer the variable view describes.
   *
   * @returns {object} The variable buffer.
   */
  GetVariableBuffer()
  {
    throw new Error("ITr2ActionController.GetVariableBuffer must be implemented by an action controller.");
  }

  /**
   * Grows the scratch arena expressions evaluate into.
   *
   * @param {number} _size Bytes required.
   */
  EnsureTempArenaSize(_size)
  {
    throw new Error("ITr2ActionController.EnsureTempArenaSize must be implemented by an action controller.");
  }

  /**
   * The scratch arena expressions evaluate into.
   *
   * @returns {object} The arena.
   */
  GetTempArena()
  {
    throw new Error("ITr2ActionController.GetTempArena must be implemented by an action controller.");
  }
}

const ACTION_ABSTRACTS = [
  "GetOwner", "Callback", "RegisterUpdateable", "UnRegisterUpdateable", "GetBindingPathRoots",
  "GetFloatVariableByName", "GetExpressionTermInfo", "GetVariableView", "GetVariableBuffer",
  "EnsureTempArenaSize", "GetTempArena"
];

Brand(ITr2ActionController, ITR2_ACTION_CONTROLLER, [], ACTION_ABSTRACTS);

Object.defineProperty(ITr2ActionController.prototype, ITR2_CONTROLLER, { value: true });

CjsSchema.define(ITr2ActionController, { className: "ITr2ActionController" });

/**
 * Adds the ITr2ActionController contract, and ITr2Controller with it.
 *
 * @param {Function} Base The class to extend.
 * @returns {Function} A subclass carrying both contracts.
 */
export function withITr2ActionController(Base)
{
  const Controller = Adopt(
    Adopt(Base, ITr2Controller, [ ...CONTROLLER_NOOPS, "IsLinked" ]),
    ITr2ActionController,
    ACTION_ABSTRACTS
  );

  Brand(Controller, ITR2_CONTROLLER, CONTROLLER_NOOPS, [ "IsLinked" ]);
  Brand(Controller, ITR2_ACTION_CONTROLLER, [], ACTION_ABSTRACTS);

  return Controller;
}
