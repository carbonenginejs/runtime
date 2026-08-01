# Character class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime-character` named source classes
Audience: Users, maintainers, and automated readers
Summary: Provides reviewed one-sentence purposes for every named class in the character runtime package.

Generated from reviewed class-level JSDoc and explicit export metadata in
`scripts/class_catalog_metadata.js` by
`scripts/generate_class_catalog.js`.
Update source purposes and regenerate; do not edit catalog entries directly.

<!-- class:CjsCharacterDocumentLibrary -->
## `CjsCharacterDocumentLibrary`

Indexes schema-v3 source documents without hydrating legacy character models.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/library/CjsCharacterDocumentLibrary.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterLibraryBuilder -->
## `CjsCharacterLibraryBuilder`

Builds a deterministic character-library document from caller-supplied JSON.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/library-builder/CjsCharacterLibraryBuilder.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCharacterRigBinding -->
## `CjsCharacterRigBinding`

CPU-only mapping from animation-rig world transforms to a render-rig skinning palette.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/controls/CjsCharacterRigBinding.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ColorCurve -->
## `Tr2ColorCurve`

Historical Curve2 color layout used by Incarna Black assets.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/incarna/curves/Tr2ColorCurve.js`
- Visibility: Public
- Kind: Historical Incarna hydration class

<!-- class:Tr2ColorKey -->
## `Tr2ColorKey`

One key in a historical Incarna color curve.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/incarna/curves/Tr2ColorKey.js`
- Visibility: Public
- Kind: Historical Incarna hydration class

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

<!-- class:Tr2InteriorCell -->
## `Tr2InteriorCell`

Minimal persisted cell record used by historical Incarna interior scenes.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/incarna/interior/Tr2InteriorCell.js`
- Visibility: Public
- Kind: Historical Incarna hydration class

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

<!-- class:Tr2ScalarCurve -->
## `Tr2ScalarCurve`

Historical Curve2 scalar layout used by Incarna Black assets.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/incarna/curves/Tr2ScalarCurve.js`
- Visibility: Public
- Kind: Historical Incarna hydration class

<!-- class:Tr2ScalarKey -->
## `Tr2ScalarKey`

One key in a historical Incarna scalar curve.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/incarna/curves/Tr2ScalarKey.js`
- Visibility: Public
- Kind: Historical Incarna hydration class

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

Unexported current Carbon row-major scripting matrix pending an explicit conversion contract.

- Export: None
- Source: `src/trinity/trinityCore/TriMatrix.js`
- Visibility: Internal
- Kind: Unexported current Carbon class

<!-- class:WodBakingScene -->
## `WodBakingScene`

Baking-scene record pairing a skinned avatar with a diagnostic visualization mode.

- Export: `@carbonenginejs/runtime-character`
- Source: `src/trinity/wod/WodBakingScene.js`
- Visibility: Public
- Kind: Adapted Carbon class
