# Architecture and boundaries

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource`
Audience: Users and integrators  
Summary: Defines the resource lifecycle this package owns and how it reaches the graphics abstraction layer.

## The resource lifecycle

The `resource` layer owns the whole Carbon resource lifecycle, load and
prepare both:

```text
EMPTY -> REQUESTED/LOADING -> LOADED -> PREPARING -> PREPARED
```

Carbon does the same. A resource prepares itself: `BlueAsyncRes` carries the
`m_isPrepared` flag (`blue/include/BlueAsyncRes.h:87-166`) and the concrete
resource implements `OnPrepareResources` (`TriTextureRes.h:124`,
`TriGeometryRes.h:353`, `Tr2EffectRes.h:53`). There is no layer between the
resource and the device in Carbon, and there is none here.

The package selects and runs registered readers, hydrates or returns the
promised CPU outcome, and stores lifecycle state, cache entries, and loaded
payloads. For compiled effects it independently validates complete permutation
topology and the Carbon v15 container records it read itself, selects a
permutation, and hydrates a canonical `Tr2Shader` graph.
A prepare failure destroys its candidate and returns the resource to
`LOADED` without discarding the valid CPU payload.

GPU work goes through the abstraction layer in `src/trinityal`, exactly as
Carbon's resources call its AL. Headlessness is what the stub backend is for:
running without a device means selecting the stub, never hollowing a resource
class out. A resource method left empty so that something else can do its work
is a gap to be closed, not a boundary.

The divergences that remain are the ones the browser forces: adapter
acquisition, `mapAsync`, shader-module and pipeline creation, `fetch`, and
image and video decode are asynchronous where Carbon's are not. Each carries
its own `@impl.reason` at the site. "An engine owns this" is not one of them.

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

- Backend allocation, upload accounting, device budgets, capability limits,
  and device-loss recovery. These belong to the abstraction layer in
  `src/trinityal/<backend>`, which resource classes call; Carbon's resources
  call its AL the same way.
- Shader binary decoding, backend translation, and package serialization live
  in the explicit `@carbonenginejs/runtime/resource/formats/{hlsl,dxbc,webgl,webgpu}` subpaths.
  Backend shader objects are allocated by the abstraction layer.
- AudioBuffer construction, playback, or audio manager behavior.
- Audio-library document construction, enrichment, media-ID interpretation,
  and delivery-route selection.

## Package relationships

- The `core` layer may configure and expose a `CjsResMan`, but does not own its
  implementation.
- The `trinity` and `sof` layers may request resources directly, as Carbon's
  do. With the stub backend selected they run headless. Trinity owns the mutable
  `Tr2Effect`/`Tr2Material` facade, parameters, options, and sampler overrides;
  it consumes the resource-owned shader graph.

### What Trinity needs from this layer

One thing: somewhere to ask for a res file. Not an adapter, not an injected
seam.

Carbon settles this across a repository boundary, which is a stronger test than
ours. `blue` and `trinity` are separate repositories, and `trinity` takes
exactly one header from the manager's: `IBlueResMan.h`, through `StdAfx.h:54`.
It then calls the global `BeResMan` (`IBlueResMan.h:135`) at 94 sites, for
example `BeResMan->GetResource( profilePath, L"lp", lightProfile )`
(`EveBannerSet.cpp:63`, `EveHazeSet.cpp:52`, `EvePlaneSet.cpp:40`), and holds
the result as an ordinary member. No indirection is introduced for the
crossing.

The resource CLASSES are not what crosses. In Carbon they live with their
consumer - `TriGeometryRes`, `TriTextureRes`, `Tr2EffectRes` and
`Tr2LightProfileRes` are all in `trinity/trinity/Resources/`, while `blue` owns
only the manager and the async base (`BlueResMan`, `BlueAsyncRes`,
`IBlueResource`). Carbon's audio repository goes further and never involves the
manager at all, reading its own bytes through a Wwise IO hook.

We arrange this differently: the manager and the resource classes are one layer
here, below `trinity`. `layers.json` lets `trinity` import `resource`, so a
Trinity class may hold a `TriGeometryRes` exactly as Carbon's does - these are
small records, and holding one is not a layering event. `Tr2Mesh` and
`Tr2TexturedPointLight` already work this way, through `CjsResMan.GetGlobal()`,
which is the `BeResMan` pattern.

So a Trinity class that needs a resource asks the manager for it. "An adapter
supplies it" and "the seam is injected" describe neither Carbon nor this
package, and where they appear they mark work that was never done rather than a
boundary being kept.
- The `trinityal/<backend>` layers own backend allocation, replacement, and
  destruction. Preparation is the resource's own, through `OnPrepareResources`;
  the backend supplies the objects it allocates.

Concrete formats require [explicit imports and registration](formats/README.md).
[Worker-safe formats](reference/workers.md) also declare their exact module;
the package root imports and registers neither.

Extension routes are manager-local configuration. They bind an extension to a
handler plus one format or an ordered format chain. The handler's
`ResourceHandlerMode` declaration determines whether path-only `Fetch()`
returns the stable resource or the constructed object. The route snapshot is
captured by the canonical handle, so later registration changes affect only a
new identity after explicit deletion or clearing. Target construction and
dynamic identification run after any worker decode on the main thread.

## Source layout

Resource source is directly importable ESM without decorator syntax. Classes
that need schema metadata install it through `CjsSchema.define`; removing the
syntax does not remove their identity, fields or model behavior. Source-focused
resource tests import `src/resource` directly and need no rebuild;
published-artifact checks still use `npm/dist`.
This does not change other layers' decorator/build requirements. Published
output remains built ESM in `npm/dist`.

Resource owners and their direct Carbon data records live under
`src/resource`, grouped as `audio`, `geometry`, `geometry/granny`, `shader`,
and `texture`; worker execution and its message protocol live under `src/resource/worker`.
Reviewed, unresolved active ports live under `src/resource/generated` and are exposed
only through the explicit `./generated` package subpath until promotion. Native
shapes that JavaScript replaces or does not use are retained only under
`src/resource/dropped`, with their disposition documented there, and are never exported
or bundled.
