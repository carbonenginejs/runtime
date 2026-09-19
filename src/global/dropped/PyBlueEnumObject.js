// Source: blueexposure/BlueRegistrationPython.cpp:24-235
// Exposed Carbon name: blue.BlueEnum.
// Disposition: Blue owns this Python exposure type. Its named read-only values
// and GetNameFromValue/GetNameFromBitmask survive in CjsBlueEnumRegistry.
// JavaScript needs no PyObject header, allocation or Python attribute callbacks.
// No runtime registration/export. Revive only for an actual Python C-API bridge.

/** Records the Python BlueEnum wrapper absorbed by CjsBlueEnumRegistry and plain enum objects. */
export class PyBlueEnumObject {}
