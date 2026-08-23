# Architecture and boundaries

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource`
Audience: Users and integrators  
Summary: Defines the GPU-free boundary this package owns and how engine and runtime packages relate to it.

## The GPU-free split

The `resource` layer owns the GPU-free half of the Carbon resource lifecycle:

```text
EMPTY -> REQUESTED/LOADING -> LOADED
```

Engine adapters own device realization:

```text
LOADED -> PREPARING -> PREPARED
```

The package selects and runs registered readers, hydrates or returns the
promised CPU outcome, and stores lifecycle state, cache entries, and loaded
payloads. For compiled effects it independently validates complete permutation
topology and the Carbon v15 container records it read itself, selects a
permutation, and hydrates a canonical device-free `Tr2Shader` graph. It never
creates WebGL/WebGPU textures, buffers, shader modules, pipelines, or bind
groups, and it never inspects backend capability.
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
- `CjsResMan` extension-selected resource/object handlers, semantic resource
  overrides, ordered and legacy registered-format selection,
  concurrency-limited source loading, staged prepare queues, layered
  source/read/resource deduplication, object loader dispatch, and prefetch.
- Main-thread and browser-worker resource execution strategies, including
  transferable fetch results and declared worker-safe CPU readers.
- `CjsTextureArrayRes` and `CjsTextureArrayResParameterProxy` for material-facing,
  frame-coalesced texture-array inputs.
- `CjsAudioBufferRes` for physical audio-byte ownership and `CjsAudioRes` for
  complete or windowed individually addressable audio files.
- Raw `CjsEventEmitter` (from `global/model`) for manager/runtime events
  without requiring `CjsModel` inheritance.
- Resource-path normalization and URL resolution, including prefix bases and
  an injectable complete resolver, with fetch execution delegated to a
  URL-only provider.
- Resource-specific geometry traversal and payload adaptation, composed with
  shared vector, matrix, bounds, sphere, ray, and mesh math from
  the shared `global` layer rather than maintaining another math implementation here.
- Plain reader/converter payload objects with focused shared validators.
- Canonical Carbon resource classes that validate and hold CPU payloads
  privately: `TriTextureRes`, `TriGeometryRes`, `Tr2EffectRes`, `Tr2ImageRes`,
  `TriGrannyRes`, `Tr2GrannyStateRes`, and `Tr2LightProfileRes`.
- Canonical device-free shader/reflection classes: `Tr2Shader`, its effect,
  technique, pass, stage, constant, resource, sampler, annotation, and library
  records; Carbon-binary hydration; permutation selection; and per-index caching.
- `Tr2TexturePipeline` CPU-only texture steps and `Tr2TextureLodManager`
  membership.
- Opaque engine-owned subobject slots for backend adapters.
- Format implementations as explicit tree-shakeable subpaths under
  `@carbonenginejs/runtime/resource/formats/<name>`.
- Acquisition-free FSD byte validation, schema decoding, and approved dataset
  readers under `formats/fsd`. The format keeps separate `32` and `64`
  implementation directories: legacy headerless FSD is identified explicitly
  but is not yet decoded, while modern cFSD uses the 64-bit implementation.

## What the package does not own

- WebGL/WebGPU realization, allocations, upload accounting, device budgets,
  capability limits, and device-loss recovery (engine packages).
- Shader binary decoding, backend translation, and package serialization live
  in the explicit `@carbonenginejs/runtime/resource/formats/{hlsl,dxbc,webgl,webgpu}` subpaths.
  Backend shader objects remain in engine packages.
- AudioBuffer construction, playback, or audio manager behavior.
- Audio-library document construction, enrichment, media-ID interpretation,
  and delivery-route selection.

## Package relationships

- The `core` layer may configure and expose a `CjsResMan`, but does not own its
  implementation.
- The `trinity` and `sof` layers may request GPU-free objects and
  resources without selecting an engine. Trinity owns the mutable
  `Tr2Effect`/`Tr2Material` facade, parameters, options, and sampler overrides;
  it consumes the resource-owned shader graph.
- `engine-webgpu` and future WebGL engines consume loaded resources and own
  all backend allocations, preparation, replacement, and destruction.

Concrete formats are not imported or registered by the package root; see
[formats/README.md](formats/README.md) for the import rule and map.
Worker-safe formats provide their own exact module declaration and remain
explicit registrations; see [browser worker execution](reference/workers.md).

Extension routes are manager-local configuration. They bind an extension to a
handler plus one format or an ordered format chain. The handler's
`ResourceHandlerMode` declaration determines whether path-only `Fetch()`
returns the stable resource or the constructed object. The route snapshot is
captured by the canonical handle, so later registration changes affect only a
new identity after explicit deletion or clearing. Target construction and
dynamic identification run after any worker decode on the main thread.

## Source layout

Authoring source is decorated JavaScript; published output is built ESM in
`npm/dist`. Resource owners and their direct Carbon data records live under
`src/resource`, grouped as `audio`, `geometry`, `geometry/granny`, `shader`,
and `texture`; worker execution and its message protocol live under `src/resource/worker`.
Reviewed, unresolved active ports live under `src/resource/generated` and are exposed
only through the explicit `./generated` package subpath until promotion. Native
shapes that JavaScript replaces or does not use are retained only under
`src/resource/dropped`, with their disposition documented there, and are never exported
or bundled.
