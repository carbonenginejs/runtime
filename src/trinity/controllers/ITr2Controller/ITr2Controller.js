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

import { CjsSchema, impl } from "#schema";
import { UnlinkReason } from "../enums.js";

export const ITR2_CONTROLLER = Symbol.for("carbonenginejs.contract.ITr2Controller");

/** Contract for an object that controls another between Start and Stop. */
export class ITr2Controller
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITR2_CONTROLLER] === true;
  }

  /**
   * Attaches this controller to its owner.
   *
   * The owner guarantees Link runs before any other method on the controller,
   * which is why the rest may assume an owner without checking for one.
   *
   * @param {object} _owner The object being controlled.
   */
  Link(_owner)
  {
  }

  /**
   * Detaches this controller, dropping every reference to the owner.
   *
   * @param {number} [_reason] An `UnlinkReason`; DELETING means the owner is going away.
   */
  Unlink(_reason = UnlinkReason.UNLINKING)
  {
  }

  /**
   * Whether this controller is attached to an owner.
   *
   * THE ONE METHOD CARBON MAKES PURE VIRTUAL. There is no sensible default:
   * answering false would let an owner silently skip a linked controller, and
   * answering true would let it drive an unlinked one.
   *
   * @returns {boolean} Whether Link has run without a matching Unlink.
   */
  IsLinked()
  {
    throw new Error("ITr2Controller.IsLinked must be implemented by a controller.");
  }

  /** Begins controlling the owner. */
  Start()
  {
  }

  /** Stops controlling the owner. */
  Stop()
  {
  }

  /**
   * Runs one frame's control, between Start and Stop.
   *
   * @param {number} _normalizedUpdateFrequency Carbon's normalised frame delta.
   */
  Update(_normalizedUpdateFrequency)
  {
  }

  /**
   * Sets one named controller variable.
   *
   * @param {string} _name The variable's name.
   * @param {number} _value Its new value.
   */
  SetVariable(_name, _value)
  {
  }

  /**
   * Handles one instantaneous named event.
   *
   * @param {string} _eventName The event's name.
   */
  HandleEvent(_eventName)
  {
  }
}

export const CONTROLLER_NOOPS = [ "Link", "Unlink", "Start", "Stop", "Update", "SetVariable", "HandleEvent" ];

/**
 * Marks a class as carrying a contract, and records each method's provenance.
 *
 * Shared by every ported Carbon interface in this folder - `ITr2Controller`,
 * `ITr2ControllerAction`, `ITr2StateMachineStateFinalizer` - so the brand and
 * the noop/abstract bookkeeping are written once.
 *
 * @param {Function} target The contract or adopted class.
 * @param {symbol} symbol The contract's brand symbol.
 * @param {string[]} noops Methods Carbon gives an empty body.
 * @param {string[]} abstracts Methods Carbon makes pure virtual.
 */
export function Brand(target, symbol, noops, abstracts)
{
  Object.defineProperty(target.prototype, symbol, { value: true });

  for (const name of noops) CjsSchema.decorateMethod(target, name, impl.noop);
  for (const name of abstracts) CjsSchema.decorateMethod(target, name, impl.abstract);
}

Brand(ITr2Controller, ITR2_CONTROLLER, CONTROLLER_NOOPS, [ "IsLinked" ]);

CjsSchema.define(ITr2Controller, { className: "ITr2Controller" });

/**
 * Adds the ITr2Controller contract without replacing an existing model base.
 *
 * A controller class already extends something - CjsModel, EveThrottleable -
 * so the contract arrives as a mixin rather than as a root. The subclass
 * overrides what it cares about and inherits Carbon's empty body for the rest,
 * which is the whole point: the caller no longer has to ask.
 *
 * @param {Function} Base The class to extend.
 * @returns {Function} A subclass carrying the contract.
 */
export function withITr2Controller(Base)
{
  const Controller = Adopt(Base, ITr2Controller, [ ...CONTROLLER_NOOPS, "IsLinked" ]);

  Brand(Controller, ITR2_CONTROLLER, CONTROLLER_NOOPS, [ "IsLinked" ]);

  return Controller;
}

/**
 * Subclasses `Base`, filling in only the contract methods it does not already
 * have.
 *
 * A CLASS THAT IMPLEMENTS A METHOD KEEPS ITS OWN. That is the whole point of
 * the empty bodies: the contract supplies a default where the implementor has
 * no opinion, and stays out of the way where it does.
 *
 * @param {Function} Base The class to extend.
 * @param {Function} Contract The contract whose methods fill the gaps.
 * @param {string[]} names The contract's method names.
 * @returns {Function} The subclass.
 */
export function Adopt(Base, Contract, names)
{
  const Adopted = class extends Base
  {
  };

  for (const name of names)
  {
    if (name in Adopted.prototype) continue;

    Object.defineProperty(Adopted.prototype, name, {
      value: Contract.prototype[name],
      writable: true,
      configurable: true
    });
  }

  return Adopted;
}
