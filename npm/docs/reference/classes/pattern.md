# Pattern data class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime-sof` classes under `src/sof/pattern/`
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for pattern layers, transforms, per-hull selection, and material overrides.

<!-- class:EveSOFDataPattern -->
## `EveSOFDataPattern`

Defines a named two-layer pattern with application groups, per-hull lookup, flip policy, and custom mask support.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/pattern/EveSOFDataPattern.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:ErrSOFProjectionNotFound -->
## `ErrSOFProjectionNotFound`

Reports that a pattern has no projection for the requested hull.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/pattern/EveSOFDataPattern.js`
- Visibility: Public
- Kind: Public error class

<!-- class:EveSOFDataPatternApplicationGroup -->
## `EveSOFDataPatternApplicationGroup`

Names per-layer pattern properties and provides searchable per-hull projections.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/pattern/EveSOFDataPatternApplicationGroup.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataPatternLayer -->
## `EveSOFDataPatternLayer`

Defines a pattern layer's texture, material source, UV modes and slots, and helpers that populate textures and custom masks.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/pattern/EveSOFDataPatternLayer.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataPatternLayerProperties -->
## `EveSOFDataPatternLayerProperties`

Stores a pattern layer's projection modes, area types, and material slots.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/pattern/EveSOFDataPatternLayerProperties.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataPatternMaterialOverride -->
## `EveSOFDataPatternMaterialOverride`

Defines a four-slot target mask for overriding pattern materials.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/pattern/EveSOFDataPatternMaterialOverride.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataPatternPerHull -->
## `EveSOFDataPatternPerHull`

Stores named per-hull transforms for both pattern layers plus flip, clear, and customization policy.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/pattern/EveSOFDataPatternPerHull.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataPatternTransform -->
## `EveSOFDataPatternTransform`

Stores pattern position, scale, rotation, and mirror settings and composes their transformation matrix.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/pattern/EveSOFDataPatternTransform.js`
- Visibility: Public
- Kind: Adapted Carbon concept
