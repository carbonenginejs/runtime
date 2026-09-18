// Source: trinity/trinity/ITriReroutable.h:8-16
//
// A value whose storage can be MOVED somewhere else, and which tells its
// bindings when that happens. Five pure methods, no defaults.
//
// Carbon casts to it - `ITriReroutablePtr rp( BlueCastPtr( currvalue ) )` at
// Tr2Effect.cpp:910, and again in TriValueBinding.cpp:415 - so the symbol here
// is a BlueCastPtr port rather than capability discovery. Five donor classes
// map it, and they are exactly the five that implement it here:
// Tr2FloatParameter, Tr2Matrix4Parameter and Tr2Vector2/3/4Parameter.
//
// `GetDestination` is the one adaptation. Carbon returns through two out
// parameters, `void*& dest` and `size_t& size`, which JavaScript has no way to
// express; ours returns `{ dest, size }`, and every implementation here already
// did so before the interface existed.

import { CjsSchema } from "#schema";
import { Adopt, DefineInterface } from "../controllers/ITr2Controller/index.js";


const ITRI_REROUTABLE = Symbol.for("carbonenginejs.interface.ITriReroutable");

// All five are pure in the donor.
const REROUTABLE_ABSTRACTS = [
  "SetDestination", "GetDestination", "RegisterBinding", "UnregisterBinding", "IsRerouted"
];


/** A value whose storage can be pointed elsewhere, notifying its bindings. */
export class ITriReroutable
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITRI_REROUTABLE] === true;
  }

  /** Points this value's storage at `dest`, or back at its own with null. */
  SetDestination(_dest, _size)
  {
    throw new Error("ITriReroutable.SetDestination must be implemented.");
  }

  /**
   * Where this value currently stores itself.
   *
   * @returns {{dest: *, size: number}} Carbon's two out parameters, as a record.
   */
  GetDestination()
  {
    throw new Error("ITriReroutable.GetDestination must be implemented.");
  }

  /** Adds a binding to be told when the destination moves. */
  RegisterBinding(_binding)
  {
    throw new Error("ITriReroutable.RegisterBinding must be implemented.");
  }

  /** Removes one. Unknown bindings are ignored. */
  UnregisterBinding(_binding)
  {
    throw new Error("ITriReroutable.UnregisterBinding must be implemented.");
  }

  /** Whether the storage currently points somewhere other than its own. */
  IsRerouted()
  {
    throw new Error("ITriReroutable.IsRerouted must be implemented.");
  }
}


DefineInterface(ITriReroutable, ITRI_REROUTABLE, [], REROUTABLE_ABSTRACTS);
CjsSchema.define(ITriReroutable, { className: "ITriReroutable" });


/**
 * Adds the ITriReroutable interface without replacing an existing base.
 *
 * @param {Function} Base The class to extend.
 * @returns {Function} A subclass carrying it.
 */
export function withITriReroutable(Base)
{
  const Reroutable = Adopt(Base, ITriReroutable, REROUTABLE_ABSTRACTS);

  DefineInterface(Reroutable, ITRI_REROUTABLE, [], REROUTABLE_ABSTRACTS);

  return Reroutable;
}
