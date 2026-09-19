// Source: blueexposure/include/BlueRegistration.h (EnumRegistration<T>)
// Disposition: Blue owns native enum registration. Its ordered values and name
// helpers are absorbed by CjsBlueEnumRegistry.RegisterEnum/GetNameFromValue/
// GetNameFromBitmask. JavaScript has neither template instantiations nor a need
// for a function-pointer getter per enum. No runtime registration/export.
// Revive only if a consumer requires distinct per-native-type registration state.

/** Records the enum template registration responsibilities absorbed by CjsBlueEnumRegistry. */
export class EnumRegistration {}
