# Resource lifecycle

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource`
Audience: Users and integrators  
Summary: Explains resource states, the load/prepare split, and how a resource request flows from path to published CPU payload.

## Carbon and ccpwgl background

Carbon's resource model separates load from prepare. The source schemas expose
resource classes through `BlueAsyncRes`, and Carbon notes distinguish
background load work from main-thread/device prepare work.

ccpwgl makes that split visible in `Tw2Resource`:

```text
NO_INIT -> REQUESTED -> LOADED -> PREPARED
```

Additional terminal or cleanup states include `ERROR`, `UNLOADED`, and
`PURGED`. The important behavior is:

- `Tw2ResMan.LoadResource()` requests a resource.
- The raw fetch resolves.
- `Tw2Resource.OnLoaded()` marks bytes or source data as loaded.
- The resource is queued for prepare.
- The manager tick later calls `res.Prepare(data)`.
- The concrete resource calls `OnPrepared()` after prepare work succeeds.

Some ccpwgl concrete `Prepare()` implementations also create WebGL objects.
That is a historical engine/runtime coupling, not the boundary CarbonEngineJS
keeps; see [architecture](../architecture.md).

## CarbonEngineJS states

```text
EMPTY -> REQUESTED/LOADING -> LOADED          (resource layer)
LOADED -> PREPARING -> PREPARED               (engine adapters)
```

- `EMPTY`: resource identity exists, but no payload has been read.
- `REQUESTED`: the resource is waiting on a queued or shared source load.
- `LOADING`: source bytes are available and CPU reader/format work is active.
- `LOADED`: CPU payload or hydrated object graph exists.
- `PREPARING`: an engine adapter is realizing backend-owned resources.
- `PREPARED`: preparation completed successfully and the resource is usable.
- `FAILED`: CPU loading, conversion, validation, or publication failed before
  a valid payload was published.
- `UNLOADED`: resource payload was released.
- `PURGED`: an inactivity or recorded-byte cache policy evicted the resource
  from active ownership. Ordinary replacement, `Delete()`, `Clear()`,
  `ClearCached()`, and shutdown clean owned payloads/adapters but preserve the
  detached handle's last valid state.

`CjsResMan.LoadObject()` queues one deduplicated background source operation
per source/path and limits active source operations with
`maxConcurrentLoads`. After bytes arrive, object construction is split into
separate main-queue items (`reader/format conversion -> publish`). Publication
moves the resource to `LOADED`, then stops. ResMan never performs backend
realization or marks the resource `PREPARED`/`GOOD`. See
[reference/queues.md](../reference/queues.md) for the queue contract and
[reference/motherlode-cache.md](../reference/motherlode-cache.md) for
identity, retention, and release behavior.

## Request workflow

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
| - chooses requirement / emit / format         |
| - applies explicit request overrides          |
+-----------------------------------------------+
        |
        | path + resolved request options
        v
+-----------------------------------------------+
| CjsResMan.GetResource(path, options)          |
|                                               |
| - normalize source path and extension         |
| - resolve the promised output tag             |
| - capture the registered extension route      |
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
              | semantic class or extension Handler   |
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
| - CjsResMan builds URL when provider needs it |
| - provider.Read(sourcePath)                   |
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
| explicit extension route?                     |
|   yes -> ordered Formats/content probes        |
|   no  -> direct loader or legacy formats       |
| target/identify -> hydrate on caller thread   |
+-----------------------------------------------+
        |
        | plain payload / hydrated object
        v
+-----------------------------------------------+
| Publish stage                                 |
|                                               |
| RESOURCE handler -> SetPayload + return handle|
| OBJECT handler   -> SetPayload + return object|
| legacy path      -> preserve current behavior |
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

Device realization is a separate continuation selected outside ResMan. It can
run again after adapter eviction or device loss while the CPU payload remains
resident:

```text
CjsResource LOADED
        |
        | selected engine adapter
        v
PREPARING
        |
        | create candidate -> verify current target -> synchronous attach
        v
PREPARED

failure: destroy candidate -> LOADED (CPU payload retained)
```

## Retention model

ccpwgl keeps every resource in `Tw2MotherLode` until it is explicitly cleared
or auto-purged, and its `IsGood()` implicitly calls `KeepAlive()`, so many
read/check paths keep resources resident. CarbonEngineJS retains that behavior
for the resource being queried, while keeping payload retention and hard locks
explicit:

- `IsGood()` calls `KeepAlive()` before checking preparation. It renews this
  handle and starts its bounded reload path when the handle is `PURGED`.
- `IsPrepared()` and `HasLoaded()` remain pure state checks.
- `KeepAlive()` and `KeepPayloadAlive()` are the explicit liveness operations.
- `Lock()` / `Unlock()` maintain a non-underflowing count and prevent identity
  and payload eviction during a sweep.
- MotherLode tracks separate identity and CPU-payload frame/time observations.
- `CjsMotherLode.PurgeInactive()` scans only when explicitly requested and
  never infers JavaScript reachability. `CjsResMan.Update()` may request it
  only under an explicitly configured automatic policy.

Generic liveness never walks arbitrary child fields. `IsGood()` renews only the
handle on which it is called; an aggregate consumer that owns child resources
must query or retain those children explicitly.

The CPU/GPU split adds an axis that ccpwgl blurs: CPU payload memory and
device memory are different budgets. Retention therefore distinguishes:

- resource identity: path, extension, state, error summary, lightweight
  metadata;
- CPU payload: plain reader/converter objects, hydrated object graphs, decoded
  typed arrays;
- adapter payload: WebGL/WebGPU textures, buffers, shader modules, pipelines.

Identity and lightweight metadata stay resident while CPU payloads and adapter
payloads release independently. Engine adapters own adapter-resource
destruction; the resource layer provides lifecycle hooks and opaque adapter
slots so cleanup has a consistent place to run. The exact contracts live in
[reference/motherlode-cache.md](../reference/motherlode-cache.md).

## Related documentation

- [Architecture and boundaries](../architecture.md)
- [MotherLode identity, cache, and retention](../reference/motherlode-cache.md)
- [Candidate-first atomic reload](../reference/reload.md)
- [Queues and the Wait fence](../reference/queues.md)
