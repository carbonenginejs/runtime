# Shared data class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime/sof` classes under `src/sof/shared/`
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for shared SOF values used across hull, faction, pattern, and race records.

<!-- class:CjsExternalRef -->
## `CjsExternalRef`

CarbonEngineJS-original external graph reference.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/CjsExternalRef.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ErrSOFAreaTypeNotFound -->
## `ErrSOFAreaTypeNotFound`

Reports that a requested canonical area slot has no material assigned.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/ErrSOFAreaTypeNotFound.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ErrSOFLogoSetTypeNotFound -->
## `ErrSOFLogoSetTypeNotFound`

Reports that a defined logo slot has no logo assigned.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/ErrSOFLogoSetTypeNotFound.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ErrSOFLogoSetTypeUnknown -->
## `ErrSOFLogoSetTypeUnknown`

Reports that a logo lookup used an undefined logo-slot enum value.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/ErrSOFLogoSetTypeUnknown.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSOFDataArea -->
## `EveSOFDataArea`

Carbon area-material slots in canonical AreaType order.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataArea.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataAreaMaterial -->
## `EveSOFDataAreaMaterial`

Chooses a faction color and four material names for an area and supports assignment and override composition.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataAreaMaterial.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataBlink -->
## `EveSOFDataBlink`

Provides the empty Carbon-compatible base shape for blink settings.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataBlink.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataBlinkType -->
## `EveSOFDataBlinkType`

Defines an enum-indexed blink mode with optional blink, fade, cycle, and timing values.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataBlinkType.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataBooster -->
## `EveSOFDataBooster`

Combines normal and warp booster colors, scales, shapes, textures, and light settings.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataBooster.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataBoosterShape -->
## `EveSOFDataBoosterShape`

Combines the noise, frequency, speed, and color parameters that define a booster shape.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataBoosterShape.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataDecalIndexBuffer -->
## `EveSOFDataDecalIndexBuffer`

Stores an unsigned decal index buffer with helpers for appending indices and exposing its contents.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataDecalIndexBuffer.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataInstancedMesh -->
## `EveSOFDataInstancedMesh`

Defines instanced-mesh geometry, shader, display and LOD policy, textures, and instance transforms.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataInstancedMesh.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataLogo -->
## `EveSOFDataLogo`

Stores a logo texture set and supports assignment and composition with another logo value.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataLogo.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataLogoSet -->
## `EveSOFDataLogoSet`

Provides enum-based primary, secondary, tertiary, and marking-logo lookup plus logo-set composition.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataLogoSet.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataMaterial -->
## `EveSOFDataMaterial`

Stores named material parameters and assigns them to a target with an optional parameter prefix.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataMaterial.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSofDataMeshInstance -->
## `EveSofDataMeshInstance`

Runtime representation of Carbon's 44-byte EveSofDataMeshInstance structure.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSofDataMeshInstance.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataParameter -->
## `EveSOFDataParameter`

Stores a named vector parameter and supports assignment and composition; the typed subclasses below flatten to a shader vec4 through `GetValue()`.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataParameter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataParameterBool -->
## `EveSOFDataParameterBool`

Boolean shader parameter: broadcasts 1/0 to all four components.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataParameterBool.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataParameterColor -->
## `EveSOFDataParameterColor`

Color shader parameter: passes the four components through unchanged.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataParameterColor.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataParameterFloat -->
## `EveSOFDataParameterFloat`

Float shader parameter: broadcasts the value to all four components.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataParameterFloat.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataParameterInt -->
## `EveSOFDataParameterInt`

Integer shader parameter: broadcasts the value to all four components.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataParameterInt.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataParameterVector2 -->
## `EveSOFDataParameterVector2`

Two-component shader parameter: zero-pads z and w.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataParameterVector2.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataParameterVector3 -->
## `EveSOFDataParameterVector3`

Three-component shader parameter: zero-pads w (0, not 1).

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataParameterVector3.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataPointLightAttachment -->
## `EveSOFDataPointLightAttachment`

Defines point-light placement, rotation, intensity, saturation, scale, noise, and profile data for an attachment.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataPointLightAttachment.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataSpotLightAttachment -->
## `EveSOFDataSpotLightAttachment`

Defines spotlight placement, intensity, saturation, cone angles, scales, noise, and profile data for an attachment.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataSpotLightAttachment.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataTexture -->
## `EveSOFDataTexture`

Stores a named texture binding and supports assignment and composition.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataTexture.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataTransform -->
## `EveSOFDataTransform`

Stores a bone-relative scale, rotation, and translation and composes them into a transformation matrix.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDataTransform.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDNADescriptor -->
## `EveSOFDNADescriptor`

Stores the hull, faction, race, pattern, and layout selections encoded by one parsed SOF DNA value.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFDNADescriptor.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFUtilsParameterName -->
## `EveSOFUtilsParameterName`

Parses and remaps Carbon SOF material parameter prefixes.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/shared/EveSOFUtilsParameterName.js`
- Visibility: Public
- Kind: Carbon
