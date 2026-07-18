# @carbonenginejs/runtime-resource

CarbonEngineJS resource lifecycle, cache, format selection, source, and object
loading contracts.

This package owns the GPU-free resource layer:

- `CjsResource` state and Carbon-style resource methods.
- `CjsTextureArrayRes` and `CjsTextureParameterProxy` for material-facing,
  frame-coalesced texture-array inputs without changing ordinary texture
  parameter behavior.
- `CjsMotherLode` canonical identity, explicit replacement results, activity
  and lock metadata, deterministic payload/adapter cleanup, and cache stats.
- `CjsResMan` semantic resource construction, registered-format selection,
  concurrency-limited source loading, staged prepare queues, layered
  source/read/resource deduplication, object loader dispatch, and prefetch.
- Raw `CjsEventEmitter` from `core-types/model` for manager/runtime events
  without requiring `CjsModel` inheritance. External listeners unregister
  directly with `OffEvent`; listener scopes, owner-side `ListenTo` helpers,
  and a separate resource notification layer are not part of the contract.
- Path normalization and extension helpers.
- Source adapters for memory and `fetch`.
- Plain reader/converter payload objects with focused shared validators.
- Canonical Carbon resource classes that validate and hold CPU payloads
  privately:
  `TriTextureRes`, `TriGeometryRes`, `Tr2EffectRes`, `Tr2ImageRes`,
  `TriGrannyRes`, `Tr2GrannyStateRes`, and `Tr2LightProfileRes`.
- Opaque engine-owned subobject slots for backend adapters.
- Format policy, format class contracts, and load/prepare state mapping stay
  inside this package's implementation and public API rather than external
  workspace notes.
- Non-shader format implementations are owned as explicit tree-shakeable
  subpaths under `@carbonenginejs/runtime-resource/formats/<name>`.

It intentionally does not own WebGL/WebGPU realization. Engine packages should adapt prepared resources into backend objects.

Authoring source is decorated JavaScript. Published/consumer output is built ESM in `npm/dist`.

## Package relationships

- `runtime-core` may configure and expose a `CjsResMan`, but does not own its
  implementation.
- `runtime-trinity` and `runtime-sof` may request GPU-free objects and resources
  without selecting an engine.
- `engine-webgpu` and future WebGL engines consume loaded resources and own all
  backend allocations, preparation, replacement, and destruction.

Concrete formats are not imported or registered by the package root:

```js
import { CjsResMan } from "@carbonenginejs/runtime-resource";
import { CjsMp4Format } from "@carbonenginejs/runtime-resource/formats/mp4";

const resMan = new CjsResMan().Register({
  source,
  formats: [ CjsMp4Format ]
});

const resource = resMan.GetResource("res:/video/intro.mp4");
const video = await resource.Ready();
```

Formats return plain payload objects. Semantic resource classes apply them
through `SetPayload()`, validate their own required fields, and throw
`CJS_RESOURCE_PAYLOAD_INVALID` before replacing a previously valid payload.
`GetPayload()`, `HasPayload()`, and `ReleasePayload()` manage transient CPU
retention without introducing a parallel DTO class hierarchy.

Red payload output reserves configurable type, ID, reference, and sequence
values markers (`_type`, `_id`, `_reference`, and `_values` by default).
Repeated or cyclic sequences use an ID-bearing values envelope; unique
sequences remain arrays. Authored fields may not collide with active markers,
so remap the marker options when those names are real data. Disabling the
reference marker preserves actual JavaScript identity; cyclic output in that
mode is intentionally not JSON-serializable.

## STL export

`CjsStlFormat` writes shared geometry directly to binary or ASCII STL. The
writer consumes `mesh.vertex.position` and triangular `mesh.indices[].faces`;
multiple meshes and index groups are flattened in encounter order because STL
does not carry portable scene, material, skin, or animation structure.

```js
import { CjsStlFormat } from "@carbonenginejs/runtime-resource/formats/stl";

const bytes = CjsStlFormat.write(sharedGeometry, {
  binary: true,
  solidName: "ship_hull",
  scale: 1000,
  requireWatertight: true
});
```

Writes do not mutate the shared input. Facet normals are recalculated from
winding by default; set `recalculateNormals: false` to average valid vertex
normals. Degenerate triangles are skipped by default. Index values must be safe
integers within the position channel, and binary output rejects coordinates
outside float32 range instead of silently emitting infinities. The
`requireWatertight` option rejects open, non-manifold, inconsistently wound, or
degenerate output.

## MotherLode ownership

`CjsResMan` resolves each normalized path and build variant to one canonical
MotherLode key. `Insert(key, resource, options)` reports `{ inserted, replaced,
displaced }`; replacement, deletion, clearing, and shutdown destroy attached
adapter allocations and release the complete CPU payload by default. Callers
that deliberately retain ownership may pass `{ cleanup: false }` and keep the
returned displaced resource. If replacement cleanup fails, insertion throws a
contextual error and leaves the existing owner registered. These ordinary
ownership removals preserve the handle's last resource state; `PURGED` is
reserved for successful policy eviction through inactivity or byte pressure.

`Startup()` and `Shutdown()` are idempotent. `HasKey`, `Lookup`, `Delete`,
`GetKeys`, `GetValues`, `GetSize`, `SetCacheSize`, `GetCacheSize`, `GetStats`,
`TrimCache`, `ReplaceExpected`, `Clear`, and `ClearCached` provide the
Carbon-shaped cache vocabulary plus the exact-owner compare-and-swap required
by staged JavaScript reload. The old `Has`, `GetCount`, and `DeleteAll` names
remain temporary compatibility aliases.

Byte budgeting applies only to records explicitly admitted with
`{ cached: true, bytes }`; JavaScript reachability is never inferred. The byte
value is a caller-supplied safe-integer eviction weight, not a heuristic walk of
the resource graph. `TrimCache()` removes positive-byte cached identities in
oldest-admission order until `cacheBytes <= cacheSize`. Live, locked,
`cacheable: false`, and zero-byte entries do not create pressure. With default
cleanup, successful pressure eviction performs the same deterministic
payload/adapter cleanup as inactivity eviction and marks detached compatible
handles `PURGED`.

`SetCacheSize()` installs and immediately enforces a new budget. `Update()` and
`Tick()` retry cache housekeeping after pumping queues; `{ cache: false }`
skips it for one update. Cleanup failure leaves that candidate canonical,
continues through later candidates, and throws
`CJS_MOTHERLODE_CACHE_TRIM_FAILED` with a partial result.

`CjsResMan` binds resource-facing `KeepAlive`, `KeepPayloadAlive`, `Lock`, and
`Unlock` operations to the canonical key. Publishing a non-null payload renews
its independent lease; `GetPayload()`, `HasPayload()`, `IsGood()`, and other
queries remain pure. `PurgeInactive(options)` performs an explicit deterministic
sweep using independent identity and payload frame/time limits. Locks skip both
forms of eviction. Identity expiry cleans adapters and payloads, detaches the
handle, marks it `PURGED`, and removes it; payload expiry releases only the CPU
payload. A sweep never fetches, prepares, or reloads a resource.

Generic/base reader results participate in the same payload ownership: the
manager stores the complete result through `SetPayload()` and mirrors it on the
compatibility `object` property. Payload release clears that alias only while
it still identifies the released value. Concurrent object/readiness calls
share only their in-flight operation; settled promises are removed so evicted
graphs are collectible and failed operations can be explicitly retried. A
resident payload returns without rereading, while a released payload is rebuilt
only by an explicit `GetObject()` or `Ready()` call.

Source and parsed-format caches use explicit provenance. `sourceRevision` is an
opaque caller/source-supplied string or finite number identifying source
content for one source object and normalized path. It scopes read caches only;
it does not alter MotherLode/build identity, and changing it does not replace a
resident payload without `reload: true`.

`cacheSource` and `cacheFormat` are tri-state per-call policies:

- omitted: share in-flight or explicitly retained work, then drop a newly
  completed record;
- `true`: share and retain success; a joining caller upgrades the record;
- `false`: bypass sharing and retention.

Failures are never retained. Format records are additionally isolated by
selected source object, frozen registration descriptor, revision, and effective
format options. Re-registering a format with new defaults therefore cannot
reuse an old descriptor's parse. Registered defaults are copied into deeply
frozen plain-object/array snapshots. Material format options that cannot be
represented safely (for example class instances with hidden mutable state)
bypass format-cache sharing instead of risking a false match; functions and
byte views use cache-local identity plus visible byte content where applicable.

`reload: true` synchronously detaches every queued/source/format read record for
the selected source/path before fresh work starts. Existing consumers keep
their detached promises; reload does not abort them. Fresh success repopulates
only caches explicitly requested with `cacheSource: true` or
`cacheFormat: true`. `InvalidateReadCache(path, { source, sourceRevision })`
provides the same no-abort invalidation explicitly; omitting `sourceRevision`
removes all revisions for that source/path. `Delete()` remains canonical
resource-identity-only, while `Clear()` resets all read ledgers.

A resource loader retains the effective selected source and `sourceRevision`
for reconstruction, including the manager default selected at creation, but
not cache flags or one-shot reload.

Reload is candidate-first. When an owner already exists,
`GetResource(path, { reload: true })` returns a distinct off-registry candidate
without changing ordinary lookup. `Ready()` on that candidate, `GetObject()` /
`FetchResource()` with `reload: true`, and the explicit `ReloadObject()` /
`ReloadResource()` helpers all run the same queued contract:

1. purge-lock the exact former owner and invalidate reusable reads once;
2. read, prepare, and publish payload state only on the detached candidate;
3. require the newest per-key reload token and exact former ownership;
4. compare-and-swap the fully prepared candidate into MotherLode;
5. invalidate and clean the displaced handle after the lookup switch.

Source, format, or prepare failure therefore leaves the former handle, state,
payload, and adapters canonical; the failed candidate's attached payload and
adapters are cleaned and its original error is retained. An otherwise-
successful candidate that was superseded, deleted, cleared, or replaced rejects
with `CJS_RESMAN_STALE_RELOAD_CANDIDATE` and cannot resurrect the key. Failed
freshness attempts still invalidate reusable source/format records when their
work begins; the already-published canonical payload is not dependent on those
records. If displaced-owner cleanup fails after the swap,
the promise rejects with `CJS_MOTHERLODE_REPLACE_CLEANUP_FAILED`, whose result
explicitly reports `committed: true`; the good candidate remains canonical.

This deliberately differs from Carbon's `BlueAsyncRes::Reload`, which reloads
one stable handle in place and releases its old data before success. Existing
JavaScript references likewise are never silently retargeted: they keep the
displaced handle, while fresh lookup sees the committed candidate.

Every queued, direct, standalone, and candidate resource preparation captures the exact
MotherLode, canonical key, resource handle, and manager-local ownership
generation. Delete, Clear, reload replacement, or handle reinsertion makes old
work stale before it can enter another state/stage or publish. Otherwise-
successful obsolete work rejects with `CJS_RESMAN_STALE_RESOURCE_OPERATION`;
an obsolete source/stage failure preserves its original rejection while
suppressing `SetError()` on the detached handle.

Candidate work is a normal `Wait()` root and blocks synchronous MotherLode
replacement while active. MotherLode replacement otherwise remains synchronous
configuration and rejects with
`CJS_RESMAN_ACTIVE_RESOURCE_OPERATIONS` while queued or direct mutations are
active. `Wait()` drains queued roots; callers must separately await direct load
or direct prepare promises before retrying replacement. Started work is not yet
aborted, and arbitrary values returned by prepare stages still have no generic
external cleanup hook; only resources/adapters attached to the staged candidate
participate in deterministic candidate cleanup.

Automatic scheduling is available only when a caller supplies
`autoPurgePolicy` to the constructor/`Register()` or calls
`SetAutoPurgePolicy()`. It is disabled by default and deliberately accepts only
millisecond limits: MotherLode activity frames count explicit observations and
are not renderer frames. `Update()`/`Tick()` run a due sweep after queue pumps;
`{ purge: false }` skips it for one call. The first pump after configuration is
due immediately, then `intervalMilliseconds` limits cadence. Manager-owned
queued and direct resource work holds a balanced purge lock until completion.

```js
const resMan = new CjsResMan({
  source,
  autoPurgePolicy: {
    intervalMilliseconds: 1000,
    maxIdleMilliseconds: 60_000,
    payloadMaxIdleMilliseconds: 10_000
  }
});

resMan.Update();
```

Cache trimming and automatic inactivity sweeps retain the strict no-reload
rule. Application retention defaults, automatic resource/payload byte
estimation, separate CPU/adapter budgets, and purged-resource/device-loss
recovery policy remain later work.

## Queued load and staged prepare

`GetObject()`, `LoadObject()`, and resource `Ready()` use two manager-owned
queues:

```text
BACKGROUND: deduplicated source load, limited by maxConcurrentLoads
MAIN:       read -> configured prepare stages -> resource publication
```

Each main-queue stage is a separate item. `maxPrepareTime` is a per-pump budget
in seconds, and `maxPrepareItemsPerTick` can add an item-count limit. The
default scheduler keeps promise-based calls working; a `CjsLibrary` or direct
caller can provide its frame scheduler and default build behavior:

```js
const resMan = new CjsResMan({
  source,
  maxConcurrentLoads: 8,
  maxPrepareTime: 0.005,
  queueScheduler: callback => requestAnimationFrame(callback),
  preparePipelines: {
    cmf_test: {
      default: true,
      stages: [
        {
          name: "convert",
          prepare: (payload, context) => convertToCmf(payload, context)
        }
      ]
    }
  }
});

await resMan.FetchResource("res:/model/ship.gr2", {
  requirement: "geometry",
  preparePipeline: "cmf_test"
});
```

The library chooses the named pipeline from registered behavior and detected
capabilities. `CjsResMan` executes that request; it does not inspect WebGL,
WebGPU, texture, geometry, or codec support to select one. A request may
override the default with `preparePipeline` or append direct `prepareStages`.

Blue-compatible queue controls are exposed directly on `CjsResMan`:
`AddToQueue`, `CancelFromQueue`, `GetNextIdForQueue`,
`PumpMainThreadQueue`, `PauseQueue`, `ResumeQueue`, `GetPendingLoads`, and
`GetPendingPrepares`. `Update()`/`Tick()` pump work. `Wait()` synchronously
captures queued resource-operation roots and low-level queue tasks that already
exist when it is called. Captured resource roots include
prepare descendants enqueued later; unrelated later roots/tasks do not postpone
the fence. Failure and queued cancellation count as settlement and remain
observable through their original operation promises.

By default `Wait()` pumps the two queues directly within their ordinary budgets
and never runs automatic purge housekeeping. It preserves pause state;
`{ pump: false }` leaves all progress to an external driver. A standalone
canonical `PrepareResourceObjectQueued()` call is a queued root. Direct
`LoadResourceObject()`, direct `PrepareResourceObject()`, standalone
`ReadResource()`, and standalone `ReadFormatOnce()` calls bypass both queues
and are outside this fence unless they own a captured queue task, although
direct resource mutations are still tracked for safe MotherLode replacement.
`WaitUrgent()` remains deferred until the queue has real per-item priority and
urgent-membership semantics.

Format classes own input extensions. Resource classes are registered by a
semantic requirement, never by file extension:

```js
const resMan = new CjsResMan().Register({
  source,
  formats: [ CjsDdsFormat, CjsPngFormat ],
  resourceTypes: [ TriTextureRes, Tr2ImageRes ]
});

const texture = resMan.GetResource("res:/image/ship.png", {
  requirement: "texture",
  emit: "image"
});
const image = resMan.GetResource("res:/image/ship.png", {
  requirement: "image",
  emit: "image"
});
```

Those are distinct resource identities but share the normalized source-byte
operation. The manager does not expose an extension-to-resource compatibility
registry.

Texture-array resources expose one ordinary-looking proxy per ordered layer:

```js
const textureArray = new CjsTextureArrayRes({
  paths: [
    "res:/detail1.dds",
    "res:/detail2.dds",
    "res:/detail3.dds"
  ],
  layerNames: [ "Detail1Map", "Detail2Map", "Detail3Map" ],
  updateScheduler: resource => frameQueue.add(resource)
});

const detail2 = textureArray.GetLayerParameter(1);
detail2.SetValue("res:/replacement.dds");

detail2.textureRes === textureArray; // true
```

Proxy setters only update their source path and invalidate the parent. The
parent is scheduled once even if several proxies change in the same frame.
The next-frame consumer calls `Update()` or `ConsumeUpdateRequest()` to obtain
one immutable ordered snapshot. Runtime-resource does not know which shader
metadata caused the aggregate request; shader packages and engine adapters map
public parameter names to layer indices.

Public effect parameters remain separate from these internal proxies. Their
authored paths and individual 2D source resources are not replaced by the
aggregate. An engine-owned, non-persisted bridge mirrors public changes into
the fixed internal layers.

Consumed snapshots are explicit in-flight generations. An adapter either
publishes the current candidate atomically, requeues retryable work, or records
failure:

```js
const request = textureArray.ConsumeUpdateRequest();

try {
  const candidate = await adapter.PrepareTextureArray(request);
  const result = textureArray.CommitPreparedAdapterRevision(
    request.revision,
    "webgpu",
    candidate
  );

  // A rejected/stale candidate is destroyed by the commit method by default.
  // The adapter owns disposal of a successfully displaced allocation.
  result.displaced?.destroy();
} catch (error) {
  textureArray.FailUpdateRequest(request.revision, error, { retry: true });
}

await textureArray.Ready(); // the generation requested at call time
```

`SetLayerResource()` attaches a resolved source without rewriting the logical
requested path. `TouchLayer()` invalidates an in-place source revision.
`RetryUpdateRequest()` restores consumed work, and `HandleAdapterLoss()` drops
an unusable adapter allocation and schedules a complete topology rebuild.
Topology-changing snapshots set `topologyChanged: true` and report only valid
current layer indices in `dirtyLayers`.

## Development

Install dependencies and run the non-interactive baseline checks from the
repository root:

```sh
npm install
npm run lint
npm run check
npm test
```

`npm run check` builds the consumer package and proves that decorator metadata
matches between authoring source and built output. `npm test` additionally runs
the complete GPU-free unit suite; it requires no private assets, credentials,
network access, browser, or GPU after dependencies are installed.

See [Runtime Resource Lifecycle](resource-lifecycle.md) for state, retention,
and texture-array generation contracts. See
[Format ownership and fork provenance](FORMAT-PROVENANCE.md) for copied-reader
ownership, licenses, exclusions, and the deferred GR2 migration. Both documents
ship with the published package.

## Provenance

CarbonEngine and Fenris Creations (CCP Games) are named for interoperability
and provenance context. This package contains CarbonEngineJS original resource
infrastructure, CarbonEngine-shaped resource ports, and maintained copies of
the non-shader readers identified in `FORMAT-PROVENANCE.md`. It does not copy
Fenris Creations game assets, proprietary documentation, or shader source.
CarbonEngine and historical JavaScript implementations were used as the
behavioral references described in the package notices.

This project is not affiliated with, endorsed by, or sponsored by CCP Games or
CCP ehf. EVE Online and related marks remain the property of their respective
owners.
