# Architecture

Status: Evolving
Scope: `@carbonenginejs/runtime/core` composition boundaries
Audience: Runtime integrators and maintainers
Summary: Explains service ownership, capability registration, lifecycle state, and platform probing.

## Composition boundary

`CjsLibrary` holds structural service references, capability values, resource
defaults, and named resource behaviors. It forwards operations to the
configured service rather than importing or constructing a concrete engine.

```text
application configuration
    -> CjsLibrary services and capabilities
    -> resource request selection
    -> caller-owned resource or SOF service
```

The library has dedicated resource-manager and space-object-factory slots plus
a general string-keyed service registry. `CjsServiceKey` supplies conventional
keys for resource, SOF, device, audio, and input services.

## Service ownership

Runtime-core does not take ownership of service internals:

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
the configured audio manager when those structural methods are present, then
clears the initialized flag. It does not dispose caller-owned services or
invent a general shutdown protocol for them.

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
