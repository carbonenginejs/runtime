// Source: blueexposure/include/BlueClass.h:69-164 (RootRefLock<T>)
// Disposition: not applicable; JavaScript's garbage collector owns object lifetime.
// RootRefLock<T> is the intrusive reference count of a heap-owned ("O") Blue
// object: Lock/Unlock (BlueClass.h:85-99) count mLockCount (:163) and call
// destroy at zero; destroy (:147-155) defers through BlueAddPendingDelete when
// BlueClassAllowDelayedDelete<T> (:57-60) says so, else FinalDelete (:157-161)
// runs the destructor and frees the block that operator new/delete
// (:133-144) took from BlueInternalCreate/BlueInternalFreeObject.
// InstIncrement/LockIncrement (:110-131) feed BeClasses->UpdateObjectCount.
// A JavaScript object is freed when unreachable, so there is no count to keep
// and nothing to destroy. IRoot's own JSDoc records that native reference
// counting and deletion are not implemented (src/global/blue/IRoot.js); the
// resource cache's Lock/Unlock is a separate protocol, not this one.
// IBlueClasses.UpdateObjectCount stays an inert interface method.
// No runtime registration or export.

/** Records the reference-counted lifetime mixin that JavaScript's garbage collector replaces. */
export class RootRefLock {}
