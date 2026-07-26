# Browser worker execution

Status: Evolving

Scope: `@carbonenginejs/runtime-resource`

Audience: Browser integrators and format maintainers

Summary: Defines worker-backed source and format execution while keeping resource publication and class-bearing results on the caller thread.

## Enable worker execution

`CjsResMan` selects the bundled module-worker strategy by default and creates
the worker lazily on the first eligible source or format read:

```js
import {
  CjsFetchResourceSource,
  CjsResMan
} from "@carbonenginejs/runtime-resource";
import { CjsWemFormat } from "@carbonenginejs/runtime-resource/formats/wem";

const resMan = new CjsResMan({
  source: new CjsFetchResourceSource(),
  formats: [ CjsWemFormat ]
});
```

Pass `useWorkerLoading: false` or call `UseWorkerLoading(false)` when a caller
requires deterministic main-thread execution.

The default worker entry is resolved relative to the published
`CjsResourceWorkerLoader` module. A browser wrapper may instead inject an
existing Worker-compatible object, a `workerFactory`, or a `workerUrl` through
the `workerLoader` constructor option:

```js
const resMan = new CjsResMan({
  source,
  workerLoader: {
    workerFactory: (url, options) => new Worker(url, options)
  },
  useWorkerLoading: true
});
```

Failure to create the worker leaves unsupported and later operations on the
main-thread fallback. A fatal worker error rejects requests already assigned
to that worker, disables it, and leaves future reads able to fall back.

## Source reads

A source opts into worker execution by implementing:

```js
CreateWorkerRequest(path, options) {
  return {
    operation: "source.fetch",
    payload,
    signal,
    transfer
  };
}
```

Returning `null` selects the main-thread fallback for that read.
`CjsFetchResourceSource` implements this contract for its normal global
`fetch` path and returns `ArrayBuffer` data using transfer ownership. An
injected fetch implementation remains on the caller thread unless its source
is explicitly created with `{ worker: true }`.

Fetch request options may include ordinary headers, including an HTTP `Range`
header. Range capability, status interpretation, and the identity of an
offset-backed logical resource remain source/provider policy; `CjsResMan`
does not invent offset semantics.

## Format reads

A clone-safe format opts in with a static worker declaration:

```js
static worker = Object.freeze({
  module: import.meta.url,
  exportName: "CjsExampleFormat"
});
```

The worker dynamically imports that exact module and invokes its static
`readAsync`/`read` operation, falling back to an instance
`ReadAsync`/`Read` operation when required. BNK and WEM are worker-enabled.
Black `json` and `payload` outputs are worker-enabled; Black document/runtime
outputs remain on the caller thread because structured cloning would discard
their class identity.

A declaration may restrict clone-safe outputs:

```js
static worker = Object.freeze({
  module: import.meta.url,
  exportName: "CjsExampleFormat",
  outputTypes: Object.freeze([ "json", "payload" ]),
  defaultOutput: "json"
});
```

Format options containing functions, symbols, non-plain instances, cycles, or
caller-supplied class constructors do not cross the worker boundary.

## Queues and ownership

Worker-safe format reading runs outside the main preparation queue. Its
resource-operation root remains visible to `Wait()`, and
`GetPendingWorkers()`/`IsLoading()` include unresolved worker requests. Once
the reader settles, guarded resource publication is still enqueued on the
main queue.

Format input is cloned by default. This preserves source-cache and
multi-output ownership at the cost of a copy. A format may declare
`transferInput: true` only when its caller guarantees exclusive ownership of a
complete `ArrayBuffer`; transferring detaches the caller's buffer. Result
ArrayBuffers and typed-array backing stores are transferred back
automatically.

The bundled strategy currently owns one module worker. Asynchronous fetches
may overlap within it, while synchronous CPU readers are serialized by that
worker's event loop.

## Related documentation

- [Queues, publication, and the Wait fence](queues.md)
- [MotherLode identity, cache, and retention](motherlode-cache.md)
- [Wwise BNK/WEM formats](../formats/wwise.md)
