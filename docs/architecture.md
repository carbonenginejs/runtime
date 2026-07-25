# Runtime Trinity architecture

Status: Evolving
Scope: `@carbonenginejs/runtime-trinity`
Audience: Runtime authors, engine authors, and maintainers
Summary: Defines Trinity graph ownership and the boundary between portable state and backend realization.

## Purpose

`@carbonenginejs/runtime-trinity` preserves Carbon's serializable object graph and portable
runtime behavior while keeping graphics-device work outside the package.
Trinity classes can therefore be registered, hydrated, inspected, updated, and
serialized in browsers, workers, Node.js tools, and test hosts.

## Composition and data flow

```text
@carbonenginejs/tools-core -- reviewed source --> @carbonenginejs/runtime-trinity
@carbonenginejs/runtime-trinity -- depends on --> @carbonenginejs/runtime-utils

@carbonenginejs/runtime-resource -- decoded values --> application composition
@carbonenginejs/runtime-trinity -- graph and intents --> application composition
application composition --> host WebGL engine
application composition --> @carbonenginejs/engine-webgpu
```

The runtime dependency points from `@carbonenginejs/runtime-trinity` to
`@carbonenginejs/runtime-utils`. Schema scanning and source emission flow from
`@carbonenginejs/tools-core` during development, but generated source never
imports that Node toolchain.

## Owned responsibilities

The current package owns:

- Carbon-compatible class identity, schema fields, enums, and graph structure;
- CPU-side curves, controllers, cameras, transforms, behaviors, and effects;
- renderer-neutral render batches and ordered render-job intent;
- per-object semantic values that can be established from graph state;
- portable lifecycle, distribution, post-process graph, and scene behavior;
- generated schema intake and the maintained implementations promoted from it.

`TriDevice`, render contexts, targets, buffers, effects, shaders, and
presentation records remain Trinity graph classes. Their serialized identity
does not make this package the owner of live backend handles.

## Ownership elsewhere

- `@carbonenginejs/runtime-utils` owns shared models, schema decorators, math,
  constants, and general runtime primitives.
- `@carbonenginejs/runtime-resource` owns resource acquisition, decoding, and
  reusable CPU resource representations.
- `@carbonenginejs/runtime-character` owns character GState behavior.
- `@carbonenginejs/tools-core` owns source scanning, schema compilation, and
  generated-class emission.
- WebGL and WebGPU engines own devices, contexts, uploads, bindings, pipelines,
  draw or dispatch encoding, presentation, synchronization, and loss recovery.
- Applications or `@carbonenginejs/runtime-core` choose and compose engines and
  domain runtimes.

## Render-job contract

`TriRenderJob` and `Tr2RenderJobs` preserve ordered step execution, resumable
in-progress cursors, nested result mapping, recurring and chained scheduling,
and deterministic target/depth stack cleanup.

`Run(realTime, simTime, executor)` receives an injected executor. A WebGL
executor may perform work immediately while a WebGPU executor may encode pass
boundaries, but both preserve the observable step order and yield boundary.
Nested jobs receive the same executor identity. `TriRenderJob` and
`TriRenderStep` expose their status and result vocabularies as class statics.
The default `Tr2RenderContext` is a GPU-free intent and diagnostic surface.

## Render-batch contract

`Tr2RenderBatch`, `TriRenderBatchAccumulator`, and `TriRenderBatchMap` collect,
sort, group, and expose neutral CPU data. Geometry references, effect keys,
per-object values, render modes, and draw arguments describe work; they are
not live GPU resources.

`CjsBatchManager` is the current GPU-free orchestrator. It registers producer
types, invokes injected `Realize` and `Build` hooks, collects renderables,
finalizes accumulators, and observes shared rebuild tokens. The backend
realizers supplied through those hooks remain engine-owned.

## Per-frame and per-object data

Trinity can expose per-object values proven by graph state, including world
transforms and maintained Eve per-object records. It does not invent missing
renderer state.

The active engine supplies complete per-frame values such as previous
matrices, shadow state, resolution, jitter, presentation policy, and other
backend-owned semantics before serialization or upload.

## Post-process graph

`Tr2PostProcess2` and `Tr2PostProcessAttributes` own device-free activation,
quality gates, lookup-table ordering, volume blending, and authored effect
records. Engines independently realize temporary textures, exposure state,
history, compute or fragment passes, readback, and loss recovery while
preserving observable graph order.

## Constraints

- Package evaluation must not create a canvas, graphics context, audio
  context, network request, or filesystem dependency.
- Persisted schema fields must not hold live backend handles.
- A generated class is generator-owned schema intake. It is promoted before
  its first substantive manual source change, even when review leaves explicit
  implementation gaps.
- Backend-specific behavior must be injected through a narrow capability or
  remain with the owning engine.

## Related documentation

- [Package documentation](README.md)
- [Current API](reference/api.md)
- [Main semantic extraction](reference/main-semantic-extraction.md)
- [Eve runtime behavior](concepts/eve-runtime-behavior.md)
- [Generated-class lifecycle](concepts/generated-class-lifecycle.md)
- [Implementation status and audits](reference/implementation-status.md)
