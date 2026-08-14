# Generic data class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime-sof` classes under `src/sof/generic/`
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for generic SOF configuration, shaders, damage, variants, and visibility records.

<!-- class:EveSOFDataGeneric -->
## `EveSOFDataGeneric`

Provides the top-level generic SOF configuration for shaders, material prefixes, decals, material tables, variants, categories, visibility, swarm, and damage data, with their named lookup helpers.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/generic/EveSOFDataGeneric.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:ErrSOFAreaShaderNotFound -->
## `ErrSOFAreaShaderNotFound`

Reports that a requested area shader is absent from the generic SOF catalog.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/generic/EveSOFDataGeneric.js`
- Visibility: Public
- Kind: Adapted ccpwgl error class

<!-- class:ErrSOFDecalShaderNotFound -->
## `ErrSOFDecalShaderNotFound`

Reports that a requested decal shader is absent from the generic SOF catalog.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/generic/EveSOFDataGeneric.js`
- Visibility: Public
- Kind: Adapted ccpwgl error class

<!-- class:ErrSOFMaterialPrefixNotFound -->
## `ErrSOFMaterialPrefixNotFound`

Reports that a requested material prefix is absent from the generic SOF catalog.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/generic/EveSOFDataGeneric.js`
- Visibility: Public
- Kind: Adapted ccpwgl error class

<!-- class:ErrSOFPatternMaterialPrefixNotFound -->
## `ErrSOFPatternMaterialPrefixNotFound`

Reports that a requested pattern-material prefix is absent from the generic SOF catalog.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/generic/EveSOFDataGeneric.js`
- Visibility: Public
- Kind: Adapted ccpwgl error class

<!-- class:EveSOFDataGenericDamage -->
## `EveSOFDataGenericDamage`

Defines generic armor particle and color settings together with shield geometry, flicker, and shader configuration.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/generic/EveSOFDataGenericDamage.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataGenericDecalShader -->
## `EveSOFDataGenericDecalShader`

Declares the parameters and textures accepted by a decal shader and builds its configuration record.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/generic/EveSOFDataGenericDecalShader.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataGenericHullCategory -->
## `EveSOFDataGenericHullCategory`

Names a generic hull category and records its reflection mode.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/generic/EveSOFDataGenericHullCategory.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataGenericHullDamage -->
## `EveSOFDataGenericHullDamage`

Defines hull-damage particle emission, motion, turbulence, size, texture, and color settings.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/generic/EveSOFDataGenericHullDamage.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataGenericShader -->
## `EveSOFDataGenericShader`

Defines a generic shader's parameters, textures, defaults, transparency and depth policy, and generated configuration.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/generic/EveSOFDataGenericShader.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataGenericString -->
## `EveSOFDataGenericString`

Provides the persisted wrapper used for a generic SOF string value.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/generic/EveSOFDataGenericString.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataGenericSwarm -->
## `EveSOFDataGenericSwarm`

Stores swarm anchor, speed, cohesion, alignment, separation, formation, wander, and deceleration settings.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/generic/EveSOFDataGenericSwarm.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataGenericVariant -->
## `EveSOFDataGenericVariant`

Names a generic variant and its optional hull-area override and transparency policy.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/generic/EveSOFDataGenericVariant.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataVisibilityGroup -->
## `EveSOFDataVisibilityGroup`

Names and describes a generic visibility group.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/generic/EveSOFDataVisibilityGroup.js`
- Visibility: Public
- Kind: Adapted Carbon concept
