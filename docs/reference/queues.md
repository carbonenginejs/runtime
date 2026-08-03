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

Without worker execution, the main reader/format operation and publication
are separate queue items.
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

When worker loading is selected, a declared worker-safe format read runs on
the module worker rather than occupying a main-queue item. The guarded
publication item remains on the main queue. `GetPendingWorkers()` and
`IsLoading()` include unresolved worker requests, and a queued resource
operation keeps the worker descendant within its `Wait()` lineage.

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

The Carbon-shaped primary route binds an extension to a resource-compatible
handler and a format. The handler declares whether the public result is a
stable resource or a constructed object:

```js
import {
  CjsLoadingObject,
  CjsResMan
} from "@carbonenginejs/runtime-resource";
import { CjsBlackFormat } from "@carbonenginejs/runtime-resource/formats/black";
import { CjsRedFormat } from "@carbonenginejs/runtime-resource/formats/red";

const resMan = new CjsResMan({ source });

resMan.RegisterExtension(".red", CjsLoadingObject, [
  CjsBlackFormat,
  CjsRedFormat
]);
resMan.RegisterExtension(".black", CjsLoadingObject, [
  CjsBlackFormat,
  CjsRedFormat
]);
```

Ordered arrays apply request output/media filters first, then evaluate support
probes in order. The first supported format wins. One format without a probe
may be the final fallback; it cannot precede another entry. After selection,
reader failure is final and does not advance to the fallback. Both `.red` and
`.black` therefore use Black magic first and Red/YAML otherwise, independent
of the suffix.

A fixed `Target` may hydrate parsed values through its static `from` or
`fromYAML` method. `Identify(values, context)` may instead return a target
constructor, `true` to accept the reader result unchanged, or false/null to
fail. `Target` and `Identify` are mutually exclusive and only valid for object
handlers. These functions remain on the main thread even when the selected
format is worker-safe.

The normalized context supplied to formats as the third
`read(input, options, context)` argument, direct object loaders, `Identify`,
and `fromYAML` contains the same resource identity fields:

- `ext`: normalized lowercase extension without a leading dot;
- `resFilePath`: normalized lowercase logical resource path;
- `fileName`: normalized lowercase final path component; and
- `url`: the exact translated URL used by a URL-backed source, or `null` for
  sources that read logical resource paths directly.

`path` remains a compatibility alias for `resFilePath`. URL text is not
lowercased independently: paths translated from `res:/` already use the
normalized resource path, while configured URL-base or resolver casing is
preserved.

The single-format short form:

```js
import { TriTextureRes } from "@carbonenginejs/runtime-resource/resource/texture";
import { CjsDdsFormat } from "@carbonenginejs/runtime-resource/formats/dds";

resMan.RegisterExtension("dds", TriTextureRes, CjsDdsFormat);
```

is equivalent to:

```js
resMan.RegisterExtension("dds", TriTextureRes, {
  Format: CjsDdsFormat
});
```

`Register({ extensions })` accepts the same route objects keyed by extension.
Re-registration replaces the route for future uncached handles; an existing
canonical handle retains the complete route it captured.

The older registries remain independent compatibility and specialization
seams. `RegisterFormat` adds a format under its self-declared input extensions.
`RegisterResourceType` selects a resource class from a semantic requirement or
payload and takes precedence over the extension handler:

```js
import { CjsResMan } from "@carbonenginejs/runtime-resource";
import {
  Tr2ImageRes,
  TriTextureRes
} from "@carbonenginejs/runtime-resource/resource/texture";
import { CjsDdsFormat } from "@carbonenginejs/runtime-resource/formats/dds";
import { CjsPngFormat } from "@carbonenginejs/runtime-resource/formats/png";

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
operation. `RegisterObjectLoader` remains the direct legacy byte-to-value
registration for an extension without an explicit route.

## Related documentation

- [Resource lifecycle concepts](../concepts/resource-lifecycle.md)
- [Browser worker execution](workers.md)
- [MotherLode identity, cache, and retention](motherlode-cache.md)
- [Format subpaths](../formats/README.md)
