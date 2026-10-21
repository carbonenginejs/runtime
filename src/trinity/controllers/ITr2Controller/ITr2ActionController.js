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

import { CjsSchema, blue } from "#schema";
import { ITr2Controller } from "./ITr2Controller.js";

/** Contract for a controller that also drives controller actions. */
export class ITr2ActionController extends ITr2Controller
{

  /**
   * The object this controller was linked to.
   *
   * @returns {object} The owner.
   */
  @blue.abstract
  GetOwner() {}

  /**
   * Delivers a named callback to the controller.
   *
   * @param {string} _callbackName The callback's name.
   */
  @blue.abstract
  Callback(_callbackName) {}

  /**
   * Registers an object to be updated whenever this controller updates.
   *
   * @param {object} _updateable The object to update.
   */
  @blue.abstract
  RegisterUpdateable(_updateable) {}

  /**
   * Stops updating a previously registered object.
   *
   * @param {object} _updateable The object to stop updating.
   */
  @blue.abstract
  UnRegisterUpdateable(_updateable) {}

  /**
   * The named root objects a dynamic binding path may start from.
   *
   * @returns {Array} Name and root pairs.
   */
  @blue.abstract
  GetBindingPathRoots() {}

  /**
   * One float variable by name.
   *
   * Carbon returns an optional, so a missing name is ABSENT rather than zero -
   * a distinction an expression needs, since zero is a legitimate value.
   *
   * @param {string} _name The variable's name.
   * @returns {number|null} Its value, or null when there is no such variable.
   */
  @blue.abstract
  GetFloatVariableByName(_name) {}

  /**
   * Adds the functions and variables this controller offers to expressions.
   *
   * @param {Array} _out Term info collected from every contributor.
   */
  @blue.abstract
  GetExpressionTermInfo(_out) {}

  /**
   * The layout of this controller's variable buffer.
   *
   * @returns {Array} The variable view.
   */
  @blue.abstract
  GetVariableView() {}

  /**
   * The buffer the variable view describes.
   *
   * @returns {object} The variable buffer.
   */
  @blue.abstract
  GetVariableBuffer() {}

  /**
   * Grows the scratch arena expressions evaluate into.
   *
   * @param {number} _size Bytes required.
   */
  @blue.abstract
  EnsureTempArenaSize(_size) {}

  /**
   * The scratch arena expressions evaluate into.
   *
   * @returns {object} The arena.
   */
  @blue.abstract
  GetTempArena() {}
}



CjsSchema.exposure.interface("ITr2ActionController")(ITr2ActionController);
