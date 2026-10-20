/**
 * GLES character realization backend, imported separately from the CPU
 * character entry. It turns CPU construction intent into operations on
 * injected hosts; only the hosts know their Tw2/GR2/WebGL representation.
 *
 * - `CjsCharacterGlesAppearanceAL`: Prepare -> Commit/Handoff -> Release
 *   through injected resource, visual and configured-operation hosts.
 * - `CjsCharacterGlesFoundationTranslator`,
 *   `CjsCharacterGlesLegacyConstructionTranslator`: neutral intent to the
 *   retained GLES operation contract.
 * - `CjsCharacterGlesAtlasPlacement`, `CjsCharacterGlesAtlasPlanning`:
 *   validate placement and produce detached composition descriptors.
 * - `CjsCharacterGlesAtlasRenderer`: executes them through an atlas host
 *   (`CreateTarget`, `CreateEffect`, `PrepareEffect`, `RenderPass`,
 *   `FinalizeTarget`, `GetTexture`, `DestroyEffect`, `DestroyTarget`).
 * - `CjsCharacterGlesTriangleCoverage`, `CjsCharacterGlesMorphDeformation`,
 *   `CjsCharacterGlesPaletteCompatibility`: reversible index-coverage,
 *   vertex-morph and 58-bone palette leases over a geometry host
 *   (`GetMeshes`, `EnsureSystemMirror`, `UploadIndices`, `UploadVertices`,
 *   `GetVertexChannelDeclaration`, `RebuildMeshBounds`, `RebuildBounds`).
 */

export { CjsCharacterGlesAppearanceAL } from "./CjsCharacterGlesAppearanceAL.js";
export { CjsCharacterGlesAtlasPlacement } from "./CjsCharacterGlesAtlasPlacement.js";
export { CjsCharacterGlesAtlasPlanning } from "./CjsCharacterGlesAtlasPlanning.js";
export { CjsCharacterGlesAtlasRenderer } from "./CjsCharacterGlesAtlasRenderer.js";
export { CjsCharacterGlesFoundationTranslator } from "./CjsCharacterGlesFoundationTranslator.js";
export {
    CjsCharacterGlesLegacyConstructionTranslator
} from "./CjsCharacterGlesLegacyConstructionTranslator.js";
export {
    CjsCharacterGlesMorphDeformation,
    normalizeCjsCharacterGlesMorphTargetName
} from "./CjsCharacterGlesMorphDeformation.js";
export { CjsCharacterGlesPaletteCompatibility } from "./CjsCharacterGlesPaletteCompatibility.js";
export { CjsCharacterGlesTriangleCoverage } from "./CjsCharacterGlesTriangleCoverage.js";
