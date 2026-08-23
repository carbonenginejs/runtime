# Faction data class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime/sof` classes under `src/sof/faction/`
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for faction selection, color, visibility, and attachment override records.

<!-- class:EveSOFDataFaction -->
## `EveSOFDataFaction`

Aggregates a faction's area, color, logo, pattern, material-slot, visibility, plane, spotlight, child, and resource-path configuration.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/faction/EveSOFDataFaction.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataFactionChild -->
## `EveSOFDataFactionChild`

Names a faction child and records its group and visibility settings.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/faction/EveSOFDataFactionChild.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataFactionColorSet -->
## `EveSOFDataFactionColorSet`

Stores a faction's semantic color palette and resolves enum-selected colors into vectors.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/faction/EveSOFDataFactionColorSet.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:ErrSOFFactionColorSetTypeUnknown -->
## `ErrSOFFactionColorSetTypeUnknown`

Reports that a faction-color lookup used an unknown color-slot enum value.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/faction/EveSOFDataFactionColorSet.js`
- Visibility: Public
- Kind: Public error class

<!-- class:ErrSOFFactionColorSetTypeNotFound -->
## `ErrSOFFactionColorSetTypeNotFound`

Reports that a known faction-color slot has no color assigned.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/faction/EveSOFDataFactionColorSet.js`
- Visibility: Public
- Kind: Public error class

<!-- class:EveSOFDataFactionHullArea -->
## `EveSOFDataFactionHullArea`

Stores named faction hull-area parameters and provides case-insensitive lookup.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/faction/EveSOFDataFactionHullArea.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataFactionPlaneSet -->
## `EveSOFDataFactionPlaneSet`

Names a faction plane-set group and supplies its color.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/faction/EveSOFDataFactionPlaneSet.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataFactionSpotlightSet -->
## `EveSOFDataFactionSpotlightSet`

Names a faction spotlight-set group and supplies its cone, sprite, and flare colors.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/faction/EveSOFDataFactionSpotlightSet.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataFactionVisibilityGroupSet -->
## `EveSOFDataFactionVisibilityGroupSet`

Defines faction visibility-group membership and object-visibility policy.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/faction/EveSOFDataFactionVisibilityGroupSet.js`
- Visibility: Public
- Kind: Adapted Carbon concept
