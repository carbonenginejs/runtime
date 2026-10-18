// Source: blueexposure/include/BlueClass.h:278-296 (SimpleFactory<T>)
// Disposition: not applicable as a class; its job is the class registry's default factory.
// SimpleFactory<T>::Create (BlueClass.h:283-295) is the factory every
// BLUE_REGISTER_CLASS registration passes (BlueRegistration.h:165,170): it
// news a T, queries riid into ppv and drops the construction lock. JavaScript
// needs no template per class to construct one: a registration without its own
// createFn gets `() => new type()` (src/global/blue/classes/registry.js), and
// CjsBlueClasses.CreateInstance returns that instance with no interface id to
// query and no lock to release.
// No runtime registration or export.

/** Records the per-class construction factory that the class registry's default createFn replaces. */
export class SimpleFactory {}
