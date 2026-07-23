# Queues, publication, and the Wait fence

Status: Evolving  
Scope: `@carbonenginejs/runtime-resource`  
Audience: Users and integrators  
Summary: Defines the two manager-owned queues, publication budgeting, registration, and the `Wait()` fence semantics.

## Queued CPU load and publication

`GetObject()`, `LoadObject()`, and resource `Ready()` use two manager-owned
queues:

```text
BACKGROUND: deduplicated source load, limited by maxConcurrentLoads
MAIN:       reader/format conversion -> resource publication
```

The main reader/format operation and publication are separate queue items.
`maxPrepareTime` is a per-pump budget in seconds limiting synchronous
main-queue work started in one pump, and `maxPrepareItemsPerTick` can add an
item-count limit. Promise-returning format work remains in flight without
blocking the JavaScript event loop. The default scheduler keeps promise-based
calls working; a `CjsLibrary` or direct caller can provide its frame
scheduler:

```js
const resMan = new CjsResMan({
  source,
  maxConcurrentLoads: 8,
  maxPrepareTime: 0.005,
  queueScheduler: callback => requestAnimationFrame(callback)
});

await resMan.FetchResource("res:/model/ship.gr2", {
  requirement: "geometry",
  emit: "cmf"
});
```

The selected format class owns conversion to the promised CPU output.
`CjsResMan` does not inspect WebGL, WebGPU, texture, geometry, or codec
support, and it does not run backend realization. An engine consumes the
published CPU resource afterward through its own explicit operation.

## Queue controls

Blue-compatible queue controls are exposed directly on `CjsResMan`:
`AddToQueue`, `CancelFromQueue`, `GetNextIdForQueue`, `PumpMainThreadQueue`,
`PauseQueue`, `ResumeQueue`, `GetPendingLoads`, and `GetPendingPrepares`.
`Update()`/`Tick()` pump work.

## The Wait fence

`Wait()` synchronously captures queued resource-operation roots and low-level
queue tasks that already exist when it is called. Captured resource roots
include publication work enqueued after an asynchronous read; unrelated later
roots/tasks do not postpone the fence. Failure and queued cancellation count
as settlement, remain observable through their original operation promises,
and cross the fence without making `Wait()` reject.

By default `Wait()` pumps the two queues directly within their ordinary
budgets and never runs automatic purge housekeeping. It preserves pause
state; `{ pump: false }` leaves all progress to an external driver. A
standalone canonical `PrepareResourceObjectQueued()` call is a queued root.
Direct `LoadResourceObject()`, direct `PrepareResourceObject()`, standalone
`ReadResource()`, and standalone `ReadFormatOnce()` calls bypass both queues
and are outside this fence unless they own a captured queue task, although
direct resource mutations are still tracked for safe MotherLode replacement.
`WaitUrgent()` remains deferred until the queue has real per-item priority
and urgent-membership semantics.

## Registration

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

## Related documentation

- [Resource lifecycle concepts](../concepts/resource-lifecycle.md)
- [MotherLode identity, cache, and retention](motherlode-cache.md)
- [Format subpaths](../formats/README.md)
