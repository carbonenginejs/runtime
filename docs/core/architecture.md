# Architecture

Status: Evolving
Scope: `@carbonenginejs/runtime/core` composition boundaries
Audience: Runtime integrators and maintainers
Summary: Explains service ownership, capability registration, lifecycle state, and platform probing.

## Composition boundary

`CjsLibrary` holds exact package-owned service identities, capability values,
resource defaults, and named resource behaviors. It forwards operations to the
configured service rather than constructing a concrete engine.

```text
application configuration
    -> CjsLibrary services and capabilities
    -> resource request selection
    -> caller-owned resource or SOF service
```

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

`Initialize(options)` applies library values and marks the library initialized.
`InitializeAsync({ dataPath, ...options })` additionally asks the configured
SOF service to load the supplied data path. `Shutdown()` disables and detaches
the configured `CjsAudioMan` through its required methods, then clears the
initialized flag. It does not dispose caller-owned services or invent a general
shutdown protocol for them.

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

Resource request resolution is synchronous so `GetResource()` can return an
immediate handle. Defaults, named behaviors, caller overrides, and diagnostic
output suffixes are resolved before the resource manager is called. See
[reference/resource-request-policy.md](reference/resource-request-policy.md).

## Platform boundary

The browser platform helpers can request a WebGPU adapter and snapshot
privacy-filtered adapter information, limits, features, and current screen
dimensions. They never request a `GPUDevice` or create backend objects. See
[reference/platform.md](reference/platform.md).
