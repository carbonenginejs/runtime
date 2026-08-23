# Shared data class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime-sof` classes under `src/sof/shared/`
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for shared SOF values used across hull, faction, pattern, and race records.

<!-- class:CjsExternalRef -->
## `CjsExternalRef`

Represents a deferred external graph path together with the interface expected when that graph is resolved.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/CjsExternalRef.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:EveSOFDNADescriptor -->
## `EveSOFDNADescriptor`

Stores the hull, faction, race, pattern, and layout selections encoded by one parsed SOF DNA value.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDNADescriptor.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataArea -->
## `EveSOFDataArea`

Defines the canonical SOF area slots and provides enum-based lookup for them.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataArea.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:ErrSOFAreaTypeNotFound -->
## `ErrSOFAreaTypeNotFound`

Reports that a requested canonical area slot has no material assigned.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataArea.js`
- Visibility: Public
- Kind: Adapted ccpwgl error class

<!-- class:EveSOFDataAreaMaterial -->
## `EveSOFDataAreaMaterial`

Chooses a faction color and four material names for an area and supports assignment and override composition.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataAreaMaterial.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataBlink -->
## `EveSOFDataBlink`

Provides the empty Carbon-compatible base shape for blink settings.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataBlink.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataBlinkType -->
## `EveSOFDataBlinkType`

Defines an enum-indexed blink mode with optional blink, fade, cycle, and timing values.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataBlinkType.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataBooster -->
## `EveSOFDataBooster`

Combines normal and warp booster colors, scales, shapes, textures, and light settings.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataBooster.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataBoosterShape -->
## `EveSOFDataBoosterShape`

Combines the noise, frequency, speed, and color parameters that define a booster shape.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataBoosterShape.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataDecalIndexBuffer -->
## `EveSOFDataDecalIndexBuffer`

Stores an unsigned decal index buffer with helpers for appending indices and exposing its contents.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataDecalIndexBuffer.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataInstancedMesh -->
## `EveSOFDataInstancedMesh`

Defines instanced-mesh geometry, shader, display and LOD policy, textures, and instance transforms.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataInstancedMesh.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataLogo -->
## `EveSOFDataLogo`

Stores a logo texture set and supports assignment and composition with another logo value.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataLogo.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataLogoSet -->
## `EveSOFDataLogoSet`

Provides enum-based primary, secondary, tertiary, and marking-logo lookup plus logo-set composition.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataLogoSet.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:ErrSOFLogoSetTypeUnknown -->
## `ErrSOFLogoSetTypeUnknown`

Reports that a logo lookup used an undefined logo-slot enum value.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataLogoSet.js`
- Visibility: Public
- Kind: Adapted ccpwgl error class

<!-- class:ErrSOFLogoSetTypeNotFound -->
## `ErrSOFLogoSetTypeNotFound`

Reports that a defined logo slot has no logo assigned.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataLogoSet.js`
- Visibility: Public
- Kind: Adapted ccpwgl error class

<!-- class:EveSOFDataMaterial -->
## `EveSOFDataMaterial`

Stores named material parameters and assigns them to a target with an optional parameter prefix.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataMaterial.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSofDataMeshInstance -->
## `EveSofDataMeshInstance`

Represents the 44-byte SOF mesh-instance record containing rotation, scale, translation, and bone index.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSofDataMeshInstance.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataParameter -->
## `EveSOFDataParameter`

Stores a named vector parameter and supports assignment and composition.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataParameter.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataPointLightAttachment -->
## `EveSOFDataPointLightAttachment`

Defines point-light placement, rotation, intensity, saturation, scale, noise, and profile data for an attachment.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataPointLightAttachment.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataSpotLightAttachment -->
## `EveSOFDataSpotLightAttachment`

Defines spotlight placement, intensity, saturation, cone angles, scales, noise, and profile data for an attachment.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataSpotlightAttachment.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataTexture -->
## `EveSOFDataTexture`

Stores a named texture binding and supports assignment and composition.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataTexture.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataTransform -->
## `EveSOFDataTransform`

Stores a bone-relative scale, rotation, and translation and composes them into a transformation matrix.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFDataTransform.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFUtilsParameterName -->
## `EveSOFUtilsParameterName`

Parses a material parameter into its prefix, full and short names, and remapped lookup form.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/shared/EveSOFUtilsParameterName.js`
- Visibility: Public
- Kind: Adapted Carbon concept
