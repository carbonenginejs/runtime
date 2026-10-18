// Source: blueexposure/include/BlueClass.h:177-199 (RootParentLock<T>)
// Disposition: not applicable; an embedded member is an ordinary object its owner holds.
// RootParentLock<T> is the "P" final class of a Blue object embedded by value
// in another: Lock/Unlock/GetRefCount (BlueClass.h:186-188) forward to the
// owning mLockObj (:198), GetFlags returns BLUERT_AUTOVAR (:189), FinalDelete
// does nothing (:190), and the assignment operator (:193-197) copies the
// RootQIImpl part while keeping the lock object, for BlueListC.
// JavaScript has no by-value embedding: the owner creates the member and holds
// a reference, and the garbage collector keeps it alive while the owner does.
// QueryInterface and GetRootObject come from IRoot (see RootQIImpl.js).
// No runtime registration or export.

/** Records the parent-delegated locking mixin for embedded members, inapplicable under garbage collection. */
export class RootParentLock {}
