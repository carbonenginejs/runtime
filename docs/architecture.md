# Architecture and boundaries

Status: Evolving  
Scope: `@carbonenginejs/runtime-resource`  
Audience: Users and integrators  
Summary: Defines the GPU-free boundary this package owns and how engine and runtime packages relate to it.

## The GPU-free split

`runtime-resource` owns the GPU-free half of the Carbon resource lifecycle:

```text
EMPTY -> REQUESTED/LOADING -> LOADED
```

Engine adapters own device realization:

```text
LOADED -> PREPARING -> PREPARED
```

The package selects and runs registered non-shader readers, hydrates or
returns the promised CPU outcome, and stores lifecycle state, cache entries,
and loaded payloads. It never creates WebGL/WebGPU textures, buffers, shader
modules, pipelines, or bind groups, and it never inspects backend capability.
A realization failure destroys its candidate and returns the resource to
`LOADED` without discarding the valid CPU payload.

This deliberately differs from Carbon and ccpwgl, whose resource classes live
inside an engine that can prepare GPU objects directly. Keeping the
format/resource layer reusable means stopping before GPU work; see
[resource lifecycle concepts](concepts/resource-lifecycle.md) for the
historical mapping.

## What the package owns

- `CjsResource` state and Carbon-style resource methods.
- `CjsMotherLode` canonical identity, explicit replacement results, activity
  and lock metadata, deterministic payload/adapter cleanup, and cache stats.
- `CjsResMan` semantic resource construction, registered-format selection,
  concurrency-limited source loading, staged prepare queues, layered
  source/read/resource deduplication, object loader dispatch, and prefetch.
- Main-thread and browser-worker resource execution strategies, including
  transferable fetch results and declared worker-safe CPU readers.
- `CjsTextureArrayRes` and `CjsTextureParameterProxy` for material-facing,
  frame-coalesced texture-array inputs.
- `CjsAudioBufferRes` for physical audio-byte ownership and `CjsAudioRes` for
  complete or windowed individually addressable audio files.
- Raw `CjsEventEmitter` (from `runtime-utils/model`) for manager/runtime events
  without requiring `CjsModel` inheritance.
- Path normalization, extension helpers, and source adapters for memory and
  `fetch`.
- Plain reader/converter payload objects with focused shared validators.
- Canonical Carbon resource classes that validate and hold CPU payloads
  privately: `TriTextureRes`, `TriGeometryRes`, `Tr2EffectRes`, `Tr2ImageRes`,
  `TriGrannyRes`, `Tr2GrannyStateRes`, and `Tr2LightProfileRes`.
- `Tr2TexturePipeline` CPU-only texture steps and `Tr2TextureLodManager`
  membership.
- Opaque engine-owned subobject slots for backend adapters.
- Non-shader format implementations as explicit tree-shakeable subpaths under
  `@carbonenginejs/runtime-resource/formats/<name>`.

## What the package does not own

- WebGL/WebGPU realization, allocations, upload accounting, device budgets,
  capability limits, and device-loss recovery (engine packages).
- Shader formats (`format-dxbc`, `format-hlsl`, `format-webgl`,
  `format-webgpu` remain separate packages).
- AudioBuffer construction, playback, or audio manager behavior.
- Audio-library document construction, enrichment, media-ID interpretation,
  and delivery-route selection.

## Package relationships

- `runtime-core` may configure and expose a `CjsResMan`, but does not own its
  implementation.
- `runtime-trinity` and `runtime-sof` may request GPU-free objects and
  resources without selecting an engine.
- `engine-webgpu` and future WebGL engines consume loaded resources and own
  all backend allocations, preparation, replacement, and destruction.

Concrete formats are not imported or registered by the package root; see
[formats/README.md](formats/README.md) for the import rule and map.
Worker-safe formats provide their own exact module declaration and remain
explicit registrations; see [browser worker execution](reference/workers.md).

## Source layout

Authoring source is decorated JavaScript; published output is built ESM in
`npm/dist`. Completed Carbon data classes live with maintained source under
`src/resources`; original audio resource owners live under `src/audio`;
worker execution and its message protocol live under `src/worker`;
`src/generated` is reserved for unresolved active ports and is currently
absent. Native shapes that JavaScript replaces or does not use are retained
only under `src/dropped`, with their disposition documented there, and are
never exported or bundled.
