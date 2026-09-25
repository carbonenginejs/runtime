/**
 * Character appearance-plan records: one standalone, GPU-free, serializable
 * `carbonenginejs.characterAppearancePlan` graph. The plan closes its own
 * `_id`/`_ref` identities (source-library IDs survive only as origin data)
 * and is mutated through its named `Create*`/`Add*`/`Remove*`/`Delete*`
 * methods. Records reference shared `CjsCharacterOrigin` provenance whose
 * `kind` is `authored`, `decoded`, `derived` or `policy`; missing evidence
 * becomes a diagnostic or an explicit `policy` origin, never a filename
 * inference.
 *
 * Placement and sampling stay separate values: a texture asset's decoded
 * placement (`imageSize`, `atlasSize`, `atlasRect`) never overwrites a
 * binding's `sampleBounds`, which follows the `TransformUV0` rectangle form
 * `[uMin, vMin, uMax, vMax]` with identity `[0, 0, 1, 1]`. Diffuse, normal,
 * specular and cut inputs keep independent placement and bounds.
 */

export * from "./CjsCharacterAppearanceBinding.js";
export * from "./CjsCharacterAppearanceColorSelection.js";
export * from "./CjsCharacterAppearanceDiagnostic.js";
export * from "./CjsCharacterAppearanceLayer.js";
export * from "./CjsCharacterAppearancePlan.js";
export * from "./CjsCharacterAppearanceSelection.js";
export * from "./CjsCharacterBindingAlpha.js";
export * from "./CjsCharacterCompositionInput.js";
export * from "./CjsCharacterCompositionPass.js";
export * from "./CjsCharacterCompositionTarget.js";
export * from "./CjsCharacterCoverage.js";
export * from "./CjsCharacterOrigin.js";
export * from "./CjsCharacterMorphTargetWeight.js";
export * from "./CjsCharacterResolvedPart.js";
export * from "./CjsCharacterTextureAsset.js";
export * from "./CjsCharacterTextureChannel.js";
