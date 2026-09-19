// Source: blueexposure/include/BlueRegistration.h:270-305
// Disposition: Blue owns enum exposure registration. Its static-constructor
// registration is absorbed by CjsBlueEnumRegistry.RegisterEnum, called in a JS
// module body. No runtime registration/export or replacement constructor.
// Revive only if a consumer needs a native registrar object's separate lifetime.

/** Records the static enum registrar absorbed by CjsBlueEnumRegistry.RegisterEnum. */
export class EnumTypeRegistration {}
