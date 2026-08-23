# Architecture and boundaries

Status: Experimental
Scope: `@carbonenginejs/engine-webgpu`
Audience: Renderer and resource-system integrators
Summary: Defines what the WebGPU engine package owns and what callers must supply.

## Purpose

The package turns validated, already-selected Carbon WebGPU descriptors and explicit
caller data into generation-bound WebGPU objects and encoded draws.

## Current ownership

`CjsWebgpuPackage` normalizes decoded package data into immutable shader,
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

Uniform packing is backend-specific. The bounded space-object Main serializer
owns WebGPU's Carbon cbuffer byte layout and performs the required logical
matrix-to-register-row encoding. The WebGPU device upload itself remains a
byte copy. An already encoded `RawData` payload must therefore not pass through
the semantic serializer or be transposed a second time.

## Per-object data boundary

**Settled 2026-07-28: there is ONE layout, not one per backend.** The
`RawDataStore` seam was designed to keep WebGPU and WebGL packing independent,
on the assumption that their physical layouts would differ. They do not. Every
backend declares these buffers as a flat vec4 array — WGSL
`array<vec4<f32>, N>`, GLSL `vec4 cbN[N]`, or a std140 block wrapping
`vec4 data[N]` — and std140's stride for an array of vec4 is 16 bytes, the same
as tight C++ packing. The std140 rules that *do* differ (vec3 padded to 16,
scalar array stride) never engage, because there are no struct members to pad.

So `runtime-trinity` carries Carbon's layout directly, in
`src/core/rawData/CjsPerObjectLayouts.js`, and a packer is no longer
required. There is no packer injection seam, and none is planned: an engine
that genuinely needed a different physical layout would have to introduce one
first, and no backend has produced that need. This
harness serializer at `harness/webgpu/spaceObjectMainUniforms.js` packs tight
C++ layout rather than std140 — `Sun.DirWorld` is a vec3 at byte 640 followed
immediately by `unused_pad0` at 652 — which is the same conclusion reached
independently, and its four buffer sizes (736/1888/464/464) are exactly what
`runtime-trinity`'s layouts compile to.

Matrices are always stored transposed, and the accessors enforce it:
`SetAndTranspose`/`GetTransposed` for matrix fields, `Set`/`Get` for everything
else, each throwing on the other's fields. There is no `SetRaw`.

The engine still owns GPU allocation, stage-slot binding, upload, and lifetime.
WebGPU ring offsets and their device alignment remain a separate allocation
concern, not the `RawData` struct stride.

Package reflection is not the source for constant layout, and a general packer
is not required. Shared `cb1` through `cb4` need none, because `runtime-trinity`
carries Carbon's layout directly as settled above. Local material `cb0`'s named
constant offsets belong to the effect's own reflection — `Tr2Shader.GetConstant`
carries each constant's name, offset and size — which is why the bounded Main
serializer can use the reviewed Carbon ABI rather than deriving a stride from
the WGSL minimum. A package's own records expose only register identity,
visibility and an active-prefix minimum binding size, and asking them for more
is the wrong direction.

**That layering defect is closed.** The serializer that read those constants out
of the format package has left `src/` entirely: it was harness scaffolding
duplicating an ABI `runtime-trinity` owns, so it moved to
`harness/webgpu/spaceObjectMainUniforms.js`, and its analysis-chunk fallback was
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
the head of `runtime-trinity`'s `RawData`. A producer that owns the logical
matrix should hand that to `SetAndTranspose` and let it transpose once, which is
what `EveCustomMask` does. A record-to-record copy needs a genuine slot copy, not
the accessor pair.

Carbon WebGPU bytes can be decoded by an injected reader. Offline corpus tooling can
produce packages for qualification, but it is not an engine dependency.

## Provisional Trinity batch boundary

The internal `CjsWebgpuTrinityBatchDispatcher` proves the first engine-facing
`Tr2RenderBatch` shape without importing `runtime-trinity`. It accepts the
transient batch's material, geometry source, object-data reference, D3D
topology, and draw arguments. Injected composition hooks resolve those CPU
references to an already-decoded pipeline recipe, WebGPU-owned geometry, and
complete binding values.

The dispatcher owns only the binding set it creates. Geometry, textures,
samplers, decoded packages, and logical values remain owned by their
resolvers. It maps indexed and non-indexed draw arguments, rejects unsupported
topologies and incompatible pipeline recipes, and rolls back its binding set
when draw creation fails.

Mesh batches may carry only a `geometrySource` area range and leave their draw
arguments zero. `ResolveGeometry` may therefore return a complete indexed or
non-indexed `draw` override derived from CPU geometry facts and the engine's
realized buffer packing. Producers with explicit draw arguments continue to
use the batch fields. The dispatcher validates either path before draw
creation.

It also snapshots both vectors of a finalized
`TriRenderBatchAccumulator`-compatible object, preserves their internal order,
encodes GDPR before ordinary batches, and owns the collected binding-set
lifecycle as one unit. GDPR entries use the same non-indirect path as ordinary
entries, matching Carbon's fallback semantics; the indirect-draw sink is a
DirectX 12 and Metal capability that WebGPU has not been given here.

Encoding is **grouped**. Runs of adjacent batches that share a pipeline, vertex
buffers and index buffer hoist those bindings to the run's first batch, as
Carbon's `RenderBatchGroup` hoists them to a group. Two deliberate differences
from Carbon: the index buffer is part of the predicate, because Carbon may omit
it only while every geometry is suballocated from one process-global buffer and
this engine gives each geometry its own; and runs are derived at encode time
rather than read from a precomputed partition. Order is never changed — sorting
belongs to Trinity, and reordering here would break golden-image comparison
between backends.

Bind groups stay per batch. Every prepared batch creates its own binding set
even from identical values, which is where per-object data lives, and Carbon
likewise applies per-object constants per batch.

## Dynamic uniform offsets

A dynamic binding is bound once and re-aimed per draw through the offsets given
to `setBindGroup`, which is what lets many objects share one ring buffer instead
of taking a buffer each. `CreateDraw` accepts `dynamicOffsets` keyed by binding
identity.

Three rules are enforced because each fails quietly otherwise:

- the bind group's own resource describes the **window** the shader sees, not
  the whole buffer, since WebGPU adds the per-draw offset to it;
- offsets are ordered by **binding number within the group**, derived from the
  layout rather than from the order a caller lists them;
- a group with dynamic offsets is re-set on **every** draw even when the bind
  group object is unchanged, because the offsets are exactly what differs
  between two objects sharing a buffer. Eliding that set would draw them all at
  the same slot.

A missing offset is an error rather than a defaulted zero, which would aim every
object at the first slot and read as a scene bug. Offsets must respect the
device's minimum alignment. A binding marked dynamic in the package but not in
its layout, or the reverse, is rejected at preparation: WebGPU would otherwise
reject the bind group much later with a message naming neither side.

Storage buffers are caller-owned and bind through `resources` as a
`GPUBufferBinding`; the engine creates and owns uniform buffers only.

## Textures

The texture adapter accepts uncompressed 8/16/32-bit formats, the BC1–BC7
block-compressed family, mip chains, 2D, 2D-array, cube and cube-array views.
That range exists because real EVE textures arrive as DDS carrying
block-compressed data with full mip chains, and environment probes are cubes.

**Block compression is why the layout is computed rather than assumed.** For an
uncompressed format a row is `width * bytesPerPixel` and a level is `height`
rows. For a compressed one both are wrong: `bytesPerRow` counts *block* rows and
`rowsPerImage` is `ceil(height / 4)`. Passing pixel rows for a BC texture does
not fail loudly — it uploads a fraction of the data and reads garbage. An
uncompressed format is expressed as a 1×1 block so there is one code path and
the compressed case cannot drift from the plain one.

The same rounding keeps a BC mip chain honest: a 1×1 level still occupies a
whole block, so the tail levels of any chain are the same size, and computing a
level's footprint from its pixel dimensions alone under-counts them.

Mip chains are stored **layer-major** — each layer's complete chain, then the
next — because that is how DDS stores an array or a cube. One level across
layers is therefore not contiguous, so a chain is written per layer per level
rather than in one call.

BC formats require the `texture-compression-bc` device feature, which is checked
and named before anything is created rather than left to fail inside
`createTexture`.

## Pipeline caching

Effect realization splits in two. Stage A is program identity and dedup, which
is backend-independent and belongs upstream. Stage B is the pipeline object,
which is backend-owned, and this package caches it.

Both caches are keyed **exactly**, on the canonical serialization rather than a
hash, so two different pipelines cannot collide and there is nothing to recheck.
That is affordable because a recipe is a small POD block.

Program identity is the **caller's to supply**, through a `PreparePipeline`
`identity` option. Shader source is too large to serialize into a key on every
call and this package has no dependency to hash it with. Without an identity a
pipeline is prepared uncached, which is never wrong, only slower. Deriving one
from the descriptor's `key` would be worse than no cache: `Main.pass0` is the
most common pass name in the corpus and never dedupes across effects, so it
would hand back another effect's pipeline.

Everything is bound to a device generation and dropped on loss, recreation and
destruction. Racing callers share one build rather than each creating a GPU
object with one silently winning, and a failed build is not retained, so a
transient device error does not make a key permanently unbuildable.

## Planning a frame from recorded intents

`PlanFrame` partitions the recorder's ordered intent stream into regions that
WebGPU will accept. This is the look-ahead the divergence decision permits: the
executor may plan far enough to form legal passes, provided observable Trinity
ordering survives it.

It is needed because a render pass has fixed attachments and several things
Carbon does mid-pass are illegal inside one. Four cases cut a region: changing a
render target or depth-stencil, compute work, transfer work such as copies,
resolves and mip generation, and presentation.

Clears become attachment load operations. A clear at the head of a region folds
into its load ops for free; a clear arriving after work in the same region cuts
a new one and folds into that. No explicit clear operation and no fullscreen
clear draw is ever required, because cutting a region is always legal.

Order is preserved exactly. Intents are never moved between regions, reordered,
or merged across a boundary — two render regions separated by compute stay
separate even though merging them would be cheaper.

An intent type with no planning rule throws. Treating an unknown intent as
harmless state is how something illegal ends up inside a pass.

The plan is pure: intents in, a plan out, no device and no encoder. That keeps
the part carrying the rules testable without a browser and leaves encoding
mechanical.

## Executing a planned frame

`CjsWebgpuFrameExecutor` walks a plan's regions in order, opens the right kind
of encoder for each, and submits once. Every judgement about what may share a
pass already happened during planning, so this owns only encoder lifetime and
region order.

Two things are injected because they are policy rather than mechanism. Which
prepared batch types belong to a render region is Trinity's meaning, and an
engine deciding it would be inventing scene structure. Compute and transfer
regions need resources this module does not own. Both arrive as hooks.

A planned compute or transfer region with no handler **throws**. Skipping it
would render a frame that looks right and is subtly wrong. A render region that
resolves to no selections is different — that is a legitimate answer, and
opening a pass to draw nothing is waste, so it is skipped. A plan that encodes
nothing submits nothing rather than an empty command buffer.

The canvas texture is acquired once per frame and shared by every region
resolving to the backbuffer. A region targeting something else needs attachments
this module does not own, so its descriptor is the caller's to supply.

## Attachments and the presentation surface

`CjsWebgpuRenderTarget` owns canvas configuration, the depth and multisample
attachments, their size, render-pass descriptors, and viewport and scissor. It
does not own when a frame happens or which passes exist; those belong to the
executor and to Trinity's steps.

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

**Presentation is not a call here.** Carbon presents the previous frame at the
top of the next tick; WebGPU has no present, and the browser presents a
configured canvas after the submission that drew into its current texture. The
engine-side tick wrapper therefore has a real presentation step on WebGL and
nothing to do on WebGPU. That asymmetry is expected, not a missing port.

At the next level it snapshots `TriRenderBatchMap` batch types in insertion
order and prepares each accumulator. Batch-type meaning and render
pass selection remain outside the dispatcher: `EncodeBatchType(...)` requires
the caller to supply the compatible pass for the requested type. This avoids
turning opaque, decal, transparent, or depth policy into shared device code.
Every injected material, geometry, and binding resolver receives the same
immutable preparation context. The batch-map path supplies its numeric
`batchType`, allowing application composition to select the matching effect
technique without the dispatcher importing or interpreting `TriBatchType`.

This class is internal and is not exported from the package root. It is a
conformance prototype, not a frozen renderer API. The static/skinned QuadV5,
common PPT-on skinned QuadHeatV5, PPT-on skinned QuadHeatDetailV5 material-block
high-water gate, independently gated static and common PPT-on skinned
QuadGlassV5 Main passes, cold/hot PPT-off
static QuadHeatV5, independently gated PPT-off static and PPT-on skinned
QuadSailsV5, PPT-on static and skinned QuadDetailV5, PPT-off skinned
QuadOilV5, non-bindless DecalV5/DecalCylindricV5/DecalHoleV5, kill-counter
DecalCounterV5, DecalGlowV5, and DecalGlowCylindricV5 browser gates use its one-type batch-map
path, with the glass fixture keeping complementary pass selection explicit,
the heat fixtures keeping their caller-owned raster recipes and semantic cases
explicit, and the decal fixtures proving that numeric batch type `1` stays
caller-selected. HeatDetail is a material-block breadth gate, not a
common-frequency shader gate: cold/detail-neutral, cold/detail-active, and
hot/detail-active cases isolate its detail and heat response while holding
coverage and MRT1 invariant.
The Heat, HeatDetail, Glass, Sails, and Oil browser gates use Carbon's medium
`.sm_hi` tier. QuadDetail additionally covers the High `.sm_depth` tier.
Compiler-emitted detail-map transforms merge compatible 2D inputs into one
ordered 2D-array binding. The current gates validate that declaration against
the rewritten layout, assemble its layers, and draw the transformed medium and
High QuadDetail packages; the untransformed reflected inventory remains
available as analysis rather than as the physical binding layout.
The build-3444265 common skinned-heat evidence (313 ship areas across 205
hulls) remains a synthetic 21-binding cold/hot conformance gate: it uses the
internal dispatcher shape but imports neither runtime-trinity nor a Trinity
graph. The duck-typed boundary is shaped for future
`runtime-trinity` `Tr2RenderBatch`,
`TriRenderBatchAccumulator`, and `TriRenderBatchMap` instances. A separate
GPU-free package test now drives those real types through the engine dispatcher
and proves the effect-to-package pipeline read chain. It assigns
`Tr2Effect.effectResource` by hand; a production loader still does not own that
write. Frame and pass planning are no longer outstanding — `PlanFrame` and
`CjsWebgpuFrameExecutor` own them, as described above. Selecting the pass for
each batch type stays outside this package by design; it is a non-goal below,
not missing work.

The build-3444265 common skinned-Glass evidence (57 ship areas across 57
hulls) is likewise synthetic and library-free. Its body-4 PPT-on gate adds an
indexed `BoneTransforms` storage buffer to the two complementary Main-pass
draws and observes non-identity transformed bounds. All current probes still
use numeric opaque batch type `0`; the three audited transparent SOF uses do
not yet qualify production transparent classification or scheduling.

The build-3444265 SOF audit correlates the static Sails family to 77 opaque
ship areas across 27 hulls and the skinned-Sails logical family to 72 opaque
areas across 33 hulls. Both browser gates are synthetic and library-free. The
static gate exercises the SOF-authored PPT-off body-0 Main pass; the separate
skinned gate deliberately selects PPT-on body 4 and adds indexed non-identity
skinning. Both exercise the sparse 464-byte material buffer through
`SailsDetailData` and the shader's depth-write render state through a
caller-owned `depth24plus` recipe. The skinned frequency count applies to the
logical family, not specifically to the PPT-on body, and the recipe remains
provisional until the WebGL/WebGPU renderer rules are designed. These gates
do not load SOF, runtime-trinity, a Trinity graph, production textures, or
authoritative per-object defaults.

The build-3444265 QuadDetailV5 audit finds 587 opaque areas across 257 SOF
hull records. Runtime generation separates 473 areas across 189 records onto
the static `quad/quaddetailv5.fx` path and 114 across 68 records onto
`skinned_quad/quaddetailv5.fx`; no audited hull record mixes the two paths.
The static gate selects an exact PPT-on body-4, seven-axis contract. The
separate skinned gate selects its exact body-4, six-axis sibling and adds
indexed non-identity `BoneTransforms`. Both gates reuse four synthetic cases
that isolate pattern projection, Detail1, and Detail2. Texture and sampler
limit categories remain distinct. Portable analysis retains the pre-transform
inventory of fourteen medium-tier or seventeen High-tier fragment textures.
The compiler-emitted three-layer transform rewrites the physical layout to
twelve or fifteen sampled textures, respectively. With uniform buffers,
samplers, forward-light storage, and the optional bone buffer included, the
drawn post-transform groups contain 20/21 bindings at medium and 26/27 at High
for static/skinned variants.

The real `aca1_t1:amarrbase:amarr` base DNA emits two opaque skinned
QuadDetail effects with PPT disabled and black pattern masks. Adding
`pattern?glacialdrift_amarr;none;none` enables PPT with real projection masks.
Only 19 of the 68 skinned hull records list patterns, covering 34 of their 114
QuadDetail areas, so the pattern proves an authored PPT-on path rather than a
majority or live-usage default. SOF identifies static versus skinned logical
paths but not packed versus unpacked containers, body indices, or complete
package axes. Both gates remain library-free conformance probes: they load
neither the audited SOF DNA nor EVE geometry/textures/defaults, import neither
runtime-trinity nor a Trinity graph, and make no depth-policy claim.

The build-3444265 QuadOilV5 audit finds 30 opaque areas across 25 hull
records. Applying the live ship-geometry filter leaves seven areas across
seven hulls: six skinned Sleeper hulls and one static hull. All six skinned
graphs emit `skinned_quad/quadoilv5.fx` with `SOT_OPAQUE`,
`SOPPT_DISABLED`, and only `GeneralData=[1,0,0,0]` as an authored constant.
The separate browser gate freezes the exact medium `.sm_hi` body-0
`unpackedskinned_quadoilv5` Main contract: five uniform buffers, vertex
`BoneTransforms`, ten fragment textures, and two samplers for 18 canonical
bindings. Two otherwise-identical synthetic draws replace only the sRGB
`OilFilmLookupMap`; all 635 covered pixels change across three RGB channels,
MRT1 remains invariant, and both MRTs match byte-for-byte between the
DX11/DX12-derived packages with zero WGSL warnings. The fixture uses explicit
harness-authored values and does not load the cited SOF, ship mesh, production
textures/defaults, runtime-trinity, or a Trinity graph. It makes no
depth-policy claim.

The internal `CjsWebgpuTrinityStepRecorder` proves the synchronous
`Tr2RenderContext.SetStepExecutor(...)` seam separately. It delegates the
step's begin, execute, and end hooks back to the GPU-free context, consumes
`TakeIntents()` exactly once, and records immutable segments in observable
order. Nested jobs are re-entrant: a child step flushes any parent intents
emitted before the child, then the parent resumes after the child. WebGPU
pipeline preparation, pass creation, encoding, and submission remain a later
asynchronous phase; none run inside Trinity's synchronous `Run(...)`.

The internal `CjsWebgpuTrinityPassEncoder` proves the synchronous encoding end
of that split. A caller supplies an existing command encoder plus ordered
render-pass descriptors and prepared batch-map selections. Multiple batch
types may share one pass, and separately prepared maps may be selected when a
different technique is required. Optional synchronous pass configuration can
set viewport or other dynamic state. The encoder ends every pass it begins but
does not own attachments, finish command buffers, submit work, or assign EVE
meaning to a batch type.

The contract consumes already-decoded pipeline data. Moving shader format
readers between format and resource packages therefore does not change this
boundary; only the injected reader or material resolver changes.

## Current non-goals

There is no production or source dependency on `runtime-core`,
`runtime-resource`, or `runtime-trinity`; the latter two are development
dependencies used by integration tests. The package does not load GR2 or CMF
geometry, resolve resource paths, extract scene state, choose production
material or per-object values, translate complete Carbon render state, infer
batch-type pass policy, realize render-job intents, or schedule a render loop.

The public engine texture adapter uploads explicit pixel data as described under
*Textures* above: uncompressed 8/16/32-bit and BC1–BC7 formats, mip chains, 2D,
2D-array, cube and cube-array views. The standalone harness may still create
harness-owned native resources when a shader contract requires a shape outside
that adapter.

## Related documentation

- [Public API reference](reference/api.md)
- [WebGPU harness](guides/webgpu-harness.md)
