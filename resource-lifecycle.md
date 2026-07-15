# Runtime Resource Lifecycle

This note records how Carbon/ccpwgl resource loading maps to
`runtime-resource`.

## Carbon and ccpwgl

Carbon's resource model separates load from prepare. The source schemas expose
resource classes through `BlueAsyncRes`, and Carbon notes distinguish background
load work from main-thread/device prepare work.

ccpwgl makes that split visible in `Tw2Resource`:

```text
NO_INIT -> REQUESTED -> LOADED -> PREPARED
```

Additional terminal or cleanup states include `ERROR`, `UNLOADED`, and `PURGED`.

The important behavior is:

- `Tw2ResMan.LoadResource()` requests a resource.
- The raw fetch resolves.
- `Tw2Resource.OnLoaded()` marks bytes or source data as loaded.
- The resource is queued for prepare.
- The manager tick later calls `res.Prepare(data)`.
- The concrete resource calls `OnPrepared()` after prepare work succeeds.

Some ccpwgl concrete `Prepare()` implementations also create WebGL objects.
That is a historical engine/runtime coupling, not the boundary we want in
CarbonEngineJS.

## CarbonEngineJS

`runtime-resource` owns the GPU-free half:

```text
EMPTY -> REQUESTED/LOADING -> LOADED
```

Engine adapters own device realization:

```text
LOADED -> PREPARING -> PREPARED
```

Current state meanings:

- `EMPTY`: resource identity exists, but no payload has been read.
- `REQUESTED`: reserved for queued or scheduled load work.
- `LOADING`: source read and format/object loading is active.
- `LOADED`: CPU payload, DTO, or hydrated object graph exists.
- `PREPARING`: an engine adapter is realizing backend-owned resources.
- `PREPARED`: preparation completed successfully and the resource is usable.
- `FAILED`: load or prepare failed.
- `UNLOADED`: resource payload was released.
- `PURGED`: resource was purged from active ownership.

`CjsResMan.LoadObject()` currently performs source reads immediately and does not
yet implement ccpwgl-style queued raw loads or prepare budgets. For that reason
it moves a resource from `LOADING` to `LOADED`, then stops. It must not mark the
resource `PREPARED` or `GOOD`, because no engine adapter has performed backend
preparation.

## Texture Array Generations

`CjsTextureArrayRes` is a derived multi-source resource with an explicit
requested/prepared revision boundary:

```text
proxy/source change
    -> requested revision + dirty layer
    -> one scheduled next-frame snapshot
    -> consumed/in-flight request
    -> adapter candidate preparation
    -> guarded adapter + prepared-revision publication
```

`ConsumeUpdateRequest()` produces an immutable snapshot and marks that revision
in flight. A current consumed revision may be completed through
`CommitPreparedAdapterRevision()`, failed through `FailUpdateRequest()`, or
returned to the queue through `RetryUpdateRequest()`. Commit-before-consume and
stale commits are rejected; rejected candidate allocations are destroyed by
default.

Publication installs the adapter allocation and prepared revision before
completion events run. The result returns the displaced allocation to the
adapter owner for post-publication destruction. A reentrant source change may
therefore request a newer revision without allowing stale completion to replace
it. The previous prepared allocation and `IsGood()` remain usable while a
replacement is pending or if replacement preparation fails.

`Ready()` is specialized for this derived resource: it resolves when the
generation requested at call time has been published, rather than delegating
to a single-source object loader. Initial preparation failure rejects it.

Logical paths and resolved sources are independent. Attaching a redirected or
LOD-specific source does not rewrite persistence. `TouchLayer()` represents an
in-place source revision, and `HandleAdapterLoss()` invalidates the complete
topology after destroying an unusable adapter allocation. Topology snapshots
report an explicit `topologyChanged` flag and contain only valid current dirty
layer indices.

## Missing Runtime Manager Work

`CjsResMan` and `CjsMotherLode` are intentionally thin today. They do not yet
cover several browser/runtime concerns that ccpwgl handles:

- queued source/object loading
- max concurrent load limits
- per-frame prepare budgets
- pending-load tracking
- `KeepAlive()` style active-frame updates
- automatic purge windows for inactive resources
- reload policy
- browser-aware source behavior such as fetch response type selection

## Memory Retention and Purging

ccpwgl keeps every resource in `Tw2MotherLode` until it is explicitly cleared or
auto-purged. Each resource has:

- `activeFrame`: last frame the resource was considered in use.
- `doNotPurge`: a lock counter/flag for resources that must stay resident.
- `KeepAlive()`: updates `activeFrame` and reloads an unloaded/purged resource
  if it is touched again.

The manager advances an `activeFrame` counter on a cadence, and
`Tw2MotherLode.PurgeInactive()` unloads resources whose `activeFrame` is old
enough. It then marks them purged and removes them from the cache. In ccpwgl,
`IsGood()` also calls `KeepAlive()`, so many read/check paths implicitly keep
resources resident.

That model works for ccpwgl, but CarbonEngineJS should be more explicit:

- `IsGood()`, `IsPrepared()`, and `HasLoaded()` should stay pure state checks.
- `KeepAlive()` or `Touch()` should be the explicit liveness operation.
- `Lock()` / `Unlock()` should prevent automatic purge, probably with a lock
  count rather than a boolean.
- resources should track `lastUsedFrame` or `lastUsedTime`, not rely on boolean
  state alone.
- `CjsMotherLode` should support purge scanning without forcing all resources to
  be held forever by accidental cache references.
- `Unload()` should release engine adapter resources and optionally CPU payloads.
- `Purge()` should remove the resource from the cache after unload/cleanup.

The JS/browser split adds one more axis that ccpwgl blurs: CPU payload memory and
GPU/device memory are different budgets. A large decoded image, geometry buffer,
or shader graph can be expensive even before an engine adapter prepares it.
Runtime-resource should therefore support separate retention policy for:

- resource identity: path, extension, state, error summary, lightweight metadata.
- CPU payload: DTOs, hydrated object graphs, decoded typed arrays.
- adapter payload: WebGL/WebGPU textures, buffers, shader modules, pipelines.

A sane default would keep resource identity and lightweight metadata while
allowing CPU payloads and adapter payloads to be released independently. Engine
adapters should own adapter-resource destruction, but `runtime-resource` can
provide lifecycle hooks and opaque adapter slots so the adapter has a consistent
place to clean up.

### DTO Retention Contract

DTOs are transient semantic payloads, not the resource itself. A DTO may contain
more decoded data than a particular resource or engine adapter needs. The
resource should retain the scalars and references it requires; an adapter may
retain additional references in adapter-owned state. Referencing DTO-owned typed
arrays is valid and preferable to copying them merely to change ownership.

The target lifecycle treats resource residency and DTO residency independently:

```text
resource.KeepAlive()
    -> renew resource/cache residency

resource.KeepDTOAlive()
    -> renew the attached DTO lease

resource.ReleaseDTO()
    -> explicitly release the full DTO reference
```

`ReleaseDTO()` is implemented; `KeepDTOAlive()` remains target behavior.
`GetDTO()` and `HasDTO()` should remain pure queries; reading the DTO
must not implicitly renew its lease.

The processor preparing a resource decides when the full DTO can be released:

```text
format reader -> DTO -> resource apply + adapter prepare
                            |
                            +-> resource retains required values/references
                            +-> adapter retains adapter-specific state/references
                            +-> release DTO after successful preparation
                            `-> or renew its lease for deferred/further work
```

A time-based lease is a fallback against abandoned DTOs. An owner performing
deferred work can renew the lease. If the DTO has expired and is required again,
the manager reloads the source and reconstructs it. Dynamic or non-reloadable
resources must retain or be able to recreate any payload they still require.

DTO references are shared read-only by default. Preparing WebGL and WebGPU
adapters side by side should normally pass the same DTO to both consumers and
retain it until both have finished. Copying is an explicit consumer operation,
justified when a consumer must mutate data, transfer and detach an `ArrayBuffer`,
or retain an independently writable snapshot. The consumer should copy only the
fields it requires; runtime-resource should not automatically deep-clone entire
DTOs or typed-array bundles. Any full-copy operation should be DTO/format-aware
rather than a generic resource-side clone.

Open design questions:

- Should `Unload()` drop only adapter payloads by default, or CPU payloads too?
- Should there be explicit `UnloadAdapterResources()`, `UnloadPayload()`, and
  `Purge()` phases?
- Should loaded CPU payloads have a byte-size estimate so the purge policy can
  be memory-budget based instead of only time/frame based?
- Should manually attached/dynamic resources default to locked, like ccpwgl's
  manual shader resources use `doNotPurge`?
- Should `KeepAlive()` reload purged resources, or should reload be an explicit
  `Reload()` call to avoid surprising browser/network work?

ccpwgl's raw event emitter shape is useful. The part we should not copy is the
separate resource notification/callback compatibility layer that sits beside
events. CarbonEngineJS exposes one small event-emitter API and avoids short
generic names such as `On`, `Once`, `Off`, and `Emit` on Carbon-shaped classes.
`CjsEventEmitter` is a separate base class so non-model runtime services can
extend it without extending `CjsModel`; `CjsResMan` already uses that path.

The API stays deliberately direct:

- `AddEvents(events)`
- `OnEvent(eventName, listener, source?)`
- `OnceEvent(eventName, listener, source?)`
- `OffEvent(eventName = "*", listener?, source?)`
- `EmitEvent(eventName, ...args)`
- `HasEvent(eventName = "*", listener?, source?)`
- `ClearEvent(eventName = "*")`
- `GetEventNames()` and `GetEventListenerCount(eventName = "*")`

The optional `source` is the callback's `this` value and an explicit matching
identity for removal. Mutating event methods return the emitter for chaining.
There are no listener scopes, subscription handles, owner-side `ListenTo()`
helpers, or parallel resource notification callbacks.

Event names are normalized to lowercase and dispatched by exact match. Resource
classes may emit their own state or domain events, but the emitter does not
invent a resource lifecycle contract.

Event memory rules matter as much as event names. Event storage is the optional
`events` member of the emitter's non-enumerable `__state` object. It is created
only when the first listener is registered and deleted when the last record is
removed. That does not make listeners weak. As long as an emitter is reachable,
its event map strongly references listener functions and sources, and those
listeners can keep whole scene/resource graphs alive.

CarbonEngineJS event emitters should therefore follow these rules:

- `OnceEvent()` should remove the listener before or immediately after the first
  callback, even if the callback throws.
- `OffEvent(eventName, listener, source)` must remove the exact listener/source
  entry.
- an external party that no longer observes a target must call `OffEvent()`;
  `target.OffEvent("*", null, source)` removes all of that source's records.
- `Unload()` and `Purge()` are resource state/cache operations, not an implied
  listener-destruction lifecycle.
- `OnEvent()` returns the emitter, ccpwgl-style. It does not return unsubscribe
  closures because those closures create another reference path.
- event payload history is not stored.
- we should prefer deterministic cleanup over `WeakRef`/`FinalizationRegistry`;
  those can help diagnostics, but they are not a lifecycle contract.

The target is "easy to debug, hard to leak": clear ownership of who subscribed,
who unsubscribes, and which cleanup phase clears all remaining listeners.

The event data model is deliberately small:

```text
emitter.__state (non-enumerable, allocated only when some subsystem needs it)
  events -> eventName -> Set<listenerRecord>

listenerRecord
  emitter
  eventName
  listener
  source
  once
```

The event map is allocated only when the first listener is registered. If the
emitter becomes unreachable, its state and event records can be collected with
it. While the emitter remains reachable, listener functions and sources are
strongly retained until `OffEvent()`, `ClearEvent()`, once dispatch, or emitter
collection. Multiple listeners on the same event are allowed because each event
bucket is a set of records. A raw `CjsEventEmitter` does not gain model-owned
`dirty` or `rebuild` state.

This is as far as the event system should go for now:

- lowercase exact event names only.
- no wildcard listener dispatch.
- wildcard names are accepted only by lookup and cleanup methods.
- no listener scope or subscription-object layer.
- no separate resource notification/callback compatibility layer.
- no `family.event` or ancestor routing.
- no event history by default.
- no global master event manager.
- debugging introspection should stay limited to counts and names unless a real
  use case appears.

`CjsModel` has dirty-state helpers (`MarkDirty`, `ClearDirty`, `ConsumeDirty`,
`GetDirtyNotifications`) for model invalidation. `SetValues()` compares incoming
values with the current field values and only marks dirty when a value actually
changes. A plain `MarkDirty()` means broad dirty invalidation; it does not request
a rebuild. Deferred rebuild reasons belong to the independent
`model.__state.rebuild` set. This is not a resource lifecycle event system.
Resource lifecycle events should therefore remain a resource/resman concern.

## Why We Diverge

The Carbon and ccpwgl resource classes live inside an engine that can prepare
GPU objects directly. CarbonEngineJS keeps the format/resource layer reusable by
stopping before GPU work:

- `runtime-resource` selects and runs registered non-shader readers, then can
  directly hydrate the requested runtime class or return another requested
  outcome.
- `runtime-resource` stores lifecycle state, cache entries, and loaded object
  payloads. DTOs are normally transient prepare inputs; the resource or adapter
  retains only what it requires, by reference or by explicit copy.
- Frozen standalone non-shader `format-*` packages remain compatibility
  distributions. GR2 and all shader formats remain separate packages for now.
- engine packages create WebGL/WebGPU textures, buffers, shader modules,
  pipelines, and bind groups from loaded resources.

This gives us the Carbon lifecycle shape without forcing WebGL/WebGPU imports or
device decisions into `runtime-resource`.
