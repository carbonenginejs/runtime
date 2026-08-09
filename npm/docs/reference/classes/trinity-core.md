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

<!-- class:TriPoolAllocator -->
## `TriPoolAllocator`

Registers constant-data struct shapes and leases packed payloads from a per-engine arena.

- Export: `@carbonenginejs/runtime-trinity/trinityCore`
- Source: `src/trinityCore/rawData/TriPoolAllocator.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFrameDriver -->
## `CjsFrameDriver`

Runs Carbon's backend-neutral frame body in order, against injected engine hooks.

- Export: `@carbonenginejs/runtime-trinity/trinityCore`
- Source: `src/trinityCore/CjsFrameDriver.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2VertexDefinition -->
## `Tr2VertexDefinition`

A mesh's vertex element list, and the matching of it to a shader's inputs.

- Export: `@carbonenginejs/runtime-trinity/trinityCore`
- Source: `src/trinityCore/Tr2VertexDefinition.js`
- Visibility: Public
- Kind: CarbonEngineJS
