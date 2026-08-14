# Core builder and manager class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime-sof` classes under `src/sof/`
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for SOF builder, DNA, catalog, manager, internal document-builder, and layout-planner helper classes.

<!-- class:EveSOF -->
## `EveSOF`

Carbon-first, GPU-free SOF builder that configures catalog and resource inputs, resolves DNA, and emits the supported plain model-values graph.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/EveSOF.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFData -->
## `EveSOFData`

Owns the root SOF catalog collections for factions, generic settings, hulls, layouts, materials, patterns, and races.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/EveSOFData.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDataMgr -->
## `EveSOFDataMgr`

Provides the CPU-side SOF data manager and named catalog lookups used by DNA resolution and graph building.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/EveSOFDataMgr.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:EveSOFDNA -->
## `EveSOFDNA`

Parses and resolves a SOF DNA or layout descriptor against an `EveSOFDataMgr` and exposes the selected catalog records.

- Export: `@carbonenginejs/runtime-sof`
- Source: `src/sof/EveSOFDNA.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:SofLayoutRandom -->
## `SofLayoutRandom`

Implements the deterministic integer pseudo-random sequence used by internal SOF layout planning.

- Export: None
- Source: `src/sof/layoutPlanner.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:SofDocumentBuilder -->
## `SofDocumentBuilder`

Allocates and links the internal compatibility node table, imports legacy fragments, and retains only nodes reachable from its root.

- Export: None
- Source: `src/sof/EveSOF.js`
- Visibility: Internal
- Kind: Internal implementation class
