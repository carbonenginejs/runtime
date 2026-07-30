# Package documentation

Status: Evolving  
Scope: `@carbonenginejs/runtime-resource`  
Audience: Users and integrators  
Summary: Documentation home for the GPU-free resource lifecycle, cache, format, and object-loading package.

## Purpose

`@carbonenginejs/runtime-resource` owns the GPU-free resource layer of
CarbonEngineJS: resource identity and state, the MotherLode cache, semantic
resource classes, registered format readers, fetch providers, and the queued
CPU load/publication pipeline. It stops at a published CPU payload; engine
packages realize that payload into backend objects. It also owns the canonical
device-free `Tr2EffectRes`/`Tr2Shader` reflection graph and portable-reflection
hydration boundary.

## Use this package when

- you need Carbon-shaped resource loading (`res:/` paths, requirement/emit
  selection, `Ready()`/`GetObject()`) without choosing a GPU backend;
- you need one of the non-shader format readers as a tree-shakeable subpath
  (`@carbonenginejs/runtime-resource/formats/<name>`);
- you need canonical effect permutation selection or immutable shader
  reflection records from `@carbonenginejs/runtime-resource/resource/shader`;
- you need canonical raw audio resources for complete files or byte windows
  over shared physical sources;
- you are writing an engine adapter that consumes published CPU payloads and
  needs the documented retention, reload, and texture-array contracts.

## Where it fits

- Foundations consumed: `@carbonenginejs/runtime-utils` (event emitter, model
  contracts) and `@carbonenginejs/runtime-utils` where formats need math values.
- Normal consumers: `runtime-core` (configures and exposes a `CjsResMan`),
  `runtime-trinity` and `runtime-sof` (request GPU-free objects), and engine
  packages (`engine-webgpu`, future WebGL engines) that realize prepared
  resources.
- Owned responsibility: resource identity, cache, CPU payload lifecycle,
  format selection and conversion, load/publication queues, and canonical
  device-free effect/shader reflection hydration and selection.
- Owned elsewhere: WebGL/WebGPU realization, device budgets, and device-loss
  recovery belong to engine packages; shader formats belong to the dedicated
  shader format packages.

## Start here

- [Architecture and boundaries](architecture.md)
- [Resource lifecycle concepts](concepts/resource-lifecycle.md)
- [Shader resource model](concepts/shader-resource-model.md)
- [Format subpaths](formats/README.md)
- [Carbon compiled-effect container](formats/carbon-effect-container.md)

## Documentation map

- [architecture.md](architecture.md): package boundary, relationships, and the
  GPU-free split.
- [concepts/resource-lifecycle.md](concepts/resource-lifecycle.md): states,
  the load/prepare split, and the request workflow.
- [concepts/shader-resource-model.md](concepts/shader-resource-model.md): how
  `Tr2EffectRes`, `Tr2Shader` and `Tr2Effect` relate, verified against Carbon —
  one file, many permutations, many effects sharing them.
- [reference/motherlode-cache.md](reference/motherlode-cache.md): canonical
  identity, byte-budget cache, payload retention, and purge contracts.
- [reference/reload.md](reference/reload.md): the candidate-first atomic
  reload contract.
- [reference/queues.md](reference/queues.md): queued CPU load, publication,
  registration, and the `Wait()` fence.
- [reference/workers.md](reference/workers.md): browser-worker source and
  declared worker-safe format execution.
- [reference/classes/audio.md](reference/classes/audio.md): complete/shared
  audio byte owners and individually addressable audio resource views.
- [reference/classes/resources.md](reference/classes/resources.md): canonical
  resource records, effect selection, and shader-reflection classes.
- [reference/texture-arrays.md](reference/texture-arrays.md): texture-array
  proxies, update generations, and adapter commits.
- [reference/texture-pipeline.md](reference/texture-pipeline.md):
  `Tr2TexturePipeline` CPU steps and `Tr2TextureLodManager` membership.
- [reference/events.md](reference/events.md): the `CjsEventEmitter` contract
  and event memory rules.
- [reference/classes/README.md](reference/classes/README.md): the searchable
  one-sentence class-purpose catalog.
- [formats/README.md](formats/README.md): format import map and per-format
  output notes.
- [formats/carbon-effect-container.md](formats/carbon-effect-container.md): the
  v15 compiled-effect binary layout, the shared byte reader and writer, and the
  arena offset policy a byte-exact re-emit depends on.
- [formats/gr2.md](formats/gr2.md): Granny GR2/GSF reading, output modes,
  conversions, graph shape, and class hydration.
- [formats/wwise.md](formats/wwise.md): Wwise soundbank and media readers.
- [formats/stl.md](formats/stl.md): STL geometry export.
- [formats/provenance.md](formats/provenance.md): format ownership, fork
  provenance, and retained snapshots.
- [roadmap.md](roadmap.md): approved future direction that is not implemented.
