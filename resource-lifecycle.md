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
- `REQUESTED`: the resource is waiting on a queued or shared source load.
- `LOADING`: source bytes are available and staged object preparation is active.
- `LOADED`: CPU payload or hydrated object graph exists.
- `PREPARING`: an engine adapter is realizing backend-owned resources.
- `PREPARED`: preparation completed successfully and the resource is usable.
- `FAILED`: load or prepare failed.
- `UNLOADED`: resource payload was released.
- `PURGED`: an inactivity or recorded-byte cache policy evicted the resource
  from active ownership. Ordinary replacement, `Delete()`, `Clear()`,
  `ClearCached()`, and shutdown clean owned payloads/adapters but preserve the
  detached handle's last valid state.

`CjsResMan.LoadObject()` now queues one deduplicated background source operation
per source/path and limits active source operations with `maxConcurrentLoads`.
After bytes arrive, object construction is split into separate main-queue
items:

```text
read -> registered/requested prepare stage 1 -> stage 2 -> ... -> publish
```

`maxPrepareTime` limits seconds spent starting synchronous main-queue work in
one pump, and `maxPrepareItemsPerTick` can add a count limit. Promise-returning
stages remain in flight without blocking the JavaScript event loop. Publication
moves the resource to `LOADED`, then stops. It must not mark the resource
`PREPARED` or `GOOD` unless an explicitly supplied preparation stage has
actually completed backend realization and marked it accordingly.

Named pipelines are registration/configuration, not capability policy.
`CjsLibrary` or a direct caller determines the required output and selects a
registered `preparePipeline`; `CjsResMan` executes the supplied stages without
probing device support. Per-request `prepareStages` are explicit overrides.

Every requested handle captures an immutable build plan before MotherLode
lookup. The plan owns the selected resource constructor, direct loader or
candidate format descriptors, defaults, and reader functions; named pipeline
version and stages; and snapshotted material options. Plain objects/arrays use
frozen value semantics; functions and opaque instances use process-local
identity. `buildKey` and `buildVersion` are the explicit escape hatch for caller-owned recipes whose
retained functions/instances change behavior without changing JavaScript
identity. Registering a replacement reader or pipeline creates a different
identity for later requests. Existing handles retain their former plan for
payload reconstruction.

This closes the immutable/versioned build-key part of the active plan with a
smaller ownership seam than originally proposed: CjsLibrary keeps named
behavior and capability selection, while CjsResMan snapshots only the resolved
execution recipe. There is no second behavior registry in ResMan and no
persistent/public arbitrary-object hash. Source/revision/cache/reload/queue
controls stay per operation and outside build identity.

The Blue method names remain the public queue vocabulary: `AddToQueue`,
`CancelFromQueue`, `GetNextIdForQueue`, `PumpMainThreadQueue`, `PauseQueue`,
`ResumeQueue`, `GetPendingLoads`, and `GetPendingPrepares`. `Update()`/`Tick()`
pump queues. `Wait()` snapshots queued resource-operation roots and already
submitted low-level queue tasks before its first await. Captured roots remain
open through dynamically enqueued descendant stages, publication/failure, and
lock release; later unrelated roots/tasks are excluded. Failure and queued
cancellation cross the fence without making `Wait()` reject.

The default wait pumps only the two queues, never automatic retention sweeps,
and honors existing pause state and budgets. `{ pump: false }` requires an
external driver. A standalone canonical `PrepareResourceObjectQueued()` call
opens a queued root. Direct `LoadResourceObject()`, direct
`PrepareResourceObject()`, and standalone source/format reads bypass both
queues and are outside the fence. They are still tracked as active mutations
so synchronous MotherLode replacement cannot detach them. `WaitUrgent()`
remains open until real per-item priority and urgent membership exist.

## CjsLibrary resource-path workflow

The normal direct resource-path flow is:

```text
Application / runtime object
        |
        | requests "res:/model/ship.gr2"
        | with optional per-request overrides
        v
+-----------------------------------------------+
| CjsLibrary                                    |
|                                               |
| - starts from registered default behavior     |
| - considers registered capability reports     |
| - chooses requirement / emit / pipeline       |
| - applies explicit request overrides          |
+-----------------------------------------------+
        |
        | path + resolved request options
        v
+-----------------------------------------------+
| CjsResMan.GetResource(path, options)          |
|                                               |
| - normalize path and extension                |
| - snapshot constructor / reader / pipeline    |
| - calculate immutable build variant           |
+-----------------------------------------------+
        |
        v
+-----------------------------------------------+
| CjsMotherLode.Lookup(resolved key)             |
+-----------------------------------------------+
        |
        +--- cache hit ------------------------------+
        |                                             |
        |    reuse the CjsResource and any active     |
        |    load/build operation                     |
        |                                             |
        `--- cache miss -----------------------------+
              |                                       |
              | resolve class from requirement        |
              | construct + Initialize()              |
              | insert into CjsMotherLode              |
              v                                       |
        new CjsResource -------------------------------+
        |
        | Ready() / GetObject()
        v
+===============================================+
| BACKGROUND LOAD QUEUE                         |
|                                               |
| - mark resource REQUESTED                     |
| - share one source operation per source/path  |
| - obey maxConcurrentLoads                     |
| - source.Read(path)                           |
+===============================================+
        |
        | source bytes
        v
+===============================================+
| MAIN PREPARE QUEUE                            |
|                                               |
| every box below is a separately budgeted item |
+===============================================+
        |
        v
+-----------------------------------------------+
| Read stage                                    |
|                                               |
| captured object loader for extension?         |
|   yes -> call it                              |
|   no  -> resolve within captured formats by   |
|          bytes + request options               |
+-----------------------------------------------+
        |
        | plain payload / hydrated object
        v
+-----------------------------------------------+
| Optional configured prepare stages            |
|                                               |
| stage 1 -> stage 2 -> ...                     |
| examples: normalize, convert, adapt           |
+-----------------------------------------------+
        |
        | no configured stages skips this box
        v
+-----------------------------------------------+
| Publish stage                                 |
|                                               |
| semantic resource -> SetPayload(payload)      |
| generic resource  -> SetPayload(value)        |
|                      object aliases payload   |
+-----------------------------------------------+
        |
        +--- validation failure --------------------+
        |                                            |
        |    resource -> FAILED                      |
        |    Ready() rejects                         |
        |                                            |
        `--- publication succeeds -----------------+
                    |
                    | resource -> LOADED
                    v
             CjsLibrary returns
             the built CjsResource/object
```

Device realization is a separate continuation selected outside ResMan:

```text
CjsResource LOADED
        |
        | selected engine adapter
        v
PREPARING -> attach opaque adapter resource -> PREPARED
```

With no named or direct prepare stages, the main queue reduces to:

```text
extension object-loader/format read -> validate -> publish
```

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

## Remaining Runtime Manager Work

The first load/prepare queue slice is implemented. `CjsResMan` and
`CjsMotherLode` still do not cover several browser/runtime concerns that
ccpwgl handles:

- prepare priority and starvation policy
- cancellation/abort propagation for work that has already started
- `WaitUrgent()` after real priority and bounded fairness
- queue-time and stage-time telemetry
- immutable/versioned build identity
- application-level default retention policy selection
- automatic resource/payload byte estimation and separate CPU/adapter budgets
- explicit purged-resource reconstruction and device-loss recovery policy
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

That model works for ccpwgl, but CarbonEngineJS is deliberately more explicit:

- `IsGood()`, `IsPrepared()`, and `HasLoaded()` remain pure state checks.
- `KeepAlive()` and `KeepPayloadAlive()` are the explicit liveness operations.
- `Lock()` / `Unlock()` maintain a non-underflowing count and prevent identity
  and payload eviction during a sweep.
- MotherLode tracks separate identity and CPU-payload frame/time observations.
- `CjsMotherLode.PurgeInactive()` itself scans only when explicitly requested
  and never infers JavaScript reachability. `CjsResMan.Update()` may request it
  only under an explicitly configured automatic policy.
- `Unload()` should release engine adapter resources and optionally CPU payloads.
- A resource-level `Purge()`/`Reload()` vocabulary remains future policy work.

### Recorded-Byte Cache Contract

Carbon can infer when only its cache retains a resource through weak-reference
and refcount transitions. JavaScript cannot reproduce that ownership test
reliably, so `CjsMotherLode` budgets only entries that a caller explicitly
classifies with `{ cached: true, bytes }`. The byte value is an exact
caller-supplied safe-integer eviction weight; runtime-resource does not walk
arbitrary cyclic/shared object graphs or invoke payload getters to guess size.

Explicit cached entries receive a monotonic admission sequence.
With its default cleanup, `TrimCache(options)` destroys adapters, releases
payloads, detaches lifecycle callbacks, marks compatible handles `PURGED`, and
removes positive-byte entries oldest-first until `cacheBytes <= cacheSize`.
Live, locked, non-cacheable, and zero-byte entries do not create byte pressure.
`KeepAlive()` and `Lock()` promote a cached record to live; `Unlock()` does not
silently re-admit it.

`SetCacheSize(bytes, options)` installs and immediately enforces the new budget.
`CjsResMan.Update()` / `Tick()` also run cache housekeeping after queue pumping;
`{ cache: false }` skips one update without changing policy. Cleanup is
transactional per identity: a failed candidate remains canonical, later
candidates are still attempted, and the aggregate
`CJS_MOTHERLODE_CACHE_TRIM_FAILED` error carries successful evictions and any
remaining over-budget state. Trimming never reads, prepares, or reloads data.

The JS/browser split adds one more axis that ccpwgl blurs: CPU payload memory and
GPU/device memory are different budgets. A large decoded image, geometry buffer,
or shader graph can be expensive even before an engine adapter prepares it.
Runtime-resource should therefore support separate retention policy for:

- resource identity: path, extension, state, error summary, lightweight metadata.
- CPU payload: plain reader/converter objects, hydrated object graphs, decoded
  typed arrays.
- adapter payload: WebGL/WebGPU textures, buffers, shader modules, pipelines.

A sane default would keep resource identity and lightweight metadata while
allowing CPU payloads and adapter payloads to be released independently. Engine
adapters should own adapter-resource destruction, but `runtime-resource` can
provide lifecycle hooks and opaque adapter slots so the adapter has a consistent
place to clean up.

### Payload Retention Contract

Reader and converter outputs are plain transient payload objects, not resource
classes or DTO models. A payload may contain more decoded data than a particular
resource or engine adapter needs. Each concrete resource validates the fields
it requires before publishing the payload and retains the scalars and references
it needs. An adapter may retain additional references in adapter-owned state.
Referencing payload-owned typed arrays is valid and preferable to copying them
merely to change ownership.

The lifecycle treats resource residency and payload residency independently:

```text
resource.KeepAlive()
    -> renew resource/cache residency

resource.KeepPayloadAlive()
    -> renew the attached payload lease

resource.ReleasePayload()
    -> explicitly release the full payload reference
```

`CjsResMan` binds resource-facing `KeepAlive()`, `KeepPayloadAlive()`, `Lock()`,
and `Unlock()` to the resource's canonical MotherLode key. `SetPayload()` renews
both identity and payload activity when it publishes a non-null payload.
`GetPayload()` and `HasPayload()` are pure queries; reading the payload does not
implicitly renew its lease. Detached and purged handles retain deterministic
no-op liveness methods rather than silently starting work.

Both semantic and generic/base resource results use that payload slot. A base
resource also mirrors its payload on the compatibility `object` property;
`ReleasePayload()` clears the alias only when it still references that exact
payload. Semantic resources continue to expose `object === resource` while
holding their validated plain payload privately.

Object-operation promises are retained only while in flight. Concurrent
`GetObject()`/`Ready()` calls share one operation; a resident result is returned
without source work and renews the explicit payload lease. Settlement removes
the operation record so its result graph can be reclaimed and a failure can be
retried. After payload release, only a new explicit object/readiness call
reconstructs it; queries, lease calls, and purge sweeps do not.

Read-cache provenance is explicit and separate from resource/build identity.
For a selected source object and normalized path, `sourceRevision` is an opaque
caller/source-supplied string or finite-number content token. Source and format
records do not share across revisions. Format records are additionally isolated
by source object, frozen registration descriptor, and effective format options,
so another source or a re-registered default cannot reuse a stale parse.
Registered defaults are deeply snapshotted for supported plain-object/array
configuration. Requests containing option values that cannot be represented
safely bypass parsed-format sharing instead of accepting an ambiguous key.

`cacheSource` and `cacheFormat` use the same per-call tri-state contract:
omitted shares existing in-flight/retained work but drops a newly completed
record; `true` retains success and upgrades joined work; `false` bypasses both
sharing and retention. Failures are never retained. Resource loaders capture
the effective selected source (including the creation-time manager default)
and revision for later reconstruction, but do not capture cache flags or
one-shot reload.

`reload: true` detaches all queued/source/format records for the selected
source/path when fresh candidate work begins. `InvalidateReadCache()` exposes
explicit path invalidation, optionally restricted to one revision. Detachment
never aborts or rejects existing consumers and never touches MotherLode or the
already-published canonical payload. `Delete()` remains resource-identity-only;
`Clear()` resets all read ledgers. A failed reload preserves the former payload
but does not restore reusable read-cache entries detached by its explicit
freshness request.

### Candidate-First Atomic Reload

When an owner already exists, `GetResource(path, { reload: true })` constructs
and initializes a distinct off-registry candidate. Ordinary `Lookup()` remains
on the former resource. Calling `Ready()` on the candidate, using
`GetObject()` / `FetchResource()` with `reload: true`, or calling the explicit
`ReloadObject()` / `ReloadResource()` helpers starts one shared candidate
operation.

The manager captures the exact MotherLode, key, former handle, former ownership
generation, and a newest-request token. It purge-locks the former owner and
tracks the candidate as a normal `Wait()` root. Reader, prepare, and publication
stages mutate only the detached candidate and validate candidate authority
before and after asynchronous boundaries. A fully prepared candidate commits
through `CjsMotherLode.ReplaceExpected()` only if the exact former owner and
newest token still match. The final authority callback and exact-record check
run immediately before the synchronous map switch, with no user cleanup or
`await` between the comparison and publication.

After the switch, the displaced ownership generation is invalidated, the
candidate receives ordinary lifecycle/reconstruction callbacks, and the former
handle is cleaned exactly once. Existing JavaScript references are not
retargeted; fresh lookup returns the new handle. Source, format, or prepare
failure leaves the exact former state, payload, and adapters canonical, retains
its original error, and cleans payload/adapters attached to the never-canonical
candidate. An otherwise-successful candidate that was superseded, deleted,
cleared, or replaced rejects with `CJS_RESMAN_STALE_RELOAD_CANDIDATE` and cannot
resurrect the key. Constructors that return the former singleton are rejected
before `Initialize()` can mutate it because staging requires a distinct handle.

Cleanup errors have explicit sides. Candidate cleanup failure aggregates with
the original preparation/stale error as
`CJS_RESMAN_RELOAD_CANDIDATE_CLEANUP_FAILED` while the former owner remains
canonical. A displaced-owner cleanup failure occurs after publication and
rejects as `CJS_MOTHERLODE_REPLACE_CLEANUP_FAILED` with a result where
`committed === true`; the already-good candidate remains canonical.
Started-work abort and a generic cleanup hook for arbitrary external values
returned by stages remain separate work.

This availability contract intentionally differs from Carbon.
`BlueAsyncRes::Reload` cancels/joins work, releases dependent cached data, and
reloads the same canonical object in place; failure can therefore leave that
stable handle bad. Carbon MotherLode replacement also switches immediately and
has no prepare-success gate or rollback. Runtime-resource instead preserves the
last published good handle until a distinct candidate has succeeded.

Every canonical queued/direct/standalone preparation captures an immutable
publication authority: exact MotherLode, canonical key, resource handle, and a
manager-local ownership generation. The manager validates that authority
before and after state changes, every asynchronous stage, and publication.
Delete, Clear, successful reload commit, or exact-handle reinsertion therefore makes
older work reject with `CJS_RESMAN_STALE_RESOURCE_OPERATION` before it can
publish. If stale work independently rejects, its original source/stage error
is preserved and `SetError()` is suppressed on the detached handle.

`Register({ motherLode })` rejects with
`CJS_RESMAN_ACTIVE_RESOURCE_OPERATIONS` while queued or direct mutations are
active, including a reload candidate. Normal `Wait()` drains queued roots and
candidate lineages; a direct caller must await its own load/prepare promise
before retrying replacement. Canonical and candidate authority prevent late
publication, but started-work abort remains separate. Arbitrary unattached
stage-returned values are dropped for GC because no generic external-resource
cleanup hook exists yet.

An explicit `PurgeInactive()` sweep accepts separate frame/time limits for
identity and payload residency. Identity expiry destroys adapter resources,
releases the payload, detaches lifecycle callbacks, marks compatible handles
`PURGED`, and removes the canonical key. Payload expiry calls
`ReleasePayload()` while retaining identity and adapter allocations. Locks skip
both operations, and candidate failures are aggregated after the sweep has
continued over other entries.

`CjsResMan` also exposes opt-in automatic scheduling through
`SetAutoPurgePolicy()` or the `autoPurgePolicy` registration option. It is
disabled by default. Automatic policy is time-only because MotherLode's current
activity frame counts observations rather than renderer frames. A policy must
set at least one of `maxIdleMilliseconds` or
`payloadMaxIdleMilliseconds`; `intervalMilliseconds` defaults to 1000. The
first `PumpAutoPurge()`/`Update()` after configuration sweeps immediately, then
the interval sets the minimum cadence. `Update({ purge: false })` suppresses a
sweep for one update without changing cadence. A regressing clock rebases and
skips one pump; custom deterministic clocks should be shared with MotherLode.
Recorded-byte cache trimming is separate from this opt-in inactivity policy and
runs on ordinary updates unless `{ cache: false }` is supplied.

Both queued `QueueResourceObject()` work and direct `LoadResourceObject()` work
hold one manager-owned lock from request/loading publication through success or
failure. The lock is balanced independently of caller locks, so automatic or
manual sweeps cannot detach a handle while its read/prepare operation is still
active. Lock release is conditional on the same captured ownership generation,
so stale work cannot decrement a newly rebound handle's lock. Scheduling and
active-work protection do not fetch or reload data.

The processor preparing a resource decides when the full payload can be
released:

```text
format reader -> plain payload -> resource validation + adapter prepare
                                   |
                                   +-> resource retains required values/references
                                   +-> adapter retains adapter-specific state/references
                                   +-> release payload after successful preparation
                                   `-> or renew its lease for deferred/further work
```

A time- or frame-based lease is a fallback against abandoned payloads. An owner
performing deferred work can renew the lease. If an expired payload is required
again, the caller must explicitly request reconstruction; lease renewal and
purging never fetch or reload source data. Dynamic or non-reloadable resources
must remain locked, retain the required payload, or be able to recreate it.

Payload references are shared read-only by default. Preparing WebGL and WebGPU
adapters side by side should normally pass the same payload to both consumers
and retain it until both have finished. Copying is an explicit consumer
operation, justified when a consumer must mutate data, transfer and detach an
`ArrayBuffer`, or retain an independently writable snapshot. The consumer
should copy only the fields it requires; runtime-resource should not
automatically deep-clone entire payload or typed-array bundles. Any full-copy
operation should be format-aware rather than a generic resource-side clone.

Open design questions:

- Should `Unload()` drop only adapter payloads by default, or CPU payloads too?
- Should there be explicit `UnloadAdapterResources()`, `UnloadPayload()`, and
  `Purge()` phases?
- Which format/resource-specific estimators should supply separate identity,
  CPU-payload, and adapter byte weights without double-counting shared buffers?
- Should manually attached/dynamic resources default to locked, like ccpwgl's
  manual shader resources use `doNotPurge`?
- What explicit `Reload()`/reconstruction API should restore purged resources
  without introducing surprising browser or network work?

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
  payloads. Plain reader results are normally transient prepare inputs; the
  resource or adapter retains only what it requires, by reference or by
  explicit copy.
- Frozen standalone non-shader `format-*` packages remain compatibility
  distributions. GR2 and all shader formats remain separate packages for now.
- engine packages create WebGL/WebGPU textures, buffers, shader modules,
  pipelines, and bind groups from loaded resources.

This gives us the Carbon lifecycle shape without forcing WebGL/WebGPU imports or
device decisions into `runtime-resource`.
