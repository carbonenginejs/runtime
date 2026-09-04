// Source: trinity/trinity/Controllers/ITr2ControllerOwner.h
//
// THIS FILE WAS `export {};` UNTIL 2026-09-05, and that is worth recording. It
// existed, it was re-exported from the barrel, and it was listed in
// `src/trinity/generated/summary.json` - so every file-level inventory reported
// this interface as ported while it declared nothing at all. Four other
// interface files are still in that state; see the register in
// `/docs/research/optional-call-hedges-2026-09-05.md`. A file existing is not
// evidence that a header was ported.
//
// The cost was 50 call sites that hedged the METHOD as well as the receiver,
// against a contract that had been named but never written.
//
// EVERY METHOD HERE HAS A DEFAULT BODY IN CARBON. Not one is pure virtual,
// which makes this a drop-in: an owner that does not care about controllers
// inherits six harmless defaults, and a caller can simply call.
//
// TWO SIGNATURES ARE ADAPTED, both following adaptations this runtime already
// made in the concrete classes:
//
// - `GetControllerValueByName` is `bool( const char*, float& )` in Carbon. The
//   bool-plus-out-param pair collapses to value-or-null, as
//   `EveChildContainer.js` already does, so the default returns null where
//   Carbon returns false.
// - `GetBindingRoots` defaults to `variables["Owner"] = GetRootObject()`.
//   `GetRootObject` is Blue's reference-counted object root, which a
//   garbage-collected runtime does not have, so the default is `out.Owner =
//   this` - the same thing once the indirection is gone.

import { CjsSchema, impl } from "#schema";


const ITR2_CONTROLLER_OWNER = Symbol.for("carbonenginejs.contract.ITr2ControllerOwner");


/** Contract for an object that owns controllers and answers their variables. */
export class ITr2ControllerOwner
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITR2_CONTROLLER_OWNER] === true;
  }

  /**
   * Sets one named controller variable on every controller this object owns.
   *
   * @param {string} _name The variable's name.
   * @param {number} _value Its new value.
   */
  SetControllerVariable(_name, _value)
  {
  }

  /**
   * Reads one named controller variable.
   *
   * @param {string} _name The variable's name.
   * @returns {number|null} Its value, or null when no controller exposes it.
   */
  GetControllerValueByName(_name)
  {
    return null;
  }

  /**
   * Delivers one named controller event.
   *
   * @param {string} _name The event's name.
   */
  HandleControllerEvent(_name)
  {
  }

  /** Starts every controller this object owns. */
  StartControllers()
  {
  }

  /**
   * Names the roots a dynamic binding path may start from.
   *
   * Carbon's default contributes the owner itself, and so does this one: an
   * object with no other roots to offer is still a binding root.
   *
   * @param {object} [out] Caller-owned map, mutated in place.
   * @returns {object} The same map.
   */
  GetBindingRoots(out = {})
  {
    out.Owner = this;

    return out;
  }

  /**
   * Adopts a controller, however it arrived - SOF, a resource, or code.
   *
   * @param {object} _controller An `ITr2Controller`.
   */
  AddController(_controller)
  {
  }
}


const OWNER_METHODS = [
  "SetControllerVariable", "GetControllerValueByName", "HandleControllerEvent",
  "StartControllers", "GetBindingRoots", "AddController"
];

Object.defineProperty(ITr2ControllerOwner.prototype, ITR2_CONTROLLER_OWNER, { value: true });

for (const name of OWNER_METHODS) CjsSchema.decorateMethod(ITr2ControllerOwner, name, impl.noop);

CjsSchema.define(ITr2ControllerOwner, { className: "ITr2ControllerOwner" });


/**
 * Adds the ITr2ControllerOwner contract without replacing an existing base.
 *
 * Fills in only what the class does not already implement, so an owner that has
 * real controllers keeps its own behaviour and one that has none stops needing
 * to be asked whether it can be told.
 *
 * @param {Function} Base The class to extend.
 * @returns {Function} A subclass carrying the contract.
 */
export function withITr2ControllerOwner(Base)
{
  const Owner = class extends Base
  {
  };

  for (const name of OWNER_METHODS)
  {
    if (name in Owner.prototype) continue;

    Object.defineProperty(Owner.prototype, name, {
      value: ITr2ControllerOwner.prototype[name],
      writable: true,
      configurable: true
    });
  }

  Object.defineProperty(Owner.prototype, ITR2_CONTROLLER_OWNER, { value: true });

  for (const name of OWNER_METHODS) CjsSchema.decorateMethod(Owner, name, impl.noop);

  return Owner;
}
