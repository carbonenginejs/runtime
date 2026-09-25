/**
 * Space Object Factory: catalog models, DNA parsing and a deterministic
 * builder that interprets them on the CPU. The public output is the plain
 * model-values graph from `EveSOF.BuildValues*`; constructing typed objects
 * from it is the caller's choice.
 *
 * SOF imports no Trinity or audio classes and needs no class registry. Output
 * is sparse; `{ populateDefaults: true }` applies `CjsSchema` defaults from the
 * class families the caller has already imported. Every model in a values
 * fragment a resolver returns must carry `_type`. The `carbon.document` form is a deprecated
 * compatibility intermediate. A build is deterministic for a given catalog,
 * DNA and `buildTime`.
 */
export { EveSOF } from "./EveSOF.js";
export { EveSOFData } from "./EveSOFData.js";
export { EveSOFDNA } from "./EveSOFDNA.js";
export { EveSOFDataMgr } from "./EveSOFDataMgr.js";
export { CjsSofLibraryBuilder } from "./CjsSofLibraryBuilder.js";
export { createSofHydrationAdapter } from "./createSofHydrationAdapter.js";
export * from "./faction/index.js";
export * from "./generic/index.js";
export * from "./hull/index.js";
export * from "./layout/index.js";
export * from "./pattern/index.js";
export * from "./race/index.js";
export * from "./shared/index.js";
