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
@carbonenginejs/runtime-trinity -- depends on --> runtime-utils + runtime-resource

@carbonenginejs/runtime-resource -- decoded values --> application composition
@carbonenginejs/runtime-trinity -- graph and intents --> application composition
application composition --> host WebGL engine
application composition --> @carbonenginejs/engine-webgpu
```

Runtime dependencies point from `@carbonenginejs/runtime-trinity` to
`@carbonenginejs/runtime-utils` and `@carbonenginejs/runtime-resource`.
Schema scanning and source emission flow from `@carbonenginejs/tools-core`
during development, but generated source never imports that Node toolchain.

## Owned responsibilities

The current package owns:

- Carbon-compatible class identity, schema fields, enums, and graph structure;
- CPU-side curves, controllers, cameras, transforms, behaviors, and effects;
- renderer-neutral render batches and ordered render-job intent;
- per-object semantic values that can be established from graph state;
- portable lifecycle, distribution, post-process graph, and scene behavior;
- generated schema intake and the maintained implementations promoted from it.

`TriDevice`, render contexts, targets, authored shader options, effect/material
facades, parameters, buffers, and presentation records remain Trinity graph
classes. Canonical `Tr2EffectRes`, `Tr2Shader`, and immutable reflection records
are resource-owned. Serialized identity never makes either package the owner of
live backend handles.

## Ownership elsewhere

- `@carbonenginejs/runtime-utils` owns shared models, schema decorators, math,
  constants, and general runtime primitives.
- `@carbonenginejs/runtime-resource` owns resource acquisition, decoding,
  reusable CPU resource representations, compiled-effect selection/cache, and
  the canonical device-free `Tr2Shader` reflection graph.
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
The job snapshots its step list at the start of a run and retains its cursor
when a step returns `RS_IN_PROGRESS`. Each enabled step is bracketed by
begin/execute/end hooks; end still runs when execution throws. Nested jobs
receive the same executor identity.

Passing an executor directly to `Run` invokes its step hooks with
`(step, realTime, simTime, job)`. An executor that also needs the active render
context installs on that context with `SetStepExecutor(executor)`, and the job
runs against the context. The context delegates implemented hooks with itself
as a fifth argument and falls back to the step's own begin, execute, or end
method for hooks the installed executor omits. Recorders that require render
context state use this installed form rather than being passed directly.

With `stackGuard` enabled, a job records render-target and depth-stencil stack
depths, diagnoses underflow, and unwinds surplus pushes to the entry depth on
success, yield, or failure. `TriRenderJob` and `TriRenderStep` expose their
status and result vocabularies as class statics.

The default `Tr2RenderContext` is a GPU-free intent and diagnostic surface.
`GetIntents()` returns a copy of the full retained history. An executor uses
`TakeIntents()` for incremental, exactly-once consumption; it advances the
take cursor so nested jobs cannot realize the same intent twice. The package
does not provide a production backend executor.

## Render-batch contract

`Tr2RenderBatch`, `TriRenderBatchAccumulator`, and `TriRenderBatchMap` collect,
sort, group, and expose neutral CPU data, including the area-block collectors
used by overlay and shadow passes. Geometry references, effect keys, per-object
values, render modes, and draw arguments describe work; they are not live GPU
resources.

`CjsBatchManager` is the current GPU-free orchestrator. It registers producer
types and scene-global collectors before `Initialize`, verifies required
producer types, creates one map of accumulators, and clears it for each
collection. For each pre-culled renderable it invokes an injected `Realize`
hook before `Build`, or falls back to the renderable's `GetBatches`. It then
collects transparent work back-to-front, invokes global collectors, and calls
`Finalize` before returning the map.

Backend realization, finalized-batch dispatch, pass policy, production
composition, and concrete global collectors remain engine or application
work. Rebuild tokens stay on the object or child that declared them; a realizer
consumes the tokens for work it successfully completes.

## Per-frame and per-object data

Trinity can expose per-object values proven by graph state, including world
transforms and maintained Eve per-object records. It does not invent missing
renderer state.

`EveSpaceScene` owns and reuses persistent vertex and pixel per-frame records.
Its fill methods consume stored previous-view/projection and jitter fields and
populate environment rotation, sun, fog, shadow quality, scene lighting,
volumetrics, and upscaling state. The JavaScript scene does not yet advance
those history or jitter fields: until a production driver owns that frame
transition, the host must provision them or they retain identity/zero
defaults. The active driver also supplies the current render context and the
frame values Carbon reads from renderer or device globals: render-target and
viewport dimensions, aspect ratio, animation time, frame index, gamma, mip
bias, atlas settings, the non-reversed projection used for FOV, upscaling
amount, and an optional shadow map.

The pixel record must be populated before the vertex record for a frame,
because the pixel fill resets the scene's upscaling amount and the vertex fill
then reads it. Engines serialize or upload the filled records and remain
responsible for presentation and backend memory.

### Constant-data ownership

Trinity owns the constant-data layout outright: field names, element counts, an
encoding kind per field, and the byte offsets. There is ONE layout and no
per-engine packing, because these buffers are not backend-specific — every
backend declares them as a flat array of `vec4`, and std140's stride for an
array of `vec4` matches tight C++ packing. A struct the catalog does not cover
fails at registration rather than at draw time. An engine that genuinely needs
different memory transforms it downstream.

`TriPoolAllocator` leases payloads from a per-engine arena; `RawData` is the
view over one slice. Values enter through the encoding (matrices transposed,
integers bit-cast) rather than direct layout writes. Transient fill paths are
write-mostly, while persistent owners may read declared fields back across
frames. The arena is rewound rather than freed per payload. Declared defaults
are re-applied on lease; an unwritten field otherwise retains the previous
tenant's bytes, which preserves the source engine's own contract that a fill
writes every field it relies on.

A renderable returns whichever shape its constant data actually has:

- one payload, when a single buffer is bound;
- a `{ vs, ps }` record, when the vertex and pixel stages take DIFFERENT
  payloads and are therefore two separate buffers;
- `null`, when the renderable cannot produce one — no geometry, or no
  accumulator to lease from.

The record itself belongs to one of Carbon's two tiers, chosen statically by
class rather than by a runtime branch. A TRANSIENT record is leased from the
frame arena and dies at reset. A PERSISTENT record is a member the owner keeps
across frames, because it fills the record during update and reads it back
afterwards; `EveSpaceObject2` is the reference case, and `Invalidate` marks it
for re-upload once per frame.

A struct declares the stages it binds to, so one payload bound to several
stages stays one payload rather than being duplicated per stage. The batch
pipeline threads whichever shape it receives without inspecting it.

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
