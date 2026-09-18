// Ports of Carbon's blueexposure layer: facilities Blue provides to every
// subsystem rather than to one.
//
// NO DECORATOR SYNTAX IN THIS FOLDER. package.json maps BOTH `#blue` and the
// public `./blue` export to this file in `src`, not to the build, so
// `@carbonenginejs/runtime/blue` is raw source - and the tests that import it
// that way cannot parse an `@`. A decorator here fails as
// `SyntaxError: Invalid or unexpected token` in a test that looks unrelated.
// Use `CjsSchema.define` and `CjsSchema.decorateMethod` at the foot of the
// file, as every class here does. This is a packaging constraint, not a
// preference, and it does not contradict the decorator direction in
// /docs/internal/decisions/cjsmodel-composition-decorators.md.

export * from "./CjsScriptCallback.js";
export * from "./IBlueDynamicResourceConstructor.js";
export * from "./BeInfo.js";
export * from "./IBlueEvents.js";
export * from "./IVariableTicker.js";
export * from "./ICatchupTicks.js";
export * from "./ISimTimeRebaseNotify.js";
export * from "./IBlueOS.js";
export * from "./CjsBlueOS.js";
export * from "./CcpDateTime.js";
export * from "./CcpTime.js";
export * from "./IBlueResMan.js";
export * from "./IBlueResManNotifications.js";
export * from "./IInitialize.js";
export * from "./IListNotify.js";
export * from "./INotify.js";
export * from "./CjsBluePaths.js";
export * from "./IBluePaths.js";
export * from "./blue.js";
