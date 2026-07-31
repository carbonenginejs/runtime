# Roadmap

Status: Evolving  
Scope: `@carbonenginejs/runtime-resource`  
Audience: Integrators and maintainers  
Summary: Records approved future direction, open design questions, and the current shader-format boundary needed to interpret that direction.

Unless a section is explicitly marked **Current**, everything below is future
work. Current behavior is documented in the
[reference pages](reference/motherlode-cache.md); where this page and a
reference page disagree, the reference page describes the shipped package.

## Runtime manager follow-up

The ResMan/MotherLode contract is complete for its current consumers. Future
work should be driven by measured application needs rather than another
resource preparation abstraction:

- main-queue priority and starvation policy;
- cancellation/abort propagation for work that has already started;
- `WaitUrgent()` after real priority and bounded fairness;
- queue-time and reader/format-time telemetry;
- application-level default retention policy selection;
- automatic resource/payload byte estimation and separate CPU/adapter
  budgets;
- additional browser-source response types and configurable worker-pool
  concurrency;
- purged-resource/device-loss recovery policy (backend device-loss recovery
  belongs to the engine's realization operation).

## Browser shader formats

**Current:** HLSL, DXBC, WebGL, and WebGPU are consolidated into
runtime-resource and exposed as independently importable
`@carbonenginejs/runtime-resource/formats/<name>` entry points. HLSL and DXBC
remain directly usable; WebGL and WebGPU compose them to read DX11/DX12 effect
inputs and translate them.

**Planned:** Browser delivery and fallback policy still needs a stable
application-facing contract.

Browser-targeted production modules must not import or require Node-only
shader libraries. A format package may use local Node libraries as development
or test dependencies for fixtures, comparison, and conformance checks, but
those libraries must not ship and must not be runtime dependencies.

ccpwgl currently preserves an authored `.fx` path while `Tw2Device` maps it to
a backend-specific remote namespace such as `effect.gles2` or `effect.webgl2`
and appends the selected shader-model extension. The resource/format
contract must retain both use cases:

- resolve and load a pretranslated backend artifact from a remote resource
  provider or tools-core cache; and
- fall back to the authored effect input and translate it in the browser.

The authored effect path should remain the stable identity. Backend profile,
shader model, translated cache path, and translation capabilities are
resolution facts rather than changes a caller must make to its source path.

## Pre-adoption lifecycle API cleanup (approved, not implemented)

No released consumer currently depends on the ccpwgl-compatible liveness
names; the known ccpwgl format integrations are migration targets rather than
a reason to preserve them. Before runtime-core or another public consumer
adopts this contract, remove `KeepAlive()` and `KeepPayloadAlive()` instead
of retaining or deprecating compatibility aliases.

The public lifecycle should express caller intent directly:

- `Ready()` obtains or reconstructs the CPU payload;
- `AcquireLock()` returns a scoped hard-retention token;
- `ReleasePayload()` explicitly drops the CPU payload; and
- state queries remain pure.

ResMan should update identity activity when a canonical resource is acquired
and payload activity when it publishes or returns a ready payload. Those
timestamps are cache-policy implementation details, not calls consumers
should have to make. Cache admission and promotion must also be explicit
manager operations: merely accessing a resource must not permanently move it
from the byte-budget candidate set into an unbudgeted live set.

Do not add `TouchIdentity()` or `TouchPayload()` to the initial public API
unless a concrete soft-retention consumer appears. A consumer that needs a
residency guarantee should acquire a lock; one that merely uses a resource
should call `Ready()` and allow the configured cache policy to operate.

Raw `Lock()` / `Unlock()` is easy to mis-pair across asynchronous success,
failure, cancellation, and disposal. Prefer a JS-only acquired-lock API:

```js
const hold = resource.AcquireLock();
try {
  const payload = await resource.Ready();
  await consume(payload);
} finally {
  hold.Release();
}
```

The acquired token should add exactly one lock, capture the canonical key and
ownership generation that received it, and release that exact lock at most
once. `Release()` must be idempotent. If the original record has been
deleted, replaced, purged, or rebound, releasing the stale token must not
decrement a new owner's lock. Acquisition and release must never fetch,
reconstruct, prepare, or release payload data themselves.

The token is an async-safety replacement for exposing the existing raw lock
count, not a new retention policy. For example, runtime-audio can hold
source/PCM payload through decode and release the token once it owns the
resulting WebAudio `AudioBuffer`; keeping the resource locked for the full
playback or decoded-cache lifetime would unnecessarily retain both
representations. Runtime-lifetime and group retention remain caller policy
built from explicit tokens, not an implicit default on every loaded resource.

## Open design questions

- Should `Unload()` drop only adapter payloads by default, or CPU payloads
  too?
- Should there be explicit `UnloadAdapterResources()`, `UnloadPayload()`, and
  `Purge()` phases?
- Which format/resource-specific estimators should supply separate identity,
  CPU-payload, and adapter byte weights without double-counting shared
  buffers?
- Should manually attached/dynamic resources default to locked, like ccpwgl's
  manual shader resources use `doNotPurge`?
- What explicit `Reload()`/reconstruction API should restore purged resources
  without introducing surprising browser or network work?
- A resource-level `Purge()`/`Reload()` vocabulary remains future policy
  work, as does whether `Unload()` should release engine adapter resources
  and optionally CPU payloads.

## Related documentation

- [MotherLode identity, cache, and retention](reference/motherlode-cache.md)
- [Candidate-first atomic reload](reference/reload.md)
