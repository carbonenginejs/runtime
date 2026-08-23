# @carbonenginejs/runtime-sof

GPU-free Space Object Factory data model and Carbon-first ship DNA builder.

Part of the CarbonEngineJS runtime/engine tier (decorated JavaScript, WebGPU-first).
Ports/adapts from CarbonEngine (https://github.com/carbonengine, MIT). Carbon
C++/Blue is canonical; ccpwgl is only an optional, non-authoritative source of
JavaScript convenience ideas.

## Install

```sh
npm install @carbonenginejs/runtime-sof
```

## Quick start

```js
import { EveSOF } from "@carbonenginejs/runtime-sof";

const sof = EveSOF.Create({
  black: decodedSofData,
  resFileIndex
});

const values = sof.BuildValues("rifter", "minmatar", "minmatar");
```

`decodedSofData` is the decoded SOF catalog (raw `data.black` bytes are also
accepted), and `resFileIndex` is an optional list or structural membership
surface used for texture-path existence checks. The result is plain
JSON-compatible model values; no class registry or GPU device is required.

## Documentation

- [Package documentation](docs/README.md)
- [Architecture and boundaries](docs/architecture.md)
- [Class catalog](docs/reference/classes/README.md)

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Status

The package provides the SOF data surface, a map-backed
`EveSOFDataMgr`, Carbon DNA parsing and validation through `EveSOFDNA`, and a
deterministic GPU-free builder. Plain model values returned by
`BuildValues`/`BuildValuesAsync`/`BuildValuesFromDNA`/
`BuildValuesFromDNAAsync` are the sole supported public output boundary. The
implementation still assembles a versioned `carbon.document` node table
internally, and the legacy document-returning methods remain implemented for
compatibility and diagnostics, but those methods are deprecated and the
node-table shape is not a supported consumer contract. Producing values or the
internal intermediate requires no class library.
Current output
includes multi-hull bounds and locators, the space-object type and core flags,
`Tr2Mesh`, routed mesh areas, shader parameters/resources, pattern masks,
custom masks, transparent depth clones, decal sets, and CPU-side impact overlay
graphs with shield, armor, hull-particle, and flicker components. Authored hull
light sets emit visible point, textured-point, and spot lights with faction
colors and cumulative multi-hull transforms; their photometric data is emitted
as Carbon's flat Blue-persisted fields on the light nodes (2026-07-23
LightData flatten decision). Visible hull sprite sets also
emit shared-effect `EveSpriteSet` attachments, including Carbon saturation and
SOF6 sprite-light descriptors reconstructed during runtime initialization. Hull
spotlight sets emit their cone/glow effects, legacy faction colors, SOF6 HSV
color variants, multi-hull transforms, and typed spotlight-light descriptors.
Plane sets emit standard, haze, and video effects; legacy/SOF6 colors; authored
blink state; and SOF6 lights restored through Trinity's maintained CPU API.
Sprite-line sets share the sprite pool effect and preserve Carbon line/circle
geometry plus per-sprite SOF6 light descriptors restored through Trinity's
maintained CPU API.
Haze sets emit spherical, skinned-spherical, and half-spherical effects with
Carbon transforms, faction colors, and SOF6 point-light descriptors installed
through Trinity's maintained `AddLightFromSOF`/`Initialize` CPU lifecycle.
Legacy and SOF6 banners emit usage-grouped `EveBannerSet` graphs, generic
banner effects, private light/texture state, and root external texture bindings.
Legacy hull children and SOF6 child sets now project and filter exactly from
the first hull, including faction overrides and standalone build flags. Because
their `.red` paths name arbitrary Trinity graphs, callers provide a synchronous
`EveSOF.SetChildResourceResolver()` that returns a local root descriptor, a
self-describing model-values root (directly or in `{ values, ... }`), or a
legacy complete `carbon.document` compatibility fragment. Every model in a
values fragment carries `_type`; values `_id`/`_ref` labels and legacy document
IDs/references are remapped inside the builder for every placement clone before
the supported values projection is produced. Legacy hull
animations emit scalar/quaternion curves, model-rotation bindings, empty curve
sets, and recursive `Tr2DynamicEmitter.rate` bindings; Carbon's translation
animation branch remains its source TODO.
The standalone tail also projects first-hull sound emitters and controllers,
emits `TriObserverLocal` audio placement intent, filters controller resources,
and loads model rotation/translation curve documents after legacy animations.
`EveSOF.SetObjectResourceResolver()` provides the synchronous controller/curve
resource boundary and accepts the same self-describing values or legacy
document inputs; audio backend creation remains intentionally deferred.
First-hull instanced attachments now project Carbon's packed current/previous
transform rows, runtime instance bounds, shader inputs, and quality filters.
The builder emits `Tr2RuntimeInstanceData`, `Tr2InstancedMesh`, opaque area,
effect, child-mesh, and named container nodes in Carbon order. Runtime-instance
layout, normalized rows, and explicit bounds are ordinary graph fields;
Trinity may derive a packed CPU byte view from them, while GPU buffer creation
and upload remain exclusively renderer responsibilities. Base-mesh paths,
child instance transforms, child placement (SRT, LOD gate, origin), placement
containers (animation owner, always-on, placement root), decal static index
buffers, plane/banner shared texture parameters, impact overlay state, and
the faction inherit color set are all ordinary declared node fields now.
Multi-hull boosters now project detached hull/race records, emit Carbon's
near/far volumetric effects, glow sprites, optional trails, cumulative hull
transforms, and merged booster locators. Booster descriptions are emitted as
typed `EveBoosterSet2Item` graph nodes; Trinity rebuilds derived glow, trail,
light, and bounds state during initialization. Layout catalog records
project recursively into Carbon's deterministic planner shape, including
groups, depletion counters, placement distributions, all four condition
methods, descriptor defaults, and DNA layout/locator accessors.
`EveSOF.PlanLayoutFromDNA()` exposes the detached, versioned CPU plan with
Carbon's exact RNG stream, locator occupation/ranking, condition quirks,
random rotation/scaling, descriptor inheritance, and recursive nested layout
transforms. The legacy document builder used by `BuildValuesFromDNA()` consumes
the same plan to emit Carbon's
`layouts` container, ordinary extension hull children, non-shared runtime
instance meshes, and the single root-level `SharedInstancedMeshes` child.
Shared mesh records are typed `EveChildInstancedMesh` nodes on the declared
`EveChildInstancedMeshes.meshes` field. Scrambled layouts accept
an explicit `scrambleSeedOffset` option so offline builds remain reproducible
without wall-clock or global random state. Layout occurrences independently
expand the root bounding sphere and shield ellipsoid according to their authored
flags. Placement containers route controllers and audio per occurrence, along
with legacy/SOF6 effect children and retained animation-owner setup. Carbon's
two-owner rule is preserved: transform children, legacy curve sets, and model
rotation state remain on the parent space object, while effect children alone
are distributed across placement containers.
Carbon extension-class builds now use their separate fake-placement path: an
empty `EveMobile` root mesh owns an always-on `Extension Container`, while the
actual extension geometry, decals, attachments, placement controllers/audio,
instanced attachments, locator sets, and nested layouts are emitted beneath or
alongside that placement graph. Root initialization and placement-root intent
are retained for device-free hydration. The complete 44-entry faction inherit
color set is emitted as an `EveChildInheritProperties` node on the root's
declared `inheritProperties` field in Carbon's enum order;
`EveSpaceObject2.Initialize` propagates it, so authoring
(`SetInheritProperties`) and field-populated graphs converge. The source
scanner expands all 44 indexed Blue color fields rather than the unexpanded
macro placeholder.
Swarm build classes emit Carbon's complete 25-value `EveSwarm` behavior and
hydrate it before initialization. Variant DNAs construct fresh stripped custom
hulls, and locator-set fan-out/merging and instanced-layout decal routing follow
their dedicated Carbon build paths.
The public turret material entry points support both direct faction selection
and full parent DNA, including Carbon's faction material-slot remap and
const-parameter-first update behavior.

Plain model values are the SOF package's sole supported output boundary:
`BuildValues`/`BuildValuesAsync`/`BuildValuesFromDNA`/`BuildValuesFromDNAAsync`
return one nested JSON-serializable value with `_type` on polymorphic nodes and
`_id`/`_ref` only for genuinely shared identity, and no node table, `kind`,
`fields`, or `raw` transport envelope.

**Pass no class registry.** runtime-sof emits JSON, and JSON does not need the
classes it names, so the projection constructs nothing and imports nothing —
which is what keeps this package free of runtime-trinity in fact rather than
only in its manifest. A registry parameter here would reintroduce the round trip
this package deliberately removed.

Building real objects is an optional caller step: use `RootClass.from(values)`
with the class families that caller has loaded. Current SOF graphs can name
both Trinity and audio graph classes, so optional object construction may
require both `runtime-trinity` and `runtime-audio/trinity`; generation does
not. The output is sparse: it carries what SOF set, and constructors apply
class defaults.

Parity tests prove the constructed values graph exports identically to the
legacy document-hydrated one, including shared references and the audio
emitter, and a further test asserts that values build with nothing supplied at
all.

**Deprecated:** `Build`/`BuildFromDNA` and their async forms still expose the
internal `carbon.document` compatibility shape, and document hydration still
uses `createSofHydrationAdapter()`. They remain only until existing fragment,
diagnostic, and test consumers migrate. New package APIs and service routes
must return model values; they must not expose `carbon.document`.

The retired **audio** side channel no longer writes `node.raw`. The emitter used
to be a deferred
`sofAudioEmitterSetup` construction record because no audio model could be
named without dragging WebAudio in. `runtime-audio/trinity` is that model now,
so the emitter is an ordinary declared `AudEmitter` value under
`TriObserverLocal.observer`, and the values graph is a complete rebuild source.
Caller-supplied resolver descriptors and imported legacy document fragments may
still carry `raw`; the builder preserves and remaps it, while the values
projection flattens those envelope contents into ordinary model-value
properties. The emitted animation values preserve the complete curve and
binding graph.
Texture path inserts remain
deterministic and GPU-free through an optional synchronous resource-existence
resolver. Compatibility limits and remaining verification work are called out
below.

Decorated JavaScript under `src` is canonical source. `npm run build:npm`
produces consumer ESM under `npm/dist`.

### Source promotion

The behavior-promotion queue is complete. `src/generated` is retained only as
an empty compatibility namespace; all reviewed decorated implementations live
under the matching `src/sof/<domain>` folder and are exported through the
domain barrels and root package surface. Carbon/Blue is authoritative for
fields, defaults, enum ownership, and runtime behavior. Secondary JavaScript
implementations may inform optional CPU conveniences only after they are
checked against Carbon.

## Instantiation

The canonical pure-data entry point takes the two things a space object
factory actually needs and nothing else:

```js
const sof = EveSOF.Create({
  black,                  // data.black bytes (or its decoded data) - required
  resFileIndex: names     // plain array of res file names - optional
});
const values = sof.BuildValues("rifter", "minmatar", "minmatar");
```

`black` is mandatory: a factory without its catalog is useless, so its absence
throws. Raw bytes are decoded with the black format reader (the one sanctioned
format dependency); already-decoded data is accepted as-is. `resFileIndex` is
the sole build-time resource dependency - Carbon's resPathInsert texture
selection is an existence test - and it is just a case-insensitive list of
file names from wherever the caller got them (a parsed resfileindex, an index
service, a fixture). Without it the factory warns once and every insert lookup
reports missing, so texture paths fall back to their base values. The factory
never fetches, never parses index formats, and never touches the network.

## Async boundary

The synchronous resolver methods remain available for preloaded and offline
tools. Promise-facing callers configure a narrow resource adapter and use the
explicit async methods:

```js
sof.Register({
  dataPath: "res:/sof/data.black",
  resources: {
    getObject: (path, request) => library.FetchObject(path, request),
    exists: (path, request) => source.Exists(path, request)
  }
});

await sof.LoadDataAsync();
const values = await sof.BuildValuesFromDNAAsync("rifter:minmatar:minmatar");
```

Async values builds run the internal document builder once to collect selected
dependencies, resolve each unique dependency, rerun against per-call
synchronous caches, and project the result to model values. `getObject`
may supply selected child/controller/curve inputs as self-describing values or
legacy `carbon.document` compatibility fragments. For compatibility with
existing loaders, the dependency request still says `output: "carbon.document"`;
that request token negotiates an accepted input shape and does not make the
document node table a supported SOF output. Completion means the returned
values include the selected fragments; it does not imply geometry, texture,
effect, engine-adapter, or GPU readiness.

Registration is additive: omitted resource callbacks retain their current
values, while an explicit `null` clears only that callback. Resource paths are
normalized before requests are deduplicated by path and semantic output.
Resolver failures reject the complete operation with code
`EVE_SOF_RESOURCE_RESOLUTION_FAILED` plus `path`, `role`, and `cause`; no
partial values graph is returned. A resolved `null` remains an optional missing
dependency and follows the synchronous omission behavior.

The async `BuildValues*` methods are the supported embedding API. The
document-returning async methods remain only as the deprecated intermediate and
compatibility path they currently reuse. Carbon's synchronous build is
self-resolving only because C++ blocks on its global resource manager; the
authored `res:/...red` references resolve to compiled `.black` payloads that
only a resource layer (in this organization, `@carbonenginejs/runtime-resource`
and its `CjsResMan`) can fetch and decode.

Without resolvers, synchronous values builds stay complete AS DATA through
Carbon's own deferred-loading nodes: hull children emit `EveChildRef`
(persisted `resPath`, placement, `loadChildAutomatically`) and controllers
emit `Tr2ControllerReference` (persisted `path`), exactly the nodes Carbon
ships for runtime-loaded references. The consuming runtime loads each
reference when it pleases and routes the loaded root by its real type. The
returned values graph doubles as its own dependency manifest. Model curves have no
Carbon reference class - Carbon inline-loads them only because its blocking
resource manager made that free - so they defer through the
CarbonEngineJS-original `CjsExternalRef` node, which carries the authored res
path and the Carbon interface the loaded root must implement. The one thing
that cannot defer: emitter rate bindings that reach into an unloaded child's
graph record a `deferred-child-animation-binding` diagnostic. A configured
resolver that declines a path records `unresolved-child-resource` /
`unresolved-object-resource` with reason `not-resolved`, mirroring Carbon's
logged invalid-resource skip. Diagnostics for the most recent build are
readable through `GetBuildDiagnostics()`.

Texture `resPathInsert` selection is existence-driven at build time in Carbon.
Provide the resfileindex as the synchronous existence oracle -
`Register({ resFileIndex })` accepts the tools-browser `CjsFileIndex` surface
(`Has`), a `Set`/`Map`, or a predicate - or supply an async `exists` callback
(for example backed by a remote index service) and use the async `BuildValues`
methods.

## Read-only contract

Carbon's manager and DNA getters return const references; JavaScript cannot.
Every structure returned by `EveSOFDataMgr`/`EveSOFDNA` getters
(`GetHullData`, `GetMaterialData`, `GetPatternData`, projected maps and
arrays, ...) is read-only by contract: mutating returned data is undefined
behavior and may corrupt later builds. Projections copy authored inputs at
`SetData` time (so mutating YOUR source data after handing it over is safe),
but they do not defensively copy on every getter call.

## Compatibility evidence

### Current

The implementation is source-aligned against Carbon C++/Blue, but it has no
checked-in native-output differential harness. In this README, “exact” refers
to an inspected algorithm and “parity” in the values section means equivalence
between the supported model-values output and the deprecated internal document
projection; neither term claims end-to-end native
Carbon equivalence.

The layout planner deliberately replaces process-global and wall-clock state
with injected deterministic inputs. It also keeps stable equal-key ordering,
propagates `seedOverwrite` through nested layouts, and rejects unsafe recursion
or distribution input. Extension Bucket records are traversed recursively
because they author a `placements` collection, even though Carbon's current
unpacker reaches Bucket through its concrete Placement lineage. These are
intentional compatibility choices pending authored-data or native-fixture
evidence.

Sprite and haze effects share identity within one built graph; the internal
document and supported values projection preserve that identity. Carbon keeps
the corresponding effects on the factory instance and shares them across
builds; no operational incompatibility is known while those effects remain
immutable.

At the current runtime-sof source on 2026-08-15, the suite contains 129 tests.
With both sibling consumer bundles present —
`runtime-trinity/npm/dist/index.js` and
`runtime-audio/npm/dist/trinity/index.js` — all 129 run and pass. Twenty-two
tests are wholly conditional hydration/integration tests, and two
otherwise-unconditional tests contain optional hydration branches. All 24
integration points require constructors from both sibling bundles, and their
predicates check both prerequisites. Values generation and the four resolver
values-fragment regressions are unconditional and require no registry or class
library.

### Planned

- Retire the public `carbon.document` methods, hydration adapter, and tools
  `/document` route after their remaining consumers migrate; then remove the
  internal document intermediate if no builder stage still requires it.
- Until that retirement, keep both runtime-trinity and runtime-audio hydration
  bundles revision-controlled for complete release evidence.
- Add normalized native fixtures for representative stationary, mobile, ship,
  swarm, and extension builds.
- Recheck the deliberate Bucket traversal and deterministic layout differences
  against those fixtures before changing either behavior.
- Normalize Carbon source headers and implementation-reason metadata. At
  `68fb735`, 29 adapted methods lacked `@impl.reason`, 93 source files retained
  the legacy provenance header, and JavaScript-only helper methods still needed
  annotation review.

## Checks

```sh
npm test
npm run lint
```

## Provenance

CarbonEngine and Fenris Creations (CCP Games) are named for interoperability and provenance context.
This package's runtime code is CarbonEngineJS original work that ports or adapts CarbonEngine class
structure and behavior against the authoritative Carbon C++/Blue source. The ccpwgl WebGL port may
inform optional JavaScript conveniences only; it is not an authority for schema or runtime behavior.
Not affiliated with or endorsed by CCP Games.
