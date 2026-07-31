# Character class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime-character` named source classes
Audience: Users, maintainers, and automated readers
Summary: Provides reviewed one-sentence purposes for every named class in the character runtime package.

Generated from reviewed class-level JSDoc and explicit export metadata in
`scripts/class_catalog_metadata.js` by
`scripts/generate_class_catalog.js`.
Update source purposes and regenerate; do not edit catalog entries directly.

<!-- class:CjsCharacterBlendshapeLimits -->
## `CjsCharacterBlendshapeLimits`

Per-head minimum and maximum values for named blendshape controls.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/deformation/CjsCharacterBlendshapeLimits.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterBonePose -->
## `CjsCharacterBonePose`

Authored transform values for one named character bone.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/deformation/CjsCharacterBonePose.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterCapabilityCoverage -->
## `CjsCharacterCapabilityCoverage`

One independently evidenced complete, partial, none, or unknown capability axis.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/parts/CjsCharacterCapabilityCoverage.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterCapabilityRequirement -->
## `CjsCharacterCapabilityRequirement`

Exact named rig and morph controls required by one character feature.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/parts/CjsCharacterCapabilityRequirement.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterControlApplicator -->
## `CjsCharacterControlApplicator`

Pure deterministic composer for authored, expression, viseme, and similar controls.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/controls/CjsCharacterControlApplicator.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterControlBinding -->
## `CjsCharacterControlBinding`

Stateful full-snapshot binding from neutral character controls to a structural sink.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/controls/CjsCharacterControlBinding.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterControlLayer -->
## `CjsCharacterControlLayer`

One backend-neutral live-control layer, such as expression or viseme input.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/controls/CjsCharacterControlLayer.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterControlState -->
## `CjsCharacterControlState`

Detached composed snapshot of live controls over a character graph.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/controls/CjsCharacterControlState.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterDependency -->
## `CjsCharacterDependency`

Inert resource dependency; loading belongs to an outer adapter.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/library/CjsCharacterDependency.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterFaceAnimationProfile -->
## `CjsCharacterFaceAnimationProfile`

Female and male face-animation settings for one ancestry.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/face/CjsCharacterFaceAnimationProfile.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterFaceAnimationSetting -->
## `CjsCharacterFaceAnimationSetting`

Authored face-animation multipliers for one ancestry and sex.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/face/CjsCharacterFaceAnimationSetting.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterFaceControls -->
## `CjsCharacterFaceControls`

Lossless authored face-control tuples, separated by sex.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/face/CjsCharacterFaceControls.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterFaceSetup -->
## `CjsCharacterFaceSetup`

Authored bind poses, animation values, controls, and shader tuning for faces.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/face/CjsCharacterFaceSetup.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterFaceTweakSettings -->
## `CjsCharacterFaceTweakSettings`

Global wrinkle and correction-map tuning used by facial controls.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/face/CjsCharacterFaceTweakSettings.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterGraph -->
## `CjsCharacterGraph`

Complete GPU-free and I/O-free character composition graph.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/library/CjsCharacterGraph.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterGStateParameterSink -->
## `CjsCharacterGStateParameterSink`

Structural character-control sink for persisted GState parameter records.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/controls/CjsCharacterGStateParameterSink.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterLibrary -->
## `CjsCharacterLibrary`

Hydrates library data and owns transient catalog indexes.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/library/CjsCharacterLibrary.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterLibraryData -->
## `CjsCharacterLibraryData`

Deterministic serialized root produced once from character source records.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/library/CjsCharacterLibraryData.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterLibrarySource -->
## `CjsCharacterLibrarySource`

Metadata for one path in the containing library's sourceRefs table.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/library/CjsCharacterLibrarySource.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterLodBundle -->
## `CjsCharacterLodBundle`

One atomic character configuration and geometry selection.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/parts/CjsCharacterLodBundle.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterLodCapability -->
## `CjsCharacterLodCapability`

Capability evidence tied to one selected atomic character LOD target.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/parts/CjsCharacterLodCapability.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterLodController -->
## `CjsCharacterLodController`

Outer projected-size driver for the verified whole-model Trinity LOD owner.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/parts/CjsCharacterLodController.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterMaterial -->
## `CjsCharacterMaterial`

Character material descriptor for a slot, including colors, pattern controls, parameters, and resource paths.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/parts/CjsCharacterMaterial.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterMeshCapability -->
## `CjsCharacterMeshCapability`

Per-mesh evidence that keeps declared and actively referenced palettes distinct.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/parts/CjsCharacterMeshCapability.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterModifierNames -->
## `CjsCharacterModifierNames`

Sex-specific authored modifier-name inventories.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/face/CjsCharacterModifierNames.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterModifierNameSet -->
## `CjsCharacterModifierNameSet`

Ordered authored modifier-name inventories for one sex.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/face/CjsCharacterModifierNameSet.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterMorphTargetSink -->
## `CjsCharacterMorphTargetSink`

Structural morph-control sink that restores each target's captured authored weights.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/controls/CjsCharacterMorphTargetSink.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterNode -->
## `CjsCharacterNode`

Base for schema-backed, GPU-free character graph records.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/CjsCharacterNode.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterPartAuthoring -->
## `CjsCharacterPartAuthoring`

Non-runtime DCC/exporter metadata retained with a paperdoll part source.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/parts/CjsCharacterPartAuthoring.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterPartDefinition -->
## `CjsCharacterPartDefinition`

One selectable paperdoll part in the built character library.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/parts/CjsCharacterPartDefinition.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterPartMetadata -->
## `CjsCharacterPartMetadata`

Composition rules normalized from paperdoll part metadata.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/parts/CjsCharacterPartMetadata.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterPose -->
## `CjsCharacterPose`

Named character pose composed of authored per-bone transform values.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/deformation/CjsCharacterPose.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterPresentation -->
## `CjsCharacterPresentation`

Authored portrait and character-presentation profiles grouped by purpose.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/library/CjsCharacterPresentation.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterProjection -->
## `CjsCharacterProjection`

Authored texture projection for a character, including texture and mask paths, head/body targeting, layer, mirroring, and spatial parameters.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/deformation/CjsCharacterProjection.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterRecipe -->
## `CjsCharacterRecipe`

Named, sex-scoped character composition preset made from authored recipe entries.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/recipes/CjsCharacterRecipe.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterRecipeEntry -->
## `CjsCharacterRecipeEntry`

One category/path/weight selection in a character recipe.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/recipes/CjsCharacterRecipeEntry.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterRecipeLink -->
## `CjsCharacterRecipeLink`

One prepared, index-aligned interpretation of an authored recipe entry.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/recipes/CjsCharacterRecipeLink.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterRecipeLinkSet -->
## `CjsCharacterRecipeLinkSet`

Prepared links for one recipe, aligned by authored entry index.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/recipes/CjsCharacterRecipeLinkSet.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterRecipeResolution -->
## `CjsCharacterRecipeResolution`

Prepared runtime result that never hides ambiguous or unresolved recipe entries.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/recipes/CjsCharacterRecipeResolution.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterResolutionIssue -->
## `CjsCharacterResolutionIssue`

One explicit diagnostic produced while resolving an authored recipe.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/recipes/CjsCharacterResolutionIssue.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterResolvedPart -->
## `CjsCharacterResolvedPart`

One explicit library selection prepared for a backend-neutral character graph.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/parts/CjsCharacterResolvedPart.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterResolvedRule -->
## `CjsCharacterResolvedRule`

One metadata-only composition node activated by an authored recipe entry.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/recipes/CjsCharacterResolvedRule.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterResourceSet -->
## `CjsCharacterResourceSet`

Configuration and texture resources owned by a non-paperdoll character profile.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/parts/CjsCharacterResourceSet.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterRigBinding -->
## `CjsCharacterRigBinding`

CPU-only mapping from animation-rig world transforms to a render-rig skinning palette.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/controls/CjsCharacterRigBinding.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterSculptField -->
## `CjsCharacterSculptField`

Triangle field mapping a two-dimensional control surface to morph weights.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/deformation/CjsCharacterSculptField.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterSculptTriangle -->
## `CjsCharacterSculptTriangle`

Three vertex indexes forming one sculpting-field triangle.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/deformation/CjsCharacterSculptTriangle.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterSculptVertex -->
## `CjsCharacterSculptVertex`

One normalized vertex in a character sculpting control field.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/deformation/CjsCharacterSculptVertex.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterUniqueCharacter -->
## `CjsCharacterUniqueCharacter`

Authored defaults and owned resources for one unique character-select model.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/library/CjsCharacterUniqueCharacter.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterViseme -->
## `CjsCharacterViseme`

One exact authored speech control and its optional skeletal animation source.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/face/CjsCharacterViseme.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterVisemeFrame -->
## `CjsCharacterVisemeFrame`

One timed snapshot of independent authored viseme weights.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/face/CjsCharacterVisemeFrame.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterVisemeSet -->
## `CjsCharacterVisemeSet`

Ordered, data-driven speech controls for one authored character state graph.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/face/CjsCharacterVisemeSet.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterVisemeTimeline -->
## `CjsCharacterVisemeTimeline`

Backend-neutral timed viseme weights for speech or captured facial input.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/face/CjsCharacterVisemeTimeline.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GStateAnimation -->
## `Tr2GStateAnimation`

Character GState animation record for an external state-machine adapter.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/trinityCore/Tr2GStateAnimation.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2GStateParameter -->
## `Tr2GStateParameter`

Named, node-scoped scalar value for a character GState animation.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/trinityCore/Tr2GStateParameter.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2InteriorLightSet -->
## `Tr2InteriorLightSet`

Transient collection of active interior light sources and packed records.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/interior/Tr2InteriorLightSet.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2InteriorLightSource -->
## `Tr2InteriorLightSource`

Authored interior light definition with position, color, falloff, cone, and animation settings.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/interior/Tr2InteriorLightSource.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2InteriorPerLightPSData -->
## `Tr2InteriorPerLightPSData`

Per-light interior pixel-stage data holding light, mirror, shadow, bounds, and auxiliary parameters.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/interior/Tr2InteriorPerLightPSData.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2InteriorPerObjectLightData -->
## `Tr2InteriorPerObjectLightData`

Packed per-object interior light record for shader-facing data.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/interior/Tr2InteriorPerObjectLightData.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2InteriorPerObjectPSData -->
## `Tr2InteriorPerObjectPSData`

Per-object interior pixel-stage data holding fixed-capacity light and shadow inputs.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/interior/Tr2InteriorPerObjectPSData.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2InteriorPerObjectVSData -->
## `Tr2InteriorPerObjectVSData`

Per-object interior vertex-stage data containing world and UV transforms.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/interior/Tr2InteriorPerObjectVSData.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2InteriorPlaceable -->
## `Tr2InteriorPlaceable`

Authored state record for an interior placeable.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/interior/Tr2InteriorPlaceable.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2InteriorScene -->
## `Tr2InteriorScene`

Interior-scene state record for authored dynamics, lights, environment, fog, sun, shadows, and diagnostics.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/interior/Tr2InteriorScene.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2IntKeyGenerator -->
## `Tr2IntKeyGenerator`

Stable-sort policy for interior render batches.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/interior/Tr2IntKeyGenerator.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2IntSkinnedObject -->
## `Tr2IntSkinnedObject`

Interior skinned-object specialization carrying bounds, depth, and variable-store metadata.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/interior/Tr2IntSkinnedObject.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2Model -->
## `Tr2Model`

Named character model record grouping its Trinity mesh objects.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/trinityCore/Tr2Model.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2PerObjectParticleVSData -->
## `Tr2PerObjectParticleVSData`

Per-object particle vertex-stage data containing world and inverse-view matrices.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/interior/Tr2PerObjectParticleVSData.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2SkinnedModel -->
## `Tr2SkinnedModel`

Skinned character model selecting a named skeleton from supplied geometry and coordinating mesh-to-rig bindings.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/trinityCore/Tr2SkinnedModel.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2SkinnedObject -->
## `Tr2SkinnedObject`

Skinned character object managing whole-model LOD selection and an immediate CPU skinning palette.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/trinityCore/Tr2SkinnedObject.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:Tr2SkinnedObjectLod -->
## `Tr2SkinnedObjectLod`

Native helper owned by Tr2SkinnedObject.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/trinityCore/Tr2SkinnedObjectLod.js`
- Visibility: Public
- Kind: Adapted Carbon class

<!-- class:TriMatrix -->
## `TriMatrix`

Internal dropped shell for Carbon's row-major scripting matrix, retained pending an explicit conversion and serialization contract.

- Export: None
- Source: `src/dropped/TriMatrix.js`
- Visibility: Internal
- Kind: Dropped Carbon schema class

<!-- class:WodBakingScene -->
## `WodBakingScene`

Baking-scene record pairing a skinned avatar with a diagnostic visualization mode.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/wod/WodBakingScene.js`
- Visibility: Public
- Kind: Adapted Carbon class
