# Core builder and manager class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime/sof` classes under `src/sof/`
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for SOF builder, DNA, catalog, manager, internal document-builder, and layout-planner helper classes.

<!-- class:CjsSofLibraryBuilder -->
## `CjsSofLibraryBuilder`

Builds and grows one serializable partial SOF catalog from individual Black records, publishing each decoded record into an EveSOFDataMgr.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/CjsSofLibraryBuilder.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:EveSOF -->
## `EveSOF`

Carbon-first SOF builder whose sole supported public output is a GPU-free model-values graph.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/EveSOF.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFData -->
## `EveSOFData`

Root SOF data catalog.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/EveSOFData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDataMgr -->
## `EveSOFDataMgr`

Owns the CPU-side SOF lookup tables consumed by EveSOFDNA and EveSOF.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/EveSOFDataMgr.js`
- Visibility: Public
- Kind: Carbon

<!-- class:EveSOFDNA -->
## `EveSOFDNA`

Resolves a SOF DNA string against an EveSOFDataMgr.

- Export: `@carbonenginejs/runtime/sof`
- Source: `src/sof/EveSOFDNA.js`
- Visibility: Public
- Kind: Carbon

<!-- class:SofLayoutRandom -->
## `SofLayoutRandom`

Implements the deterministic integer pseudo-random sequence used by internal SOF layout planning.

- Source: `src/sof/layoutPlanner.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:SofDocumentBuilder -->
## `SofDocumentBuilder`

Allocates and links the internal compatibility node table, imports self-describing values or legacy document fragments, and retains only nodes reachable from its root.

- Source: `src/sof/SofDocumentBuilder.js`
- Visibility: Internal
- Kind: Carbon
