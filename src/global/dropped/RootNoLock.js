// Source: blueexposure/include/BlueClass.h:202-212 (RootNoLock<T>)
// Disposition: not applicable; JavaScript's garbage collector owns object lifetime.
// RootNoLock<T> is the "C" final class for statics: Lock/Unlock do nothing
// (BlueClass.h:207-208), GetFlags returns BLUERT_AUTOVAR (:209), GetRefCount
// returns 0 (:210) and FinalDelete does nothing (:211). A JavaScript object
// held by a module needs no lock to stay alive, so there is nothing to opt out
// of. QueryInterface and GetRootObject come from IRoot (see RootQIImpl.js).
// No runtime registration or export.

/** Records the no-locking mixin for static Blue objects, inapplicable under garbage collection. */
export class RootNoLock {}
