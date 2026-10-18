// Source: blueexposure/include/BlueClass.h:214-230 (RootNoLockNoQI<T>)
// Disposition: not applicable; no lifetime to manage, and no Carbon class uses it.
// RootNoLockNoQI<T> is RootNoLock without RootQIImpl: Lock/Unlock do nothing
// (BlueClass.h:218-219), GetFlags returns BLUERT_AUTOVAR (:220), GetRefCount
// returns 0 (:221), ClassType forwards T::ClassType() (:222-225) and
// QueryInterface always answers false (:226-229). Nothing in the Carbon
// checkout instantiates it. Lifetime is the garbage collector's (see
// RootNoLock.js); a class wanting no interfaces maps none, and IRoot's
// QueryInterface then answers null.
// No runtime registration or export.

/** Records the unused no-locking, no-interface mixin; inapplicable under garbage collection. */
export class RootNoLockNoQI {}
