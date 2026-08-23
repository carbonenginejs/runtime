# Layout data class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime/sof` classes under `src/sof/layout/`
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for layout definitions, placements, groups, distributions, and their interfaces.

<!-- class:EveSOFDataDistributionDepletionCounter -->
## `EveSOFDataDistributionDepletionCounter`

Stores a named integer counter used to deplete layout-distribution capacity deterministically.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/layout/EveSOFDataDistributionDepletionCounter.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:IEveSOFDataHullExtensionPlacement -->
## `IEveSOFDataHullExtensionPlacement`

Provides the empty polymorphic marker base for hull-extension placements and placement groups.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/layout/IEveSOFDataHullExtensionPlacement.js`
- Visibility: Public
- Kind: Adapted Carbon interface

<!-- class:IEveSOFDataHullExtensionPlacementDistribution -->
## `IEveSOFDataHullExtensionPlacementDistribution`

Provides the common named condition and variant base for placement-distribution rules.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/layout/IEveSOFDataHullExtensionPlacementDistribution.js`
- Visibility: Public
- Kind: Adapted Carbon interface

<!-- class:EveSOFDataHullExtensionPlacementDistributionDepletionCounter -->
## `EveSOFDataHullExtensionPlacementDistributionDepletionCounter`

Tests named depletion counters as a condition for a hull-extension placement.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/layout/EveSOFDataHullExtensionPlacementDistributionDepletionCounter.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings -->
## `EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings`

Tests map graphic-quality settings as a condition for a hull-extension placement.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/layout/EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataHullExtensionPlacementDistributionParentMatch -->
## `EveSOFDataHullExtensionPlacementDistributionParentMatch`

Matches a parent DNA descriptor as a condition for a hull-extension placement.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/layout/EveSOFDataHullExtensionPlacementDistributionParentMatch.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataHullExtensionPlacementDistributionRandomChance -->
## `EveSOFDataHullExtensionPlacementDistributionRandomChance`

Applies a probability threshold as a condition for a hull-extension placement.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/layout/EveSOFDataHullExtensionPlacementDistributionRandomChance.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataHullExtensionPlacementDistributionPlacement -->
## `EveSOFDataHullExtensionPlacementDistributionPlacement`

Controls placement completeness, caps, bias, random scale and rotation, uniformity, and locator-occupancy policy.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/layout/EveSOFDataHullExtensionPlacementDistributionPlacement.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataHullExtensionPlacement -->
## `EveSOFDataHullExtensionPlacement`

Defines a concrete hull extension by DNA, locator, offset, distribution, conditions, and build flags.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/layout/EveSOFDataHullExtensionPlacement.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataHullExtensionBucket -->
## `EveSOFDataHullExtensionBucket`

Groups extension placements and depletion counters while preserving the compatible Blue bucket surface.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/layout/EveSOFDataHullExtensionBucket.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataHullExtensionPlacementGroup -->
## `EveSOFDataHullExtensionPlacementGroup`

Groups enabled nested placements with group-level conditions and depletion counters.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/layout/EveSOFDataHullExtensionPlacementGroup.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataLayout -->
## `EveSOFDataLayout`

Defines a named, seeded top-level layout with placements, counters, and randomization policy.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/layout/EveSOFDataLayout.js`
- Visibility: Public
- Kind: Adapted Carbon concept
