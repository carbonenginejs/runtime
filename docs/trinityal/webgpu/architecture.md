# Architecture and boundaries

Status: Experimental
Scope: `@carbonenginejs/runtime/trinityal/webgpu`
Audience: Renderer and resource-system integrators
Summary: Defines what the WebGPU engine package owns and what callers must supply.

## Purpose

The package turns validated, already-selected Carbon WebGPU descriptors and explicit
caller data into generation-bound WebGPU objects and encoded draws.

The live Trinity integration uses an injected abstraction-layer context; see
[Current AL draw path](#current-al-draw-path). The explicit-descriptor APIs and
internal harness adapters described elsewhere on this page remain available,
but are not the mechanism by which Trinity submits its batches.

## Current ownership

`CjsWebgpuPackage` normalizes decoded package data into mutable shader,
pipeline, layout, and resource descriptors. `CjsWebgpuDevice` owns native
device interaction: shader preparation, pipeline creation, buffer and 2D
and 2D-array texture upload, sampler realization, binding sets, draw encoding,
submission, loss handling, and recreation.

Objects created by a device carry its generation. Recreation invalidates old
pipelines, geometry, textures, samplers, binding sets, and draws while allowing
their owned native resources to be destroyed safely.

## Caller boundary

The caller selects effect variants and supplies explicit render state, vertex
layouts, packed geometry, texture pixels, sampler descriptors, resource
bindings, and complete uniform values. The device does not infer those values
from shader names, SOF data, or scene objects.

Uniform packing is runtime-owned and backend-neutral. Trinity's canonical
`RawData` layouts perform the required logical matrix-to-register-row encoding;
the WebGPU device upload itself remains a byte copy. An already encoded
`RawData` payload must therefore not pass through a semantic serializer or be
transposed a second time.

## Per-object data boundary

**Settled 2026-07-28: there is ONE layout, not one per backend.** The
`RawDataStore` seam was designed to keep WebGPU and WebGL packing independent,
on the assumption that their physical layouts would differ. They do not. Every
backend declares these buffers as a flat vec4 array — WGSL
`array<vec4<f32>, N>`, GLSL `vec4 cbN[N]`, or a std140 block wrapping
`vec4 data[N]` — and std140's stride for an array of vec4 is 16 bytes, the same
as tight C++ packing. The std140 rules that *do* differ (vec3 padded to 16,
scalar array stride) never engage, because there are no struct members to pad.

So Trinity carries Carbon's layout directly, in
`src/trinity/core/rawData/CjsPerObjectLayouts.js`, and a packer is no longer
required. There is no packer injection seam, and none is planned: an engine
that genuinely needed a different physical layout would have to introduce one
first, and no backend has produced that need. This
harness serializer at `test/trinityal/webgpu/harness/spaceObjectMainUniforms.js` packs tight
C++ layout rather than std140 — `Sun.DirWorld` is a vec3 at byte 640 followed
immediately by `unused_pad0` at 652 — which is the same conclusion reached
independently, and its four buffer sizes (736/1888/464/464) are exactly what
the Trinity layouts compile to.

Matrices are always stored transposed, and the accessors enforce it:
`SetAndTranspose`/`GetTransposed` for matrix fields, `Set`/`Get` for everything
else, each throwing on the other's fields. There is no `SetRaw`.

The engine still owns GPU allocation, stage-slot binding, upload, and lifetime.
WebGPU ring offsets and their device alignment remain a separate allocation
concern, not the `RawData` struct stride.

Package reflection is not the source for constant layout, and a general packer
is not required. Shared `cb1` through `cb4` need none, because Trinity
carries Carbon's layout directly as settled above. Local material `cb0`'s named
constant offsets belong to the effect's own reflection — `Tr2Shader.GetConstant`
carries each constant's name, offset and size — which is why the bounded Main
serializer can use the reviewed Carbon ABI rather than deriving a stride from
the WGSL minimum. A package's own records expose only register identity,
visibility and an active-prefix minimum binding size, and asking them for more
is the wrong direction.

**That layering defect is closed.** The harness serializer moved from `src/` to
`test/trinityal/webgpu/harness/spaceObjectMainUniforms.js`; its analysis-chunk fallback was
deleted rather than moved — a material layout is now a required argument with no
default. Engines consume the resource-owned `Tr2Shader` reflection graph through
`MaterialLayoutFromShader`; a second engine package has no format-record path to
copy. A harness fixture may still state the layout its own package declares,
which is fixture convenience rather than an engine path.

Copying a matrix **between two records** is the one operation the accessor pair
does not express. `GetTransposed`/`GetTransposedIndex` return the stored value,
which is already transposed, so feeding that straight into `SetAndTranspose`
transposes a second time and stores the logical matrix where the transposed one
belongs. Double transpose is identity, so nothing throws and nothing looks wrong.

There is deliberately no raw-copy accessor to reach for — see the rationale at
the head of Trinity's `RawData`. A producer that owns the logical
matrix should hand that to `SetAndTranspose` and let it transpose once, which is
what `EveCustomMask` does. A record-to-record copy needs a genuine slot copy, not
the accessor pair.

Carbon WebGPU bytes can be decoded by an injected reader. Offline corpus tooling can
produce packages for qualification, but it is not an engine dependency.

<a id="trinity-batch-boundary"></a>

## Harness batch adapter

Separate from live AL submission, the internal
[dispatcher](../../../src/trinityal/webgpu/core/CjsWebgpuTrinityBatchDispatcher.js)
consumes nominal `Tr2RenderBatch`, `ITriRenderBatchAccumulator`,
`TriRenderBatchMap` and an injected `CjsTrinityBatchResolver`. Composition
validates identities once; subsequent calls are direct. These adapters are not
public package-root exports.

Resolvers own packages, geometry, textures, samplers and values. The dispatcher
owns each batch's binding set and rolls it back if draw creation fails.
Geometry-source batches may receive a complete indexed/non-indexed `draw`
override; explicit batch arguments remain supported. Unsupported topology and
incompatible recipes are rejected.

Accumulator vectors retain order, GDPR first, using non-indirect fallback draws.
Adjacent groups share pipeline/vertex/**index** bindings; bind groups remain
per batch. Unlike Carbon's precomputed partition, runs are derived at encoding
time and include index-buffer identity because these geometries need not share
one global buffer. Sorting remains Trinity's responsibility. See
[grouping implementation](../../../src/trinityal/webgpu/core/CjsWebgpuEncodeState.js).

Batch maps preserve insertion order. Resolvers receive the same shallow-copied,
unfrozen preparation context, with numeric `batchType` for map preparation.
Callers own batch-type meaning, technique/pass selection and compatible passes.
The synchronous [pass encoder](../../../src/trinityal/webgpu/core/CjsWebgpuTrinityPassEncoder.js)
accepts an existing caller-supplied command encoder, ordered descriptors and
prepared-map selections; multiple types may
share a pass or use separately prepared maps. Configuration must also be
synchronous. It ends every begun pass, including on failure, but does not own
attachments, command-buffer completion or submission.

The [harness guide](guides/webgpu-harness.md#synthetic-eve-family-comparisons)
owns synthetic-family gates. They do not load production EVE assets or establish
production frequency/scheduling. Decoded-data boundaries remain unchanged when
format readers move; only the injected reader/material resolver changes.

## Dynamic uniform offsets

`CreateDraw` takes `dynamicOffsets` keyed by binding identity. Every dynamic
binding requires a device-limit-aligned offset; missing offsets do not default to zero.
Package/layout dynamic flags must agree. Bind resources specify the shader's
**window**, not the whole buffer. The device orders offsets by binding number
within each group and rebinds dynamic groups on every draw, even if their object
identity is unchanged. See [offset validation and draw encoding](../../../src/trinityal/webgpu/CjsWebgpuDevice.js).

Storage `GPUBufferBinding` values supplied through `resources` remain caller-owned; this API creates and
owns uniform buffers only.

## Textures

The adapter supports uncompressed 8/16/32-bit and BC1–BC7 formats, mip chains,
and 2D, 2D-array, cube and cube-array views. BC requires
`texture-compression-bc`, checked before creation. Inputs are **layer-major**:
each layer's complete mip chain. Multi-level chains upload per layer/level;
single-mip inputs may upload all layers together. Compressed footprints
use block rows (`ceil(height / 4)`), including a complete block for tiny mip
levels; uncompressed formats use the same calculation with 1×1 blocks.
See [texture layout](../../../src/trinityal/webgpu/core/textureLayout.js) and
[device upload](../../../src/trinityal/webgpu/CjsWebgpuDevice.js).

## Pipeline caching

For the explicit-descriptor API, program identity/dedup belongs upstream;
backend pipeline caching belongs here. `PreparePipeline` takes an explicit
`identity`; omission means uncached preparation. A common descriptor name such
as `Main.pass0` is not program identity.

The [cache](../../../src/trinityal/webgpu/core/CjsWebgpuPipelineCache.js) uses
exact canonical keys, not hash-only keys. Entries are generation-bound and
cleared on loss, recreation and destruction. Concurrent callers share one
build; failed builds are evicted rather than poisoning the key.

<a id="planning-a-frame-from-recorded-intents"></a>
<a id="executing-a-planned-frame"></a>

## Current AL draw path

Trinity calls an injected AL through `Tr2RenderContext.SetRenderContextAL`;
without one it uses the headless stub. The WebGPU implementation is
`CjsWebgpuRenderContextAL`. It is internal, not a public package-root export;
repository composition uses the private build entry. The public descriptor API
above is a separate supported surface, not an AL installation recipe.

1. Trinity's `RenderBatchesInOrder` walks the finalized accumulator, applies
   standard states, per-object constants, shader pass state and material data,
   then calls `SubmitGeometry`. The AL receives binding and draw calls, not
   batches to resolve later. Geometry descriptors are realized at first submit
   through the context's suballocated buffers.
2. AL setters retain bound program, render state, declaration, streams and
   resources. Each draw's `EmitRenderPipelineState` resolves the accumulated
   description, reuses a cached pipeline or creates one synchronously through
   `createRenderPipeline`. Unsupported state can still refuse a draw; this
   path is not evidence that every Carbon rendering feature is implemented.
3. `CjsWebgpuResourceSetAL` resolves stage/register bindings for the linked
   program at draw time. Constant buffers retain CPU shadows; the frame's
   constant arena supplies upload regions and dynamic offsets. Texture resources
   are realized on first bind. These are AL-owned objects, not a second batch
   resolver supplied by the application.
4. `BeginScene` starts the work queue, resets the constant arena and render
   targets. The queue opens passes lazily and consumes render-pass hints.
   The canvas view is acquired at the first pass and reused within the frame.
5. `EndScene` closes the last pass, clears bound program/resource-set/vertex-layout
   state, finishes and submits the command encoder, and releases the frame view.
   It is synchronous; no asynchronous batch-preparation phase follows Trinity's
   render-job execution.

`PlanFrame`, `CjsWebgpuFrameExecutor` and `CjsWebgpuTrinityStepRecorder`
were removed with the render-intent queue. Do not restore them to integrate a
backend. Source owners:
[Trinity context](../../../src/trinity/core/context/Tr2RenderContext.js),
[WebGPU AL context](../../../src/trinityal/webgpu/CjsWebgpuRenderContextAL.js),
[resource sets](../../../src/trinityal/webgpu/CjsWebgpuResourceSetAL.js) and
[work queue](../../../src/trinityal/webgpu/core/CjsWebgpuWorkQueue.js).

## Attachments and the presentation surface

`CjsWebgpuRenderTarget` owns canvas configuration, the depth and multisample
attachments, their size, render-pass descriptors, and viewport and scissor. It
does not own when a frame happens or which passes exist; those belong to the
AL work queue and to Trinity's steps.

Carbon's render context owns a swap chain and a depth-stencil surface. WebGPU's
model is a pass descriptor with attachments fixed before the pass opens, so this
is one of the places the two backends implement the same frame progression
differently rather than a port.

Three rules are enforced rather than documented, because each fails silently
otherwise: a canvas texture view is valid for exactly one frame and a reused one
is rejected; depth and multisample attachments are recreated on resize so they
cannot disagree with the colour attachment; and every attachment is bound to a
device generation, so device loss forces reconfiguration instead of reusing
surfaces belonging to a device that is gone.

Clearing is a load operation on an attachment, never a draw, which is what lets
a later pass over the same target composite by loading instead.

The browser presents a configured canvas after submission. This does not
remove Trinity's presentation verbs; the AL submission lifecycle is described
above.

## Current non-goals

The engine imports the GPU-free resource and Trinity classes whose identities
it consumes. It does not import `core`, which remains the composition root. The
engine does not load GR2 or CMF geometry, resolve resource paths, extract scene
state, choose production material or per-object values, translate complete
Carbon render state, infer batch-type pass policy, or schedule a render loop.
Trinity executes render jobs and calls the AL directly; the backend does not
consume a retained Trinity intent stream.

The public texture adapter accepts the explicit inputs listed under
[Textures](#textures). Harness-owned native resources may cover shapes outside
that adapter; they do not extend its public contract.

## Related documentation

- [Public API reference](reference/api.md)
- [WebGPU harness](guides/webgpu-harness.md)
