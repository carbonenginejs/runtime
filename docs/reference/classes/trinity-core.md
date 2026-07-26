# Trinity core classes

Status: Evolving
Scope: `@carbonenginejs/runtime-trinity/trinityCore`
Audience: Engine authors and integrators
Summary: Catalogs the GPU-free constant-data classes an engine binds when it realizes the Trinity graph.

<!-- class:RawData -->
## `RawData`

A packed constant-data slice bound to a resolved layout.

- Export: `@carbonenginejs/runtime-trinity/trinityCore`
- Source: `src/trinityCore/rawData/RawData.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:RawDataStore -->
## `RawDataStore`

Registers constant-data struct shapes and leases packed payloads from a per-engine arena.

- Export: `@carbonenginejs/runtime-trinity/trinityCore`
- Source: `src/trinityCore/rawData/RawDataStore.js`
- Visibility: Public
- Kind: CarbonEngineJS
