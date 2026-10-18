// Source: blueexposure/include/BlueClass.h:167-175 (RootRefLockShutdown<T>)
// Disposition: not applicable; it extends RootRefLock, which is not applicable.
// Its one override, destroy (BlueClass.h:171-174), calls Shutdown before
// RootRefLock<T>::destroy. With no reference count reaching zero there is no
// destroy to hook (see RootRefLock.js). No class in the Carbon checkout names
// it directly; TYPEDEF_BLUECLASS_SHUTDOWN (:262-265) uses the weak-reference
// variant RootRefLockWRShutdown instead.
// No runtime registration or export.

/** Records the shutdown-before-destroy lifetime mixin, inapplicable without a reference count. */
export class RootRefLockShutdown {}
