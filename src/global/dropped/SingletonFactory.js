// Source: blueexposure/include/BlueClass.h:298-307 (SingletonFactory<T>)
// Disposition: not applicable; no Carbon class registers with it.
// SingletonFactory<T>::Create (BlueClass.h:302-306) queries riid on one
// function-static T that is never destroyed. Nothing in the Carbon checkout
// passes it to a registration; the two singleton registrations use
// DynamicSingletonFactory instead (MotherLode_Blue.cpp:10,
// BluePython_Blue.cpp:39). With no user there is nothing to port.
// No runtime registration or export.

/** Records the unused static-singleton factory. */
export class SingletonFactory {}
