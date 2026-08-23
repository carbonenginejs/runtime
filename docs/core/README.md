# Package documentation

Status: Evolving
Scope: `@carbonenginejs/runtime/core`
Audience: Runtime integrators and maintainers
Summary: Documentation home for the GPU-free composition root, service registry, and request-policy boundary.

## Purpose

`@carbonenginejs/runtime/core` provides `CjsLibrary`, a small composition
boundary for caller-owned services and capabilities.

```js
import CjsLibrary from "@carbonenginejs/runtime/core";

const library = new CjsLibrary({
    resourceManager,
    spaceObjectFactory,
    capabilities: { webgpu: true }
});
```

The package also exposes browser platform and WebGPU adapter snapshots. Those
probes report capabilities but do not create a `GPUDevice`.

## Where it fits

- Runtime packages supply resource, SOF, input, audio, and device services.
- `CjsLibrary` composes those services and selects resource request behavior.
- Concrete services retain ownership of loading, decoding, queues, backend
  objects, and shutdown behavior.

The package does not parse formats, manage a resource cache, decode media,
hydrate a scene graph, or drive a frame loop.

## Start here

- [Architecture](architecture.md)
- [Roadmap](roadmap.md)
- [Composing a library](guides/composing-a-library.md)
- [API reference](reference/api.md)
- [Resource request policy](reference/resource-request-policy.md)
- [Browser platform capabilities](reference/platform.md)
- [Class catalog](reference/classes/README.md)
