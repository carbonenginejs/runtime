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


/** A value whose storage can be pointed elsewhere, notifying its bindings. */
export class ITriReroutable
{

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


CjsSchema.define(ITriReroutable, { className: "ITriReroutable" });
