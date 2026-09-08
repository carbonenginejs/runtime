# Architecture

Status: Evolving
Scope: `@carbonenginejs/runtime/core` composition boundaries
Audience: Runtime integrators and maintainers
Summary: Explains service ownership, capability registration, lifecycle state, and platform probing.

## Composition boundary

`CjsLibrary` holds caller-owned services, capabilities, resource defaults and
named request behaviors. It selects requests and forwards operations to the
configured resource or SOF service rather than constructing an engine.

The dedicated slots require `CjsResMan`, `EveSOF`, and `CjsAudioMan` instances.
The general string-keyed registry also carries opaque device and input values
because core does not call methods on those engine- and host-owned objects.
`CjsServiceKey` supplies the conventional keys.

## Service ownership

Runtime core does not take ownership of service internals:

- Resource services own source reads, formats, caching, queues, and resource
  readiness.
- SOF services own DNA parsing and object construction.
- Device and engine services own backend probing, GPU objects, and rendering.
- Audio and input services own their domain-specific host lifecycles.

`Register({ resMan })` and `Register({ sof })` forward the exact topic value to
the corresponding configured service's `Register()` method.

## Library lifecycle

`Initialize(options)` applies values and sets the initialized flag.
`InitializeAsync` additionally loads the SOF `dataPath`, or calls SOF
initialization so an installed partial-catalog builder can boot `generic.black`.
`Shutdown()` disables and detaches `CjsAudioMan`, then clears the flag.
Caller-owned services are not disposed; there is no general shutdown protocol.

## Frame boundary

`CjsFrameDriver` owns the backend-neutral order of one explicitly requested
frame. Composition requires exact `Tr2RenderContext`, `Tr2RenderJobs`, and
`CjsFrameLifecycle` instances once, then the hot path calls them directly.
The lifecycle supplies pacing, GPU synchronization, viewport, profiling, and
quad-index reservation; its base methods throw until an engine overrides them.

The driver passes its exact bracketed context to `Tr2RenderJobs.Run`. Cleanup
attempts every opened closer even when jobs or an earlier closer fail.
Presentation, update jobs, and the outer tick remain engine-owned.

## Request-policy boundary

Synchronous resolution lets `GetResource()` return an immediate handle.
The [request-policy reference](reference/resource-request-policy.md) owns
defaults, behaviors, caller overrides and output-suffix precedence.

## Platform boundary

The [platform reference](reference/platform.md) owns privacy-filtered browser
adapter, limit, feature and screen snapshots. Probing never requests a
`GPUDevice` or creates backend objects.
