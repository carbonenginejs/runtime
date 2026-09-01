# Runtime Trinity architecture

Status: Evolving
Scope: `@carbonenginejs/runtime/trinity`
Audience: Runtime authors, engine authors, and maintainers
Summary: Defines Trinity graph ownership and the boundary between portable state and backend realization.

## Purpose

`@carbonenginejs/runtime/trinity` preserves Carbon's serializable object graph and portable
runtime behavior while keeping graphics-device work outside the package.
Trinity classes can therefore be registered, hydrated, inspected, updated, and
serialized in browsers, workers, Node.js tools, and test hosts.

## Composition and data flow

```text
@carbonenginejs/tools-core -- reviewed source --> @carbonenginejs/runtime/trinity
@carbonenginejs/runtime/trinity -- imports --> src/global + src/resource

@carbonenginejs/runtime/resource -- decoded values --> application composition
@carbonenginejs/runtime/trinity -- graph and intents --> application composition
application composition --> host WebGL engine
application composition --> @carbonenginejs/runtime/engine/webgpu
```

Runtime dependencies point from `@carbonenginejs/runtime/trinity` to
`@carbonenginejs/runtime/global` and `@carbonenginejs/runtime/resource`.
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

Trinity classes may carry behaviour. The constraint on this package is that it
stays GPU-free — no live backend handle in a persisted field — not that it is a
values graph. A class that needs methods to match Carbon gets them, and a class
that is currently only fields is incomplete rather than finished.

`TriDevice`, render contexts, targets, authored shader options, effect/material
facades, parameters, buffers, and presentation records remain Trinity graph
classes. Canonical `Tr2EffectRes`, `Tr2Shader`, and immutable reflection records
are resource-owned. Serialized identity never makes either package the owner of
live backend handles.

## Ownership elsewhere

- `@carbonenginejs/runtime/global` owns shared models, schema decorators, math,
  constants, and general runtime primitives.
- `@carbonenginejs/runtime/resource` owns resource acquisition, decoding,
  reusable CPU resource representations, compiled-effect selection/cache, and
  the canonical device-free `Tr2Shader` reflection graph.
- `@carbonenginejs/runtime/character` owns character GState behavior.
- `@carbonenginejs/tools-core` owns source scanning, schema compilation, and
  generated-class emission.
- WebGL and WebGPU engines own devices, contexts, uploads, bindings, pipelines,
  draw or dispatch encoding, presentation, synchronization, and loss recovery.
- Applications or `@carbonenginejs/runtime/core` choose and compose engines and
  domain runtimes.

## Render-job contract

`TriRenderJob` and `Tr2RenderJobs` preserve ordered step execution, resumable
in-progress cursors, nested result mapping, recurring and chained scheduling,
and deterministic target/depth stack cleanup.

`Run(realTime, simTime, context)` accepts either null or the canonical
`Tr2RenderContext`; null selects the shared GPU-free context. The job snapshots
its step list at the start of a run and retains its cursor when a step returns
`RS_IN_PROGRESS`. Every scheduled entry must be a `TriRenderJob`, every enabled
step must extend `TriRenderStep`, and invalid owned identities throw rather than
being diagnosed and skipped. Each step is bracketed by begin/execute/end calls;
end still runs when execution throws. Nested jobs receive the same context.

A render context owns one `CjsTrinityStepExecutor`. `SetStepExecutor` accepts
only that nominal identity or null, with null restoring the shared
`CjsDirectTrinityStepExecutor`. The context calls every required executor
method directly and supplies itself as the fifth step argument. Concrete engine
recorders extend the base; omitting a required method reaches the base method
and throws instead of silently falling back or skipping work.

With `stackGuard` enabled, a job records render-target and depth-stencil stack
depths, diagnoses underflow, and unwinds surplus pushes to the entry depth on
success, yield, or failure. `TriRenderJob` and `TriRenderStep` expose their
status and result vocabularies as class statics.

The default `Tr2RenderContext` is a GPU-free intent and diagnostic surface.
`GetIntents()` returns a copy of the full retained history. An executor uses
`TakeIntents()` for incremental, exactly-once consumption; it advances the
take cursor so nested jobs cannot realize the same intent twice. The package
keeps concrete backend recording and dispatch inside the selected engine.

## Vertex-declaration matching

`Tr2VertexDefinition` pairs a mesh's vertex element list with a vertex shader's
declared inputs and returns a resolved binding plan. Engines consume the plan;
they do not re-derive it, and a WebGL engine caches it as a vertex array object.

Matching is by semantic and index only — never data type, format, offset, or
stream — so a float3 POSITION0 in the mesh satisfies a float4 POSITION0 in the
shader. Interning is stricter than matching: a handle is issued per element
list compared field for field, because the same semantics packed differently
need a different input layout. That handle is what a batch carries and what
binning and sorting compare.

A shader input the mesh cannot supply is reported as unmatched rather than
resolved. Carbon fabricates an element so input-layout creation still succeeds
and a WebGL engine disables the attribute and substitutes a constant zero; both
mean "supply nothing here", and choosing between them is the engine's, so the
plan carries the shader's declared type and stops.

## Frame contract

Core's `CjsFrameDriver` runs Carbon's backend-neutral frame body in order:
throttle, GPU sync, viewport publication, profiler open, the frame-clock
publication, the scene bracket, reserved quad indices, render jobs, profiler
close, scene close, and frame close. It requires the exact Trinity render
context and render-jobs identities and passes that same bracketed context into
the jobs. Trinity owns those graph and schedule objects; core owns their frame
composition.

Two parts of that order are load-bearing. The entry and exit are deliberately
asymmetric: the scene close rewinds the per-object pool before ending the
scene, so every transient payload dies inside the bracket that leased it.
And presentation is not part of a frame — the previous frame is presented at the
top of the next tick, before the frame body, which is what overlaps CPU and GPU
work. The tick belongs to an engine, as it does in Carbon's per-backend device.

`Tr2RenderContext` carries the frame clock, because the frame counter and
animation time are read by the render path and advanced by the tick. Trinity
does not advance them; core's driver does.

## Render-batch contract

`Tr2RenderBatch`, `TriRenderBatchAccumulator`, and `TriRenderBatchMap` collect,
sort, group, and expose neutral CPU data, including the area-block collectors
used by overlay and shadow passes. Geometry references, effect keys, per-object
values, render modes, and draw arguments describe work; they are not live GPU
resources.

`Tr2QuadRenderer` likewise owns the CPU byte boundary for instance records.
Producers pack Carbon's mixed-width layouts, including float16 tails, before
submission; the renderer performs raw byte copies into its merged buffer.
Engines upload those terminal bytes without reserializing the record.

A mesh batch leaves collection with its draw arguments already computed, as
Carbon computes them. The mesh path resolves the LOD for the caller's screen
size, and `Tr2RenderBatch.resolveDrawArguments` turns that LOD's geometry data
into an index count, start index, and base vertex. Two of those inputs are
suballocation bases that only a realizing engine knows; they read off the
geometry resource's allocations and default to zero, which is the correct
answer for an engine that gives each mesh its own buffers instead of pooling
them. No GPU handle crosses the boundary — the batch asks an allocation for two
integers. A batch whose draw arguments are filled after collection has already
missed `Finalize`, which sorts and stamps group runs.

`CjsBatchManager` is the current GPU-free orchestrator. It registers producer
types and scene-global collectors before `Initialize`, verifies required
producer types, creates one map of accumulators, and clears it for each
collection. For each pre-culled renderable it invokes an injected `Realize`
hook before `Build`, or falls back to the renderable's `GetBatches`. It then
collects transparent work back-to-front, invokes global collectors, and calls
`Finalize` before returning the map.

Every object admitted to that path implements the Trinity-owned
`ITr2Renderable` contract. Carbon's default `IsVisible` remains concrete; the
four required batch, transparency, sorting, and per-object-data methods throw
on the root. Carbon's direct providers inherit the contract through a mixin so
their existing model ancestry remains intact. The batch map, batch manager,
and `ReflectionRenderable` component registration call or validate that owned
contract directly; they do not capability-probe required methods.

Backend realization, finalized-batch dispatch, pass policy, production
composition, and concrete global collectors remain engine or application
work. Rebuild tokens stay on the object or child that declared them; a realizer
consumes the tokens for work it successfully completes.

### Instance-stream contract

`CjsInstancedMeshManager` is the dependency-free registration boundary between
Trinity's CPU object graph and engine-owned physical instancing. Trinity calls
the required methods directly, registers terminal `RawData` rather than a
duck-typed provider, and retains only opaque handles for later update/removal.
The child retains the issuing manager independently; it never reads or repairs
handle fields, so frozen objects and primitive handles are valid. Each
supporting engine must extend the contract and realize those handles; Trinity
does not own the GPU manager.

`EveChildInstanceMeshRenderer` and `Tr2RuntimeInstanceData` own the logical
current/previous transforms, bone index, 100-byte record packing, bounds, and
vertex-element declaration for distributed meshes. The transform matrices stay
in logical gl-matrix form until `SetTransformInstances` writes the established
three-row instance representation; this is an instance-stream packing boundary,
not a `RawData` constant-buffer transpose.

The canonical declaration uses stream-one `TEXCOORD8` through `TEXCOORD14`.
Carbon's renderer currently declares indices 0 through 6, which overlap mesh
semantics and do not match the measured shader inputs; engines consume the
canonical declaration and bytes without renumbering them. Physical instance
buffers and readiness remain engine realization.

Smart-light faction palettes have two owned representations: Carbon-compatible
indexed arrays and SOF named-field models exposing static `Types` plus
`Get(index, out)`. Trinity resolves either representation once into
caller-owned colour storage; it does not probe arrays through a fake `length`
contract on SOF models.

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

### Cascaded-shadow contract

`Tr2ShadowMap` owns cascade endpoint policy, D3D clip-cube projection, light-
space bounds, shimmer-stable orthographic frusta, ranges, and the fixed
`PerSplitData` record. `ShadowMatrixVal` contains logical gl-matrix matrices;
the scene composes them with inverse view and atlas transforms, then
`RawData.SetAndTransposeIndex` performs the one terminal packing transpose.
Engines must not transpose, rebuild, or reinterpret those matrices.

Physical shadow work uses the nominal `CjsShadowMapExecutor` installed once on
the active `Tr2RenderContext`. Engine implementations extend that base and
realize atlas allocation, split-pass begin/end, screen-result drawing, and
optional denoising. Every base method throws, and `Tr2ShadowMap` calls the
installed executor directly, so a missing engine capability cannot degrade to
a silently skipped shadow pass.

### Froxel-fog contract

`Tr2VolumetricsRenderer` owns Carbon's per-attribute priority blending, fog
quality/state, planet inputs, and writes the inline `FroxelPerFrameData` fields
through the scene's canonical `RawData`. `EveChildFogVolume` returns one stable
settings record that includes movement and log-thickness attributes. The
promoted scene driver must call `EveSpaceScene.UpdateFogSettings()` after
lighting overrides and before visibility/gather; that orchestration caller has
not landed yet. The renderer is scene-owned and its per-frame fill is already
called directly, so a missing owned method fails visibly.

Physical froxel and volumetric textures, fog passes, environment-map updates,
variable-store texture publication, and volumetric shadow draws remain engine
realization. `CjsVolumetricsExecutor` is the nominal throwing base installed on
the active render context; the maintained graph class delegates the exact
Carbon-shaped calls directly to that executor. Engines consume the blended
values and terminal RawData bytes; they do not re-run the priority policy or
repack constants.

Fog providers implement the maintained nominal `ITr2FroxelFogSettings`
identity. Its base method throws; `EveChildFogVolume` supplies the concrete,
stable record. The component registry validates that owned identity once at
composition, and the renderer calls `GetFroxelFogSettings` directly in the hot
blend path.

### Post-process renderer boundary

`Tr2SSAO` and `Tr2PostProcessRenderer` are maintained post-process graph
classes. Trinity owns their authored settings, enum vocabulary, and portable
quality controls. `Tr2SSAO.Filter` and `Tr2PostProcessRenderer.Execute` retain
their exact Carbon-shaped signatures as explicit throwing obligations because
they allocate temporary textures, dispatch compute work, and perform physical
render passes. A later engine contract must realize those calls without moving
the quality/settings policy out of Trinity.

### Curve-line boundary

`Tr2CurveLineSet` owns editable CPU line records, deterministic segment counts,
and Carbon's incremental local bounding sphere for straight, sphered, and
Hermite-curved lines. `EveCurveLineSet` adds local/parent SRT composition,
frustum visibility, renderable collection, and standard Eve VS/PS per-object
records. Its matrices remain logical until `RawData.SetAndTranspose` performs
the sole packing transpose.

`EveConnector` is maintained CPU graph policy over that concrete line-set
contract. It samples nullable vector functions at the active update time and
emits the selected point, anchor, circle, orbit, or ellipse records through
direct `EveCurveLineSet` methods. The connector owns the canonical
`ConnectorType` vocabulary; no generated enum or alternate renderer path
remains. `EveLineContainer` owns the ordered rebuild: it clears one authored
line set, updates and appends every connector directly, then submits the
resulting CPU records and delegates visibility and bound queries.
`EveProjectBracket` projects an authored track through the active
`Tr2RenderContext`, using its camera, viewport, and animation time to preserve
Carbon's docking, visibility, callback, offset, and rounding policy.
`EveTacticalOverlay` owns the scalar range policy, curve sampling, visibility
and subdivision decisions, effect-local variable store, and flat anchor,
connector, and velocity instance records consumed by `Tr2QuadRenderer`.
Effect identity remains distinct even when two authored effects have the same
content hash; the quad renderer owns the terminal CPU merge.
Carbon detaches the overlay-local variable store in its deterministic
destructor. The JavaScript graph has no destruction hook, so the overlay and
its authored effects currently share one graph lifetime; an eventual nominal
graph-lifecycle contract must own explicit detachment.

Physical line vertex streams, declarations, and draw submission remain an
explicit `Tr2CurveLineSet.GetBatches` engine obligation. The base throws until
that realization exists; visibility and constant production do not silently
pretend the line stream is drawable.

### Constant-data ownership

Trinity owns the constant-data layout outright: field names, element counts, an
encoding kind per field, and the byte offsets. There is ONE layout and no
per-engine packing, because these buffers are not backend-specific — every
backend declares them as a flat array of `vec4`, and std140's stride for an
array of `vec4` matches tight C++ packing. A struct the catalog does not cover
fails at registration rather than at draw time.

Engine storage may differ: buffer type, ring or arena allocation, binding
offset and alignment, upload call, and lifetime are backend concerns. Those
choices may add padding BETWEEN record allocations, but they do not change a
record's field order, field offsets, encodings, or stride. A consumer with a
genuinely different representation needs an explicit compatibility transform
after canonical `RawData`; that does not define a second engine layout, and no
current backend requires one.

`TriPoolAllocator` leases payloads from a per-engine arena; `RawData` is the
view over one slice. Values enter through the encoding (matrices transposed,
integers bit-cast) rather than direct layout writes. Transient fill paths are
write-mostly, while persistent owners may read declared fields back across
frames. The arena is rewound rather than freed per payload. Declared defaults
are re-applied on lease; an unwritten field otherwise retains the previous
tenant's bytes, which preserves the source engine's own contract that a fill
writes every field it relies on.

### The dirty flag is a write barrier here, and is not in Carbon

A record is marked dirty by any write through `Set`, `SetIndex`,
`SetAndTranspose` or `SetAndTransposeIndex`, as well as by `Zero`, `CopyFrom`
and the explicit `Invalidate`. Reading never marks it. An engine uploader skips
a clean record and calls `ClearDirty` once the bytes are on the device.

**This deviates from Carbon deliberately.** Carbon marks a buffer dirty only
through `InvalidateBufferData`, called once per frame from the owner's async
update, and can afford to: its grouped render path refills per batch
unconditionally, the dirty protocol exists on only one of its per-object data
classes, and one of that class's overloads is excluded on DirectX 11, where the
buffer is rewritten every time regardless. The flag is barely load-bearing
there.

It is load-bearing here, because an engine uploader honours it. Thirteen sites
in this package create a persistent record and two call `Invalidate`, so under
Carbon's rule every other record — including the per-frame view and projection
matrices — would upload once and then hold its first frame's values, reporting
nothing.

The failure modes are not symmetric, which is what settles it. A missed
invalidation renders stale data with no error at all; a redundant dirty costs
one upload that was going to be correct anyway. `Invalidate` remains for a
caller that changed something without writing through the record.

A transient arena record never clears its flag, which is correct rather than a
leak: it is filled and consumed within one frame, so `ClearDirty` means "these
bytes have been uploaded", never "this payload is now stable".

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
