# Hull data class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime/sof` classes under `src/sof/hull/`
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for hull records, attachment-set records, locators, controllers, and their interface.

<!-- class:EveSOFDataHull -->
## `EveSOFDataHull`

Top-level SOF hull model that records build and impact policy, geometry and bounds, animation paths, mesh areas, and the hull's collections of attachments, locators, lights, decals, banners, children, and emitters.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHull.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullAnimation -->
## `EveSOFDataHullAnimation`

Identifies a hull animation and records its rotation, translation, timing, and rate endpoints.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullAnimation.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullArea -->
## `EveSOFDataHullArea`

Binds a hull index range and area type to shader, material-blocking, texture, and parameter data, with helpers that flatten the texture and parameter records.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullArea.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullBanner -->
## `EveSOFDataHullBanner`

Defines a banner's usage, bone-relative transform, visibility, optional light override, aspect ratio, and flat or curved presentation.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullBanner.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullBannerLight -->
## `EveSOFDataHullBannerLight`

Stores the brightness, radius, noise, saturation, and octave tuning for a banner light.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullBannerLight.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullBannerSet -->
## `EveSOFDataHullBannerSet`

Groups banner items under a named visibility identity.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullBannerSet.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullBannerSetItem -->
## `EveSOFDataHullBannerSetItem`

Places one banner by usage, bone, and transform, with optional point-light, aspect-scale, and curvature settings.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullBannerSetItem.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullBooster -->
## `EveSOFDataHullBooster`

Groups booster placements and records whether boosters and their trails remain active.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullBooster.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullBoosterItem -->
## `EveSOFDataHullBoosterItem`

Defines a booster transform, functionality, trail, atlas, and light scale.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullBoosterItem.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullChild -->
## `EveSOFDataHullChild`

Places a RED child resource with build and LOD policy, transform, identifier, and group metadata, deriving its display name from the resource path.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullChild.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullChildSet -->
## `EveSOFDataHullChildSet`

Groups child-resource placements under a named visibility identity.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullChildSet.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullChildSetItem -->
## `EveSOFDataHullChildSetItem`

Places a RED child resource with build and LOD policy plus scale, rotation, and translation, deriving its name from the resource path.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullChildSetItem.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullController -->
## `EveSOFDataHullController`

Names a controller resource path and its build filter, deriving the controller name from the path.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullController.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullDecalSet -->
## `EveSOFDataHullDecalSet`

Groups named decal items and their visibility policy.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullDecalSet.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullDecalSetItem -->
## `EveSOFDataHullDecalSetItem`

Defines a logo or usage decal with faction color, bone and transform placement, mesh and material data, and single- or multi-hull index buffers.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullDecalSetItem.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullHazeSet -->
## `EveSOFDataHullHazeSet`

Groups named haze items with spherical-type, visibility, and skinning policy.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullHazeSet.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullHazeSetItem -->
## `EveSOFDataHullHazeSetItem`

Defines a faction-aware haze item with bone-relative transform, brightness, falloff, saturation, booster influence, and point-light data.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullHazeSetItem.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullLightSet -->
## `EveSOFDataHullLightSet`

Groups named hull light items and their visibility policy.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullLightSet.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullLightSetItem -->
## `EveSOFDataHullLightSetItem`

Provides the common faction, flag, bone, position, radius, brightness, and noise fields shared by point, textured-point, and spot lights.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullLightSetItem.js`
- Visibility: Public
- Kind: Adapted Carbon base model

<!-- class:EveSOFDataHullLightSetSpotLight -->
## `EveSOFDataHullLightSetSpotLight`

Extends a hull light item with rotation and inner and outer cone angles for spot-light emission.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullLightSetSpotLight.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullLightSetTexturedPointLight -->
## `EveSOFDataHullLightSetTexturedPointLight`

Extends a hull light item with a texture resource while hiding the inherited light-color schema field used by other light types.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullLightSetTexturedPointLight.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullLocator -->
## `EveSOFDataHullLocator`

Stores a named hull locator and its transformation matrix.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullLocator.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:IEveSOFDataHullLocatorSet -->
## `IEveSOFDataHullLocatorSet`

Empty polymorphic marker base shared by concrete locator sets and recursive locator-set groups.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/IEveSOFDataHullLocatorSet.js`
- Visibility: Public
- Kind: Adapted Carbon interface marker

<!-- class:EveSOFDataHullLocatorSet -->
## `EveSOFDataHullLocatorSet`

Provides a concrete named list of hull locators.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullLocatorSet.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullLocatorSetGroup -->
## `EveSOFDataHullLocatorSetGroup`

Recursively groups polymorphic locator-set records under one name.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullLocatorSetGroup.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullPlaneSet -->
## `EveSOFDataHullPlaneSet`

Groups plane items with usage, texture, atlas, visibility, and skinning policy.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullPlaneSet.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullPlaneSetItem -->
## `EveSOFDataHullPlaneSetItem`

Defines a plane item's transform, colors, blink and UV scrolling, atlas selection, groups, intensity, and point-light contribution.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullPlaneSetItem.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullSoundEmitter -->
## `EveSOFDataHullSoundEmitter`

Defines a named sound-emitter event prefix, position, rotation, and attenuation settings.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullSoundEmitter.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullSpotlightSet -->
## `EveSOFDataHullSpotlightSet`

Groups spotlight items with cone, glow, and flare textures plus skinning, depth, and visibility policy.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullSpotlightSet.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullSpotlightSetItem -->
## `EveSOFDataHullSpotlightSetItem`

Defines a faction-aware spotlight placement with group and booster policy, cone, flare, sprite, saturation, scale, and typed spotlight-light data.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullSpotlightSetItem.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullSpriteLineSet -->
## `EveSOFDataHullSpriteLineSet`

Groups named sprite-line items with visibility and skinning policy.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullSpriteLineSet.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullSpriteLineSetItem -->
## `EveSOFDataHullSpriteLineSetItem`

Defines a faction-aware sprite line with bone-relative transform, spacing, circle mode, blink, scale, falloff, intensity, saturation, and point-light data.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullSpriteLineSetItem.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullSpriteSet -->
## `EveSOFDataHullSpriteSet`

Groups named sprite items with visibility and skinning policy.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullSpriteSet.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataHullSpriteSetItem -->
## `EveSOFDataHullSpriteSetItem`

Defines a faction-aware sprite with bone-relative position, blink, scale, falloff, intensity, saturation, and point-light data.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataHullSpriteSetItem.js`
- Visibility: Public
- Kind: Adapted Carbon model

<!-- class:EveSOFDataMultiHullDecalIndexBuffers -->
## `EveSOFDataMultiHullDecalIndexBuffers`

Combines a geometry resource path with the decal index buffers used by a multi-hull decal.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/hull/EveSOFDataMultiHullDecalIndexBuffers.js`
- Visibility: Public
- Kind: Adapted Carbon model
