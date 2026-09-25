/**
 * Runtime character: source documents and CPU appearance planning.
 *
 * Flow: decoded records -> `CjsCharacterLibraryBuilder` -> schema-v10
 * `CjsCharacterLibrary` -> `CjsCharacterAppearanceResolver` -> standalone
 * `CjsCharacterAppearancePlan` -> `CjsCharacterAppearanceConstruction` ->
 * injected appearance AL -> resource preparation, composition and scene
 * realization.
 *
 * This entry is the CPU side only. It does not import or re-export the
 * backends (`character/gles`, `character/webgl2`), which are separate
 * subpaths. Plans carry logical texture roles, placement/sampling,
 * coverage, ordered passes and diagnostics, but no canvas, device, decoded
 * bytes, cache lease, live resource or renderer callback. `CjsCharacter`,
 * `CjsCharacterAppearanceConstruction` and `CjsCharacterAppearanceManager`
 * serialize construction revisions; the injected AL owns `Prepare`,
 * `Commit` and `Release` and the coordinator never inspects GPU state.
 * Resource access and native factories are injected; nothing falls back to
 * Node or local files. Only `library-builder/` imports the resource
 * formats, and the builder never discovers installations or manages caches.
 */

export { CjsCharacterLibraryBuilder } from "./library-builder/CjsCharacterLibraryBuilder.js";
export { CjsCharacterLibrary } from "./library/CjsCharacterLibrary.js";
export { CjsCharacterLibraryDocuments } from "./library/CjsCharacterLibraryDocuments.js";
export { CjsCharacterLibraryManager } from "./library/CjsCharacterLibraryManager.js";
export { CjsCharacter } from "./CjsCharacter.js";
export { CjsCharacterAppearanceConstruction } from "./CjsCharacterAppearanceConstruction.js";
export { CjsCharacterAppearanceManager } from "./CjsCharacterAppearanceManager.js";
export { CjsCharacterDiagnostics } from "./CjsCharacterDiagnostics.js";
export {
    CjsCharacterFoundationConstruction,
    ResolveFemaleFoundationLayout,
    ResolveFoundationGeometry,
    ResolveSelectedBrowSupport,
    ResolveSelectedFoundationSkin
} from "./CjsCharacterFoundationConstruction.js";
export { CjsCharacterFoundationCoveragePolicy } from "./CjsCharacterFoundationCoveragePolicy.js";
export { CjsCharacterTextureContributions } from "./CjsCharacterTextureContributions.js";
export { CjsCharacterTexturePolicy } from "./CjsCharacterTexturePolicy.js";
export { CjsCharacterTextureQuality } from "./CjsCharacterTextureQuality.js";
export * from "./model/index.js";
export { CjsCharacterRigBinding } from "./controls/CjsCharacterRigBinding.js";
export * from "./generated/index.js";
export * from "./incarna/index.js";

// Verified Trinity classes for the character/interior domain, owned by this
// layer after consolidation from the former package boundary.
export * from "./trinity/index.js";
