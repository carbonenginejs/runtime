# WebGPU harness

Status: Experimental
Scope: `@carbonenginejs/engine-webgpu` browser harness
Audience: Maintainers and shader integrators
Summary: Explains how to run the standalone WebGPU probes and current Carbon WebGPU render gates.

These commands are repository-maintainer checks and require a source checkout
with its development dependencies. The npm artifact ships this reference page,
but it does not ship the `scripts/` or `harness/` implementation.

The portable probe in the maintained plain-JavaScript harness launches a
headless Chromium page through Playwright. The page compiles WGSL, renders a full-screen triangle
into a 4x4 offscreen `rgba8unorm` texture, copies the result through a
256-byte-row-padded buffer, maps it, and verifies all pixels.

The portable probe does not use Deno, TypeScript, a canvas, Carbon assets,
network access, or another CarbonEngineJS package. The Carbon WebGPU integration
commands documented below intentionally consume sibling CarbonEngineJS
packages.

Install the package development dependency and run the portable probe:

```powershell
npm.cmd install
npm.cmd run test:webgpu
```

The portable probe reports a clear skip when the browser exposes no adapter.
Run the required gate on a supported local or CI runner:

```powershell
npm.cmd run test:webgpu:required
```

The required command fails when WebGPU is unavailable. A portable-probe skip
does not close phase zero; at least one documented runner must pass the required
command. Ordinary `npm.cmd test` descriptor tests remain GPU-free.

The browser acquires, prepares, realizes, encodes, and submits through
`CjsWebgpuDevice`. The portable probe uploads its packed triangle and sampler
through an atomic `CreateResourceBundle(...)`. Its 1x1 pixel instead starts as
the canonical decoded RGBA record, passes through
`RealizeRgba8Texture(...)`, and enters a separate guarded adapter
slot before the draw samples the opaque texture handle. The resulting geometry
layout is used for pipeline creation.
Fixture creation and pixel expectations remain harness responsibilities, so
the reusable engine class does not acquire resource paths or infer format/
geometry policy.

The static/skinned QuadV5, PPT-on skinned QuadHeatV5, static and PPT-on
skinned two-pass QuadGlassV5, PPT-off static and PPT-on skinned QuadSailsV5,
PPT-on static and skinned QuadDetailV5, PPT-off skinned QuadOilV5, and
cold/hot PPT-off static QuadHeatV5 modes additionally route each draw through the internal
`CjsWebgpuTrinityBatchDispatcher`. The fixtures
construct the duck-typed fields of a transient `Tr2RenderBatch` inside a
finalized ordinary-batch accumulator and a one-type batch-map shape. The
caller selects the opaque batch type's render pass; injected hooks resolve its
material, geometry source, and object data to the existing WebGPU resources
and assert that the immutable resolver context identifies that opaque type.
Like `Tr2MeshBase.CreateGeometryBatch`, the fixture leaves batch draw counts
zero; the geometry resolver supplies validated arguments from the realized
geometry. This tests
the engine crossing without importing `runtime-trinity`, loading a Trinity
graph, depending on grouped or indirect GDPR optimization, inferring pass
policy, or presenting the prototype as a public composition API.
The final draw is encoded through a one-pass caller-authored plan, which keeps
the MRT attachments and opaque selection explicit.

To compile a candidate module while preserving the existing render/readback
gate, pass WGSL text by file path:

```powershell
npm.cmd run test:webgpu:required -- --compile-wgsl .\artifacts\candidate.wgsl
```

The launcher serves only the candidate text to the browser. It does not import
or depend on a compiler package. Compilation diagnostics include severity,
line/column, byte offset/length, and message; validation remains inside the
same WebGPU error scope.

To build and render a generated copyblit pair with engine-owned geometry,
texture, and normalized/cached sampler plus a fixture-owned uniform resource,
pass both modules:

```powershell
npm.cmd run test:webgpu:required -- --draw-wgsl .\artifacts\vertex.wgsl .\artifacts\fragment.wgsl
```

This path creates the canonical group-0 `cb0`/`t0`/`s0` layout, renders the
generated pair into the same 4x4 target, and verifies the expected pixels. The
fixtures are intentionally self-contained; runtime-resource is not involved.

## Producing indexed Carbon WebGPU inputs

For normal EVE corpus packages, do not add resource acquisition or batch
conversion to this harness. Build them through tools-core, then select the
qualified Carbon WebGPU file named by its exact `outputPath` entry in
`build-report.json`:

From a tools-core checkout, run:

```powershell
npm.cmd run build:shader:webgpu -- --shader-target eve-webgpu --build latest --out .\artifacts
```

Use `--diagnostic` when the purpose is compiler-coverage inspection and
`--force --no-reuse` when an existing output must be transactionally rebuilt.
The JSONL log retains every per-source failure even though terminal progress is
throttled. The engine harness consumes selected output packages; it does not
import tools-core at runtime.

The specialized full-permutation matrix and paired DX11/DX12 QuadV5 commands
below remain explicit compiler/engine qualification. The registered
`eve-webgpu` target currently represents selected medium-tier DX11 SM5.0
`.sm_hi` inputs,
so do not mislabel those broader experiments as tools-core corpus output.

To prepare a real Carbon WebGPU `Main.pass0` without pretending the package contains
vertex-buffer strides, render-target policy, or live resources:

```powershell
npm.cmd run test:webgpu:required -- --prepare-carbonwebgpu .\artifacts\quadv5-main.carbonwebgpu
```

To prepare every distinct pass-ready pipeline from a full permutation-matrix
report in one browser/device session:

```powershell
npm.cmd run test:webgpu:required -- --prepare-matrix .\artifacts\quadv5-all-permutations.json
```

The matrix report retains every permutation/pass occurrence. The harness first
compiles every distinct independently emitted shader module, then prepares each
exact pass-ready shader/layout variant once across both backend records.
Backend, source, variant, example, and occurrence provenance remains attached
to every deduplicated pipeline. Ready render variants must contain exactly one
vertex and one pixel stage. Ready compute variants must contain exactly one
compute stage, preserve the positive three-dimensional thread-group size, and
agree with the independently qualified stage. The browser creates a native
compute pipeline to validate the shader/layout interface but does not dispatch
it. It reports unique render and compute pipeline counts plus covered stage and
pass occurrences, and treats every WGSL warning or WebGPU validation error as a
failure. Unsupported matrix entries are qualification results rather than live
pipeline candidates and are not silently reclassified as prepared.

To prepare every translated body of an all-body (`mode: "all"`) package in one
browser/device session:

```powershell
npm.cmd run test:webgpu:required -- --prepare-bodyset .\artifacts\quadv5-allbody.carbonwebgpu
```

The package is read once. There is one emit, and the document it returns carries
the complete backend body set alongside the selected views, so nothing has to ask
for a second, differently-shaped read. Descriptors are built per translation unit directly
from `unit.shaders` and `unit.layouts[0]`, never through the ANLS-driven stage
list: that list names the selected body only, and its
`(techniqueName, passIndex, stageName)` match carries no body discriminator, so
in a real all-body package `Main.pass0.vertex` names 120 distinct units at once.
Feeding one unit at a time through the existing canonical layout path sidesteps
that structurally rather than by weakening the ambiguity guard.

Pipelines are cached by `unit.sha256`. `unit.key` is a per-package ordinal
(`unit0`, `unit1`, …) that collides across packages and is fit only for
diagnostics. Both emit one `CJS_WEBGPU_PREPARE_MATRIX` document, so the browser
prepares a body set with no browser-side code of its own.

Sharing is reported per pass, not as one aggregate, because the aggregate hides
the case that matters. The expensive `Main.pass0` shares far less than the cheap
passes, so a whole-package preparation is a deliberate one-off cost rather than
the runtime model: prefer lazy per-permutation realization.

Render states are deliberately not realized. A translation unit is stage
bytecode, semantic bindings and layouts; the body set carries no render states
at all, so they must come from portable reflection and an engine reading them
from a unit would be reading a value that does not exist.

### Proving the body-set path equals the selected path

`test/wgsb-equivalence.test.js` compares, for the selected body, the
body-set-derived `pipeline.ToJSON()` against the one the selected package's own
views produce. It is stronger than a pixel comparison and costs seconds rather
than a device: both paths converge on a JSON blob consumed by byte-identical
browser code, so equality of the GPU-determining fields deterministically implies
pixel equality, and a JSON diff names the discrepant field.

This is the evidence boundary: every all-body translation unit is prepared, and
the selected body's unit is proven Node-equivalent to what selection baked in.
Browser draws consume selected packages; there is no separate browser draw that
selects its pipeline directly from the body set. The earlier one-off direct
confirmation step is retired in favor of deterministic equality of every
GPU-determining field before the byte-identical browser path. Do not describe an
all-body package as browser-drawn.

It asserts three things rather than one:

- **complete resolution** — every permutation the manifest pins is resolved, not
  just the one compared. Resolution is what was broken, and a single index proves
  only that one index works;
- **body identity** — the permutation index is resolved from the selected
  package's own recorded selections through the permutation graph's axes and must
  equal the index that package baked in. Without this a green comparison could be
  luck, since any body compares equal to itself;
- **GPU-determining equality** — WGSL payload and entry point per stage, and
  every canonical binding's group, binding, identity, scope identity,
  visibility, layout descriptor and structure stride;
- **bounded divergence** — everything that differs must be an enumerated
  analysis-only field. A translation unit is stage bytecode, semantic bindings and
  layouts; Carbon reflection and render states belong to the description, which
  the body set does not duplicate. Enumerating them means a future drift into a
  GPU-determining field cannot hide inside "they always differed".

It builds both packages **in process**, from CCP source effect bytes. It used to
need a directory of pre-built `.carbonwebgpu` files named by `CJS_WEBGPU_FIXTURE_DIR`;
nobody had one, so this test and the Trinity read-chain test skipped for weeks
while the path they cover stopped working, with 237 synthetic-record tests green
throughout. A pre-built package is fully determined by (source bytes, compiler),
so pinning it stores a guarantee the compiler already gives and rots when the
compiler moves.

What cannot be removed is the need for source bytes, which are game files and are
never committed. So it skips with instructions unless `CARBON_EFFECT_CORPUS_DIR`
points at a source effect corpus at the manifest's pinned build — the same
variable the format proofs use — and every source file's sha256 is checked
against the manifest before it is built:

```powershell
$env:CARBON_EFFECT_CORPUS_DIR = "<dir>"; npm.cmd test
```

To perform the first actual QuadV5 draw, package the same explicitly selected
PPT-on `Main.pass0` body from DX11 and DX12, then pass both Carbon WebGPU files:

```powershell
npm.cmd run test:webgpu:required -- --draw-quadv5 .\artifacts\quadv5-ppt-on-dx11.carbonwebgpu .\artifacts\quadv5-ppt-on-dx12.carbonwebgpu
```

### Array textures

Every harness run creates a device-owned two-layer `2d-array` texture, binds it,
samples both layers in one draw, and asserts each layer's pixels exactly. The
gate is synthetic on purpose: it distinguishes "the array binding works" from
"the shader happens not to read that layer", which no package-driven gate can.

`CreateTexture` takes `layers` and an explicit `viewDimension`. A single-layer
array view is legal and distinct from a plain 2D view, because a shader
declaring `texture_2d_array<f32>` needs the array view whatever its layer count.
Layers are contiguous slabs of `bytesPerRow * height`, so one upload covers all
of them, and a layout asking for the dimension the view was not created with
fails closed — a view's dimension is fixed at creation.

This is a prerequisite for the High `.sm_depth` tier, not only for resource
transforms: the High Quad V5 `Main` pass binds `LightProfileArray` as a plain
`texture_2d_array<f32>` with no transform.

### Resource transforms

The current package accepts exactly version-1 `texture-2d-array` transforms
with `native-or-rgba8` representation and `missingLayer: "reject"`. It validates
both halves of the contract: the ordered input recipe and the post-transform
layout carrying one array binding in the layer-0 slot. An undeclared carrier,
surviving merged-away binding, missing layer, incompatible layer payload, or
unsupported transform shape fails closed.

The fixture harness assembles one array slab from each input in declared layer
order, creates the 2D-array texture, and binds the transformed output. The
manifest records drawn gates for the two-layer HeatDetail merge and the
three-layer static/skinned QuadDetail merge. QuadDetail is drawn at medium and
High tiers; its High groups also carry the forward-light storage resources and
the source-declared `LightProfileArray`.

### Draw-fixture identity, and why no `.carbonwebgpu` is committed

A `.carbonwebgpu` is a derived artifact, fully determined by the source bytes at a
pinned EVE build id plus the compiler version. Committing one duplicates a
guarantee the compiler already gives, costs megabytes that git history cannot
reclaim without a rewrite, and rots silently: a stored package keeps passing a
gate long after it stops representing what the compiler produces, which reads as
green while proving nothing.

`test/fixtures/quadv5/manifest.json` pins the identity instead — per fixture and
backend: source logical path, pinned build id, compiler version, source sha256,
and package sha256 — alongside the rendered golden target bytes, which are the
only part that needs a GPU to reproduce. Rebuild, compare `packageSha256`, and a
compiler change announces itself as a reviewable manifest diff rather than a
silent behavior change. The build is deterministic: two independent builds of
the same source at the same compiler version produce byte-identical packages.

Source `.sm_lo`/`.sm_hi`/`.sm_depth` bytes are CCP game files. Never commit,
fixture, or publish them; fetch them through tools-core at the pinned build id.

`--draw-quadv5` derives the quality tier from the package source-path suffix.
The medium `.sm_hi` body-4 contract has five uniform buffers, 11 fragment
textures, three fragment samplers, and 19 canonical bindings. The High
`.sm_depth` body-4 contract has 25 canonical bindings, including the
forward-light storage resources and `LightProfileArray`. The same command has
drawn both tiers from DX11 and DX12 packages with exact 4,096-pixel comparison
across both MRTs and zero WGSL warnings; the fixture manifest records the
tier-specific evidence.

DX12 declares the unnamed `s0` as an immutable root-signature sampler, so it
reflects through the effect signature (`sourceTruth: carbon-signature-sampler`)
rather than through a stage register as DX11 does. That is the only surviving
difference: the wire record stores a one-byte `borderColor` enum and no dynamic
flag, but the reader resolves both as Carbon does — expanding the enum to four
floats and restoring `isDynamic: false` — so the reflected sampler state is
identical across backends. The gates assert it exactly, and for both.

Use the skinned family gate with the corresponding pair:

```powershell
npm.cmd run test:webgpu:required -- --draw-skinned-quadv5 .\artifacts\quadv5-skinned-dx11.carbonwebgpu .\artifacts\quadv5-skinned-dx12.carbonwebgpu
```

The representative skinned heat gate currently requires medium-quality
`unpackedskinned_quadheatv5` packages with the explicit PPT-on `Main.pass0`
vertex/pixel pair:

```powershell
npm.cmd run test:webgpu:required -- --draw-skinned-quadheatv5 .\artifacts\quadheatv5-skinned-ppt-dx11.carbonwebgpu .\artifacts\quadheatv5-skinned-ppt-dx12.carbonwebgpu
```

The build-3444265 SOF/resource audit correlates this compiled family to 313
ship areas across 205 hulls. The medium-quality body-4 gate requires the exact
five local selections, including `SPACE_OBJECT_PPT_ENABLED=SOPPT_ENABLED`.
The browser command deliberately does not load SOF, production textures,
geometry, per-object defaults, runtime-trinity, or a Trinity graph. It supplies
exact synthetic resources for the 21-binding contract: five uniform buffers,
the vertex bone-transform storage buffer, 12 fragment textures, and three
fragment samplers. Cold and hot cases differ only in `shipData.x`. Heat must
add a spatially varied red response while coverage and MRT1 remain
byte-identical; both MRTs must also match exactly between the DX11- and
DX12-derived packages after `rgba8unorm` target quantization with zero WGSL
warnings.

The skinned heat/detail material-block high-water mark is gated separately
with explicit PPT-on `unpackedskinned_quadheatdetailv5` packages:

```powershell
npm.cmd run test:webgpu:required -- --draw-skinned-quadheatdetailv5 .\artifacts\quadheatdetailv5-ppt-dx11.carbonwebgpu .\artifacts\quadheatdetailv5-ppt-dx12.carbonwebgpu
```

This command requires body `4` with all five local selections, including
`SPACE_OBJECT_PPT_ENABLED=SOPPT_ENABLED`. Its Main pass uses 14 fragment
sampled textures and three fragment samplers. Those are separate WebGPU limit
categories: the gate does not flatten this medium body's 14 textures plus
three samplers into a 17-texture count. Together with five uniform buffers and
the vertex bone-transform storage buffer, the portable pre-transform inventory
contains 23 logical bindings. This is a contract-breadth and material-block
high-water gate, not evidence that HeatDetail is a common-frequency shader.
PPT-on is the representative/default focus for this slice; a PPT-off draw would
not substitute for this coverage.

This exact medium-tier HeatDetail body exposes `Detail1Map` and `Detail2Map`
but no `Detail3Map`. The compiler-emitted transform merges those inputs into
one ordered two-layer binding, reducing the physical sampled-texture count from
14 to 13 and the complete group to 22 bindings. The gate draws three cases
through the assembled array on both backends, proves the detail layer is
sampled, preserves coverage and MRT1, and requires exact paired readbacks with
zero WGSL warnings.

The hull-derived glass gate requires packages explicitly selecting the whole
default `unpacked_quadglassv5` `Main` technique, not only `Main.pass0`:

```powershell
npm.cmd run test:webgpu:required -- --draw-quadglassv5 .\artifacts\quadglassv5-main-dx11.carbonwebgpu .\artifacts\quadglassv5-main-dx12.carbonwebgpu
```

This is a synthetic conformance gate for the shader family identified on the
audited `gb2_t1:gallentebase:gallente` hull; the command itself does not load
SOF or GB2 assets. It rejects anything except body `0`, the six default
non-bindless/PPT-disabled/opaque selections, and both complete Main passes.
Pass 0 must carry `RS_CULLMODE=CULL_CCW`; pass 1 must carry
`RS_CULLMODE=CULL_CW`. The provisional caller-authored recipes map those
states with `frontFace: "cw"` to complementary back/front culling. Opposite-
winding synthetic probes must render on disjoint sides, so disabling culling
or silently running only one pass cannot pass.
Each pass/case is rendered independently into separate attachments. The gate
does not yet prove pass 0 then pass 1 ordering or same-target composition.

The common skinned sibling has a separate PPT-on gate:

```powershell
npm.cmd run test:webgpu:required -- --draw-skinned-quadglassv5 .\artifacts\skinned-quadglassv5-ppt-dx11.carbonwebgpu .\artifacts\skinned-quadglassv5-ppt-dx12.carbonwebgpu
```

The build-3444265 SOF/resource audit correlates
`unpackedskinned_quadglassv5` to 57 ship areas across 57 hulls. It requires
the exact medium-quality body-4 five-axis selection, including
`SPACE_OBJECT_PPT_ENABLED=SOPPT_ENABLED`, both complete Main passes, and 15
canonical bindings. An 8-byte-stride `uint16x4` blend-index stream selects palette
entry 1; entry 0 is zero and entry 1 applies a non-identity horizontal scale
and translation. The two pass readbacks must retain the transformed,
non-overlapping bounds, so an ignored, identity-only, hard-coded-zero, or
wrong-stride skinning path cannot pass.

The SOF uses audited for this effect comprise 54 opaque and three transparent
areas. This synthetic gate deliberately keeps the existing numeric opaque
batch path for both probes; it does not claim production transparent batch
classification, pass scheduling, or composition. It does not load SOF,
runtime-trinity, a Trinity graph, production textures, or authoritative
per-object defaults.

The SOF-authored static Sails path uses the exact PPT-off body-0 pair:

```powershell
npm.cmd run test:webgpu:required -- --draw-quadsailsv5 .\artifacts\quadsailsv5-main-dx11.carbonwebgpu .\artifacts\quadsailsv5-main-dx12.carbonwebgpu
```

The build-3444265 SOF/resource audit correlates `unpacked_quadsailsv5` to 77
opaque ship areas across 27 hulls. Every audited effect authors PPT disabled.
The command requires the exact non-bindless, unclipped, PPT-off, debug-off,
instanced-attachment-disabled body-0 selection and one complete `Main.pass0`;
transparency is not a local compiled axis for this effect.

The skinned Sails family has a separate explicit PPT-on gate:

```powershell
npm.cmd run test:webgpu:required -- --draw-skinned-quadsailsv5 .\artifacts\skinned-quadsailsv5-ppt-dx11.carbonwebgpu .\artifacts\skinned-quadsailsv5-ppt-dx12.carbonwebgpu
```

The build-3444265 resource audit correlates the logical
`unpackedskinned_quadsailsv5` family to 72 opaque ship areas across 33 hulls.
That count is family-frequency evidence, not a claim that the selected
PPT-on body is the representative SOF-authored default. The command requires
the exact non-bindless, unclipped, PPT-on, debug-off body-4 selection and one
complete `Main.pass0`; this effect exposes no local transparency option.

Both fixtures supply synthetic silhouette geometry, textures, and
per-frame/per-object values. The skinned variant additionally supplies a
two-entry `BoneTransforms` table whose second entry is non-identity. Each
variant renders two otherwise-identical
`SailsDetailData` cases: unrotated `[16, 0, 1, 0.65]` and authored
`[16, pi / 2, 1, 0.65]`, using a patterned `SailsDetailMap`. Changing only
that rotation must change at least half of covered MRT0 pixels with spatial
variation while preserving coverage and every MRT1 byte. Both cases and both
MRTs must then match byte-for-byte between the independently derived DX11 and
DX12 packages. The SOF audit found 30 distinct per-area `SailsDetailData`
values, so these are controlled conformance inputs rather than a claimed
family default. The static fixture keeps a static-only synthetic MaterialMap
control at the sail-blend end of the material channel so the rotation response
is observable across the surface; it is not a production texture value.

The static contract has 16 canonical bindings: five uniform buffers, ten
textures, and one filtering sampler. Its vertex `cb3` minimum is 128 bytes and
DX12 reflects `SailsDetailMap` at `t11`. The skinned contract has 17 bindings:
the same resources plus a vertex-stage read-only bone buffer, a 432-byte
vertex `cb3`, and DX12 `SailsDetailMap` at `t13`.
The sparse material buffer reaches 464 bytes because `SailsDetailData` begins
at byte 448. Resource binding follows reflected Carbon names rather than
assuming DX11 register numbers. Both selected passes carry
`RS_ZWRITEENABLE=true`; the provisional caller recipe attaches
`depth24plus`, enables depth writes, and compares with `less` so that state is
actually exercised. This is not yet a frozen WebGL/WebGPU render-state rule.
The harness clears and stores but does not read depth back, overlap multiple
draws, or verify depth ordering. Neither command loads SOF, runtime-trinity, a
Trinity graph, production texture, ship mesh, or authoritative default value,
and neither qualifies production scene construction or pass scheduling.

The static QuadDetailV5 gate requires an exact PPT-on
`unpacked_quaddetailv5` `Main.pass0` pair at medium `.sm_hi` or High
`.sm_depth` quality:

```powershell
npm.cmd run test:webgpu:required -- --draw-quaddetailv5 .\artifacts\quaddetailv5-ppt-dx11.carbonwebgpu .\artifacts\quaddetailv5-ppt-dx12.carbonwebgpu
```

The skinned sibling requires the exact PPT-on
`unpackedskinned_quaddetailv5` `Main.pass0` pair at the matching tier:

```powershell
npm.cmd run test:webgpu:required -- --draw-skinned-quaddetailv5 .\artifacts\skinned-quaddetailv5-ppt-dx11.carbonwebgpu .\artifacts\skinned-quaddetailv5-ppt-dx12.carbonwebgpu
```

The build-3444265 SOF audit finds 587 QuadDetailV5 areas across 257 hull
records, all in `opaqueAreas`. Runtime generation resolves 473 areas across
189 hull records to the static `quad/quaddetailv5.fx` logical path and 114
across 68 hull records to the `skinned_quad/quaddetailv5.fx` path. No record
mixes the paths.
The static share is 80.6% of all audited areas, so it is the representative
first gate; the separate skinned gate targets the remaining logical family.
SOF identifies that static/skinned split but does not identify packed versus
unpacked compiled containers. The launcher therefore validates its explicitly
supplied `unpacked_quaddetailv5` or `unpackedskinned_quaddetailv5` packages
rather than attributing either container choice to the SOF frequency evidence.

The example MCa1 base DNA leaves its two audited static effects PPT-disabled
with both pattern masks bound to `res:/texture/global/black.dds`. A valid real
pattern application,
`mca1_t1:minmatarbase:minmatar:pattern?glacialdrift_minmatar;none;none`,
instead produces two static QuadDetail effects with `SOPPT_ENABLED`,
`res:/texture/projection/gradient.dds`, and
`res:/texture/projection/camo_angel.dds`. This evidence selects the PPT-on
static contract.

The example skinned carrier DNA `aca1_t1:amarrbase:amarr` similarly
emits two opaque `skinned_quad/quaddetailv5.fx` effects with PPT disabled and
black masks. Adding `pattern?glacialdrift_amarr;none;none` enables PPT on both
and supplies the same real projection textures. The audit lists patterns for
only 19 of the 68 skinned hull records, covering 34 of their 114 QuadDetail
areas. Those records expose 139 valid pattern applications, but the catalog
does not measure live use. The ACA1 example therefore proves the authored
PPT-on path without claiming that PPT-on is the majority hull default. Neither
browser command loads its cited DNA, SOF, MCa1/ACA1 geometry, production
textures, authoritative parameter defaults, runtime-trinity, or a Trinity
graph.

Each static package must be exact body `4` with seven local selection axes and
one complete vertex/pixel `Main.pass0`. Its post-transform medium group has 20
canonical bindings: five uniform buffers, twelve sampled textures, and three
samplers. Each skinned package must be its exact body-4, six-axis sibling; it
has no `SPACE_OBJECT_INSTANCED_ATTACHMENT` axis and adds an active blend-index
input plus vertex `BoneTransforms` storage for 21 bindings.
Textures and samplers remain separate WebGPU limit categories; this is not a
17-texture contract. Both variants render the same four synthetic cases that
isolate PPT, Detail1, and Detail2 influence while preserving the controlled
silhouette and MRT1. The skinned readback must additionally observe its
indexed non-identity transform. Both MRTs must match byte-for-byte between
DX11- and DX12-derived packages for every case after `rgba8unorm` target
quantization, with zero WGSL warnings. Neither gate makes a depth-attachment,
depth-write, or depth-ordering claim.

Portable analysis still reports the logical pre-transform inventory:
fourteen medium-tier `.sm_hi` textures or seventeen High-tier `.sm_depth`
textures. The compiler-emitted three-layer transform rewrites the physical
layout to twelve or fifteen sampled textures. The High group additionally
carries four samplers, two forward-light storage buffers, and the
source-declared `LightProfileArray`, for 26 static or 27 skinned bindings.
Medium and High static/skinned gates all assemble the declared layers and draw
them with distinct Detail1/Detail2 responses, paired MRT parity, and zero WGSL
warnings.

The live-ship QuadOilV5 slice uses the exact PPT-off
`unpackedskinned_quadoilv5` `Main.pass0` pair:

```powershell
npm.cmd run test:webgpu:required -- --draw-skinned-quadoilv5 .\artifacts\skinned-quadoilv5-ppt-off-dx11.carbonwebgpu .\artifacts\skinned-quadoilv5-ppt-off-dx12.carbonwebgpu
```

The build-3444265 SOF audit finds 30 opaque QuadOil areas across 25 hull
records. Restricting the evidence to live ship geometry leaves seven areas
across seven hulls: six skinned Sleeper hulls and one static hull. The six
skinned records each emit one opaque `area_hull` using
`skinned_quad/quadoilv5.fx`, `SOT_OPAQUE`, `SOPPT_DISABLED`, and
`GeneralData=[1,0,0,0]`; none lists an applicable pattern. The command itself
does not load those graphs.

Each supplied package must resolve medium-quality body `0` with the complete
five-axis contract: non-bindless, clipping disabled, PPT disabled, opaque,
and debug off. Only the non-bindless and PPT selections were explicit in the
audited package build; the other three retain their compiled defaults. The
canonical group contains 18 bindings: five uniform buffers, the vertex-stage
read-only `BoneTransforms` buffer, ten fragment textures, and two fragment
samplers. The active textures are the environment cube, SSAO, scene shadow,
NormalMap, GlowMap, `OilFilmLookupMap`, AlbedoMap, RoughnessMap, MaterialMap,
and PaintMaskMap. DX12 remaps Albedo/Roughness/Material/PaintMask to
`t7/t8/t10/t11`, so resources are resolved by their independently reflected,
stage-scoped identities rather than DX11 register order. Ten fragment textures
remain below the per-stage 16-sampled-texture limit; the two samplers are a
separate limit category.

The synthetic fixture supplies a two-entry bone table whose second entry is
non-identity and uses harness-authored material, frame, object, geometry, and
texture values. It renders two otherwise-identical cases that replace only
the sRGB `OilFilmLookupMap`: one constant black and one constant chromatic.
Both are one-mip controls, deliberately making the shader's explicit-LOD
sample clamp to the same known level rather than claiming production mip
behavior. The shared synthetic sun direction aligns the oil reflection term
with the transformed surface so the lookup remains observable across the
silhouette; it is not an inferred production light or default.

A passing run requires the indexed non-identity transform bounds, unchanged
coverage and MRT0 alpha, invariant `[0,0,0,255]` MRT1 bytes, and a spatially
varied MRT0 response. The measured gate changes all 635 covered pixels across
all three RGB channels with 18 distinct quantized deltas. Both cases and both
MRTs then match byte-for-byte between the DX11- and DX12-derived packages
after `rgba8unorm` target quantization with zero WGSL warnings. This proves
the bounded compiled shader/resource path, not a production ship render. It
uses the runtime-resource WebGPU format reader but starts no resource manager
and loads no SOF, EVE mesh or texture, authoritative defaults, runtime-core,
runtime-trinity, or Trinity graph. It attaches no depth target.

The older PPT-off static heat gate requires explicitly selected medium-quality
`unpacked_quadheatv5` `Main.pass0` packages:

```powershell
npm.cmd run test:webgpu:required -- --draw-quadheatv5 .\artifacts\quadheatv5-main-dx11.carbonwebgpu .\artifacts\quadheatv5-main-dx12.carbonwebgpu
```

This is a synthetic conformance gate for the shader family identified on the
audited `gb2_t1:gallentebase:gallente` `area_booster`; the command does not
load SOF, GB2 geometry, or production textures. It requires body `0`, the six
default non-bindless/PPT-disabled/opaque selections, and the complete static
Main pass. This older static gate does not substitute for the PPT-on skinned
or HeatDetail gates above. Packed Heat, Depth, Picking, and shadow variants
remain separate work.

The first decal-family gate uses the explicitly selected non-bindless
`unpacked_decalv5` Main pass:

```powershell
npm.cmd run test:webgpu:required -- --draw-decalv5 .\artifacts\decalv5-dx11.carbonwebgpu .\artifacts\decalv5-dx12.carbonwebgpu
```

The full cylindrical surface sibling uses the separately qualified default
`unpacked_decalcylindricv5` Main pass:

```powershell
npm.cmd run test:webgpu:required -- --draw-decalcylindricv5 .\artifacts\decalcylindricv5-dx11.carbonwebgpu .\artifacts\decalcylindricv5-dx12.carbonwebgpu
```

The ray/sphere hole sibling uses the separately qualified default
`unpacked_decalholev5` Main pass:

```powershell
npm.cmd run test:webgpu:required -- --draw-decalholev5 .\artifacts\decalholev5-dx11.carbonwebgpu .\artifacts\decalholev5-dx12.carbonwebgpu
```

The kill-counter slice uses the separately qualified default
`unpacked_decalcounterv5` Main pass:

```powershell
npm.cmd run test:webgpu:required -- --draw-decalcounterv5 .\artifacts\decalcounterv5-dx11.carbonwebgpu .\artifacts\decalcounterv5-dx12.carbonwebgpu
```

The glow slice uses the separately qualified default `unpacked_decalglowv5`
Main pass:

```powershell
npm.cmd run test:webgpu:required -- --draw-decalglowv5 .\artifacts\decalglowv5-dx11.carbonwebgpu .\artifacts\decalglowv5-dx12.carbonwebgpu
```

The cylindrical glow sibling uses the separately qualified default
`unpacked_decalglowcylindricv5` Main pass:

```powershell
npm.cmd run test:webgpu:required -- --draw-decalglowcylindricv5 .\artifacts\decalglowcylindricv5-dx11.carbonwebgpu .\artifacts\decalglowcylindricv5-dx12.carbonwebgpu
```

Add `--capture-quadv5 .\artifacts\quadv5-ppt-on.png` to save a browser-rendered
PNG visualization of the DX11 package's two 64x64 active-pixel MRT readbacks
after the silhouette invariants and byte-exact DX11/DX12 checks pass. DX12 is not
pictured separately because it has already been required to match. This is a
diagnostic view of readback bytes, not another GPU render or a production scene
capture. The capture flag applies only to the unified QuadV5 commands above;
the separate Glass, Heat, Sails, Detail, and decal-family commands do not
currently expose capture output; neither does the QuadOil command.

The launcher rejects identical or misordered inputs and any package that is not
body index `4` with the complete expected selection set, including
`SPACE_OBJECT_PPT_ENABLED=SOPPT_ENABLED`. Static QuadV5 packages carry seven
selections, ordinary skinned QuadV5 carries six, and skinned QuadHeatV5 and
QuadHeatDetailV5 each carry their exact five-axis effect contract.
Static QuadSailsV5 carries its exact five-axis contract; skinned QuadSailsV5
carries its exact four-axis contract. Static QuadDetailV5 carries its exact
seven-axis contract; skinned QuadDetailV5 carries its exact six-axis contract.
Skinned QuadOilV5 carries its exact five-axis PPT-off contract.
The launcher
reads each file directly, decodes it with `CjsWebgpuFormat`, and constructs
`CjsWebgpuPackage`. The runtime-resource format reader participates, but no
resource manager, runtime-core/runtime-trinity runtime, or Trinity graph
participates in this gate.

The browser harness supplies an authored 13-vertex, 36-index silhouette.
The base QuadV5 variants use three explicit filtering-sampler descriptors and
ten generated 8x8 2D texture payloads plus one generated six-face environment
cube; skinned QuadHeatV5 uses 11 generated 2D payloads plus that cube, while
skinned QuadHeatDetailV5 uses 13 generated 2D payloads plus the cube. Geometry,
textures, and material/per-frame/per-object values are
synthetic harness inputs. The gate does not read SOF, source per-object data
from it, or infer production defaults. The 2D textures, geometry, and samplers
are atomically realized and published as one device resource bundle. Its
harness-local structural adapter slot does not assert a `CjsResource` or
runtime integration contract.
`CjsWebgpuDevice.CreateGeometry(...)`
owns the silhouette's native vertex/index buffers, exposes the exact frozen 64-byte
common vertex layout, validates draw capacity and device generation, and
releases all owned buffers idempotently. The skinned gate adds an 8-byte
`uint16x4` blend-index stream at location 1. Every vertex selects palette entry
1; entry 0 is deliberately zero while entry 1 applies a rigid 30-degree
rotation and translation. The readback must show the transformed silhouette
at variant-specific anchors and horizontal coverage bounds, so an
identity-only, hard-coded-zero, or wrong-stride skinning path cannot pass.
`CjsWebgpuDevice.CreateTexture(...)` snapshots and
uploads each `rgba8unorm`/`rgba8unorm-srgb` payload, exposes only a generation-
bound handle, unwraps its private view at the canonical texture binding, and
releases the native texture idempotently. The environment cube remains
harness-owned and is bound as a native cube view because the public engine
adapter supports uncompressed 2D and 2D-array views, but not cube views. Each
sampler passes through
`RealizeSampler(...)`: its complete already-selected `webgpu-sampler` resource
payload is mapped into the exact bundle shape and published through a guarded
structural adapter slot. The operation then calls `CreateSampler(...)`, which
normalizes and caches the immutable
native sampler separately, returns a logical generation-bound handle, and
unwraps it only at a compatible sampler binding. `Sampler0` uses the static
linear/anisotropic state reflected by the DX11 package, including maximum
anisotropy 16; the two dynamic pattern samplers use explicit harness-authored
state. The bundle
owns all three handle categories, while binding sets own none of them.
For each pipeline, `CjsWebgpuDevice.CreateBindingSet(...)` validates canonical
identities, allocates/uploads five engine-owned uniform buffers, creates the
native bind group, and destroys only those owned buffers. Static
`Main.pass0` uses six active vertex attributes and 19 canonical bindings.
Skinned `Main.pass0` uses seven attributes and 20 bindings, including its
vertex-stage read-only bone-transform storage buffer.
Skinned QuadHeatV5 retains those seven attributes and uses 21 bindings: 12
textures, three samplers, five uniform buffers, and the bone buffer. The two
controlled cases are cold and hot. Activating heat must increase only the red
output for at least half of covered pixels, must produce a spatially varied
response, and must leave coverage, alpha, green/blue, and MRT1 invariant.
Skinned QuadHeatDetailV5 retains those seven attributes while using 22
post-transform bindings: 13 textures, three samplers, five uniform buffers, and
the bone buffer. Each backend renders three controlled cases: cold/detail-neutral with
`DetailSelector=0`, cold/detail-active, and hot/detail-active. Activating detail
must measurably change MRT0 from the neutral case, and activating heat must
measurably change MRT0 from the cold/detail-active case. Coverage and every
covered MRT1 byte must remain invariant across all three cases.
DX11 and DX12 assign several material textures to different D3D registers, so
the gate maps their canonical identities through the independently reflected
Carbon resource names. Every case renders into two `rgba8unorm` targets,
checks clear corners, silhouette anchors, bounded coverage, nose/wing/tail
widths, and varied MRT0 color, and then requires byte-exact DX11/DX12 equality
for both MRTs. That equality is measured after `rgba8unorm` target
quantization; it is not a claim of unquantized floating-point shader-semantic
equivalence. Every WGSL warning or WebGPU validation error fails the command.

At medium quality, static QuadDetailV5 uses the same six-attribute synthetic
silhouette and five semantic uniform buffers with 20 post-transform bindings:
twelve sampled textures and three samplers complete the group. Its skinned
sibling adds the 8-byte `uint16x4` blend-index stream and vertex-stage
read-only `BoneTransforms` buffer for 21 bindings. High quality adds three
sampled textures, one sampler, and two forward-light storage buffers, producing
26 static or 27 skinned bindings. Every skinned vertex selects a nonzero palette
entry whose non-identity transform must move the observed silhouette. Both
variants reuse four controlled cases that independently expose pattern
projection, Detail1, and Detail2 influence. They require stable coverage/MRT1
and byte-exact paired DX11/DX12 readbacks for both MRTs, but neither attaches or
qualifies depth.

Skinned QuadOilV5 uses the same two vertex streams and non-identity
`BoneTransforms` table with an 18-binding body-0 contract: five uniform
buffers, one bone buffer, ten sampled textures, and two filtering samplers.
The black/chromatic lookup cases share the same binding-values object and
every realized resource except `OilFilmLookupMap`. The gate requires all 635
covered MRT0 pixels to respond across at least two RGB channels; the current
measured result changes all three channels with 18 distinct deltas. MRT1 and
coverage remain invariant, and both cases require byte-exact paired backend
readbacks. The one-mip lookup payloads intentionally exercise clamped
explicit-LOD sampling rather than production mip selection.

The QuadGlassV5 gates reuse the bounded semantic space-object buffer packer
and common 64-byte vertex stream. The static gate exercises its exact
14-binding contract; the skinned PPT-on gate adds the location-1 blend-index
stream and vertex-stage read-only `BoneTransforms` storage buffer for 15
bindings. Both variants exercise both Main passes. The active textures are the scene
environment cube, autoregistered 2D-array fog volume, NormalMap, GlowMap,
RoughnessMap, MaterialMap, and PaintMaskMap, plus two samplers. The audited
SOF effect also authors AlbedoMap, DirtMap, and DustNoiseMap; they are inactive
in this selected shader body and are deliberately not invented as live
bindings. The environment cube remains harness-owned because the public
texture adapter does not create cube views. The neutral four-layer fog view
also remains a harness-owned fixture resource, although the public adapter now
supports explicit 2D-array uploads.

Each backend renders both cull passes with an opaque PaintMask and a
transparent PaintMask. MRT1 supplies stable `[0, 0, 0, 255]` motion/coverage
bytes. Across every covered pixel, PaintMask red `0` must produce MRT0 alpha
`255`, red `255` must produce alpha `0`, and both passes must preserve the
same MRT1 silhouette. The mask also participates in the shader's RGB
normalization path, so the control must visibly change almost all covered RGB
pixels. Finally, both MRTs must match byte-for-byte between independently
derived DX11 and DX12 packages for every pass and mask case with zero WGSL
warnings. This verifies selected shader execution and paired backend parity;
it does not qualify Depth/Picking techniques, production textures,
authoritative per-object values, or renderer pass scheduling.

The PPT-off static QuadHeatV5 gate reuses the bounded semantic space-object
serializer, 64-byte unpacked static vertex layout, and synthetic ship
silhouette. Its
exact group-zero contract contains five uniform buffers, the environment
cube, neutral white `SSAOMap` and shadow inputs, NormalMap, GlowMap,
AlbedoMap, RoughnessMap, MaterialMap, PaintMaskMap, HeatGlowNoiseMap, and one
filtering sampler. The fixture implements no ambient-occlusion behavior.
DX11 and DX12 assign four material surface textures plus `HeatGlowNoiseMap` to
different D3D registers; the gate maps them by independently reflected Carbon
names.

Both backends render cold `shipData.x=0` and hot `shipData.x=1` cases with a
synthetic nonzero red heat color, because the audited GB2 SOF value is black
and would make the thermal term unobservable. The four material heat curves
retain the production-shaped GB2 values, and the patterned GlowMap plus noise
input produces a spatially varied response. Every covered pixel must retain
opaque alpha and exact `[0,0,0,255]` motion bytes. Hot output may change only
red, may never reduce it, must brighten at least ten percent of the silhouette
with multiple distinct byte deltas, and both MRTs must match byte-for-byte
between DX11 and DX12 for each case with zero WGSL warnings. These values are
conformance controls, not production defaults. The first slice does not
separately isolate subtle noise-distortion strength, depth behavior, actual
ship mesh packing, renderer scheduling, or authoritative heat state.

The DecalV5 command independently requires canonical DX11/DX12
`unpacked_decalv5` provenance, body index `0`, all three default selections,
and a complete `Main.pass0` vertex/pixel pair. Bindless DX12 permutations are
not admitted because their sampled-resource array is outside the current WGSL
slice. The fixture supplies five active vertex attributes, four exact-size raw
GPU-register uniform buffers, one generated environment cube, eight generated
2D textures, and two explicit WebGPU samplers. `SSAOMap` receives a neutral
white texture; this gate implements no ambient-occlusion behavior. The decal
material textures shift by one register after `NormalMap` on DX12, so resources
are mapped through reflected Carbon names. The draw travels through numeric
decal batch type `1`, renders one `rgba8unorm` target, checks clear corners,
silhouette anchors, bounded coverage and varied shading, then requires
byte-exact DX11/DX12 equality after target quantization. These fixture bytes
are deliberately not presented as production per-frame/per-object defaults.

The DecalCylindricV5 command gates the canonical
`unpacked_decalcylindricv5` sibling rather than implementing the shader. It
retains the full DecalV5 BRDF/resource family: environment cube, neutral
`SSAOMap`, shadow, mesh normal, and five authored decal textures. DX11 uses
the authored decal textures at `t4..t8`; DX12 uses `t5..t9`. The canonical
WebGPU layout maps both semantic sets to the same binding sequence, alongside
two filtering samplers and five uniform buffers. Its additional local
`cb0` is exactly one `DecalTextureScaling` vec4; the fixture sets `.w` to `1`
so the cylindrical angle cannot collapse.

Every synthetic vertex uses z `0.5`. The browser renders angular-gradient,
axial-gradient, and white transparency cases for both backends. Because the
default shader writes sampled transparency directly to output alpha,
a CPU bilinear oracle can predict the angular
`atan2(Z,Y)` and axial `X/2+0.5` coordinates independently at every active
pixel. Each case must preserve the same bounded silhouette, compile with zero
warnings, and match byte-for-byte across DX11 and DX12; the angular and axial
alpha predictions may differ by at most two target bytes.

The bounded semantic serializer supplies synthetic `cb0` through `cb2`.
Decal-specific bytes then replace its incompatible generic space-object
payloads with the exact active default spans: `320` bytes for vertex `cb3`
and `16` bytes for fragment `cb4`, whose only consumed lane is
`displayData.y`. These reflected minima are not production struct sizes. Full
renderer-resolved Decal RawData shapes remain `384` bytes for
`DecalVSPerObjectData` and `176` bytes for `DecalPSPerObjectData`. Identity matrices do not prove production
transforms or transposition. The authored cylindrical UVs keep every
single-mip sample footprint inside the texture, making clamp-to-edge
equivalent to DX11's zero-border sampler for this fixture only; the reflected
`-0.75` mip bias remains outside this one-mip gate.

The DecalHoleV5 command gates only the canonical default body of
`unpacked_decalholev5`; it does not implement the shader or qualify every
permutation. Its exact layout has five uniform buffers, two 2D maps, one sRGB
inside cube, and two filtering samplers. Both backends keep the maps at
`t0..t2`; unlike full DecalV5, this body has no DX12 texture-register shift.
The full matrix remains asymmetric: DX12 bindless and instanced bodies are not
covered by this default-only gate.

The synthetic quad supplies local position
`p=(NDC.x,NDC.y,0.5+0.2*NDC.x)` and camera position `(0,0,5)`. The fragment
shader discards a ray when it misses the unit sphere, leaving 2,718 surviving
and 1,378 discarded target pixels on the 64x64 pixel-center grid. A CPU oracle
checks the analytic sign outside a four-pixel near-tangent band. Five
byte-exact DX11/DX12 cases then exercise base and axial transparency, an
interior-white transparency control, a zero hole, and an inside-cube hole.
The oracle predicts the exact `((p.y+1)/2,(p.z+1)/2)` 2D coordinates,
transparency alpha, hole red/alpha blend against constant cube alpha, and the
shader's explicit linear-to-sRGB transfer.

The semantic serializer supplies material/per-frame `cb0..cb2`; exact
harness-owned Decal bytes replace the incompatible generic per-object
payloads with a 384-byte six-matrix vertex `cb3` and the active 16-byte
fragment `cb4`. Full production Decal RawData remains 384/176 bytes. Packed
RawData is already GPU-form and must not be transposed again. Every 2D control has zero outer
texels so WebGPU clamp-to-edge matches the authored DX11 zero-border result at
the tested footprints. A one-mip, constant-alpha cube intentionally does not
prove mip bias, cube face selection, seams, or direction-dependent sampling.

The DecalCounterV5 command applies the same canonical provenance, default
selection, complete-pass, batch-type, warning, validation, and exact
DX11/DX12 target checks to `unpacked_decalcounterv5`. Its smaller layout has
five uniform buffers, one `DecalTransparencyMap`, and one sampler. DX11 and
DX12 reflect the three local material values in different `cb0` orders, so
the gate packs `DecalTextureScaling`, `DecalIntensityData`, and
`DecalGlowColor` by reflected name. Without importing Trinity, the
harness-authored per-object bytes provide the complete six-matrix
`DecalVSPerObjectData` layout and the two-register active prefix of
`DecalPSPerObjectData`: `displayData` followed by `shipData`. It writes the
chosen three-digit ship kill count `731`—inside the shader's `0..999` display
domain—to `displayData.x`, visibility `1` to `displayData.y`, and explicit ship
data to the following register. The runtime transports this value as a
`uint32` and does not itself clamp that display domain. The result must retain
clear corners, produce bounded and varied counter coverage, and match
byte-for-byte across backends. These are conformance inputs, not production
defaults or a finalized RawData integration.

The DecalGlowV5 command applies the same canonical provenance, default
selection, complete-pass, batch-type, warning, validation, and exact
DX11/DX12 target checks to `unpacked_decalglowv5`. Its group-zero contract has
five uniform buffers, `DecalTransparencyMap`, `DecalGlowMap`, and two
samplers. The four local material values also move between DX11 and DX12
`cb0`, so `DecalTextureScaling`, `DecalTextureOffset`,
`DecalIntensityData`, and `DecalGlowColor` are packed by reflected name.
Harness-authored per-object bytes again provide the full six-matrix
`DecalVSPerObjectData` layout and only the shader-active, two-register
`DecalPSPerObjectData` prefix. Both `displayData.y` and `shipData.y` are set
to `1` for decal visibility and ship activation strength respectively; this
shader does not consume the kill-count lane.

The browser renders three cases per backend: both patterned textures, a white
transparency control, and a white glow control. Each case must preserve the
same bounded silhouette and match byte-for-byte between DX11 and DX12. Both
white controls must also change at least half the active pixels with a
substantial average RGB delta, proving independently that both texture
samples affect the result. DX11 sampler `s0` uses zero-border addressing,
which WebGPU cannot express. This fixture deliberately adapts it to
clamp-to-edge and authors a zero red-channel outer texel ring on the
single-mip transparency texture, matching the zero border in the only channel
this shader reads. This is a controlled fixture adaptation, not validation of
general D3D border-address behavior. The values, textures, and sampler
adaptation are conformance inputs, not production defaults, final blend/pass
policy, or a finalized RawData integration.

The DecalGlowCylindricV5 command is a separate gate for the canonical
`unpacked_decalglowcylindricv5` package, not a shader implementation. It
requires the exact default selection, `Main.pass0` state, vertex outputs
`1..9`, cylindrical fragment input `8`, five uniform buffers, two textures,
and one shared filtering sampler, reflected as repeat in U/V with anisotropy
`16` and mip LOD bias `-0.75`. Both backends carry that state identically; DX12
declares the sampler in the root signature rather than on a stage register,
which changes where it is found and nothing about what it says.

The fixture keeps every position z at `0.25`, uses identity decal matrices,
sets `DecalTextureScaling.w` to `1`, and authors asymmetric affine
transparency/glow textures. Six cases per backend cover patterned, white, and
half-value controls. After exact DX11/DX12 target comparison, the browser
inverts the shader's explicit sRGB transfer and requires the half
transparency ratio to remain linear, the half glow ratio to retain its
`2.4` power, and the two sampled terms to satisfy their multiplicative
identity. A CPU bilinear-repeat oracle independently predicts the emitted
angular and axial texture coordinates at every active pixel; collapsed,
planar, or swapped cylindrical inputs therefore cannot pass merely by
producing varied pixels.

The reflected vertex `cb3` minimum is `320` bytes, while the fixture binds the
complete six-matrix `384`-byte source shape. Fragment `cb4` binds only its
active `32`-byte prefix: `displayData` followed by `shipData`. These are
harness-authored register bytes. Identity matrices do not validate production
decal transforms, matrix transposition, parent/bone transforms, or a finalized
RawData packing contract. The single-mip texture fixture also makes the
reflected `-0.75` mip bias inert; WebGPU has no sampler LOD-bias field, so
real mip-chain bias behavior remains outside this gate.

The QuadV5 path supplies semantic material, per-frame, and per-object values
rather than hand-addressed constant-buffer rows. It calls
`buildEveSpaceObjectMainUniformData(...)` directly. That serializer is a
harness module, not part of the shipped package, and it takes the stage-local
material `cb0` layout as a required argument — the fixtures derive theirs from
the package they are drawing, through `MaterialLayoutFromPackage(...)`. It then
packs Carbon's full `PerFrameVSData` (736 bytes),
`PerFramePSData` (1888 bytes), `EveSpaceObjectVSData` (464 bytes), and
`EveSpaceObjectPSData` (464 bytes). The static medium-quality package's WGSL
minimum binding sizes are 384, 512, 352, 416, and 432 bytes; the skinned
package raises the fourth minimum to 432 bytes. WebGPU permits the full Carbon
payloads because each is at least its canonical minimum. This proves the first
bounded Carbon ABI serializer and engine-owned uniform upload path without
asserting a library policy contract. The harness uses deterministic fixture
values for every reflected material constant and bounded struct field, and the
renderer must still supply authoritative production values. Its matrices use
logical gl-matrix storage and are transposed once into the row-oriented cbuffer
register bytes consumed by WGSL. The skinned bone table separately exercises
the shader's already-packed `Float4x3` storage-buffer contract. The GPU geometry
adapter deliberately begins after mesh packing and semantic-to-location
mapping; it is not a `TriGeometryRes` loader or CMF conversion stage. The
bounded decoded-RGBA8 texture payloads and complete selected WebGPU sampler
descriptors are explicit harness inputs that the device realizes and the
shader samples. Feeding texture bytes from actual
reader/CjsResource requests, GR2-to-CMF geometry preparation, authoritative
sampler override selection/Carbon conversion, application registration,
broader texture formats, a uniform scheduler, render-state translation, and
full production resource lifetime remain outstanding. The final engine
publication stage itself is implemented and exercised.

The `--prepare-carbonwebgpu` and `--prepare-matrix` modes read through
`format-webgpu` and `CjsWebgpuPackage`, compile WGSL, create the canonical
bind-group/pipeline layouts, and require zero warnings. Those preparation-only
modes deliberately stop before render-pipeline creation and drawing. The
matrix mode additionally creates validation-only native compute pipelines
through a harness-private helper served to the probe page; it performs no
dispatch and does not widen the render-only public `CjsWebgpuDevice` API.
Unlike the ship-family draw flags, preparation requires no geometry or live
resource fixtures.

The QuadV5, QuadGlassV5, QuadHeatV5, QuadSailsV5, QuadDetailV5, QuadOilV5,
and decal-family commands are direct format/engine integration gates. They
import the runtime-resource WebGPU format reader, but do not start a resource
manager or load `runtime-core`, `runtime-trinity`, or a Trinity graph.

To exercise the real package boundary, pass a Carbon WebGPU package containing the
generated `Main.pass0.vertex` and `Main.pass0.pixel` shaders plus its canonical
WGSL layout:

```powershell
npm.cmd run test:webgpu:required -- --draw-carbonwebgpu .\artifacts\copyblit.carbonwebgpu
```

The Node launcher reads the package through `format-webgpu` and
`CjsWebgpuPackage`, then serves only the validated pipeline descriptor. The
`CjsWebgpuDevice` creates explicit bind-group and pipeline layouts from numeric
groups, bindings, visibility, and nested buffer/texture/sampler layouts.
Fixture resources are selected by canonical scope identity. Version-2
unshared bindings use `@vertex`, `@fragment`, or `@compute` keys even when the
tuple occurs in only one stage; a bare base key is reserved for a confirmed
shared multi-stage binding. Version-1 and unversioned layouts may still
normalize a missing scope to the base D3D key. Descriptor slots are never
hardcoded or renumbered. This bounded gate rejects missing WGSL, unsupported
render states/resources, dynamic offsets, layout holes, and non-canonical
binding provenance before GPU submission.

The real copyblit pass's replacement blend state is translated exactly to
WebGPU (`one`/`zero`, `add` for color and alpha). Other render-state
combinations remain an explicit pre-submit failure.

The launcher prefers an installed Chrome channel and falls back to Playwright's
bundled Chromium. Set `CJS_WEBGPU_BROWSER_CHANNEL` to a Playwright channel name
when a runner needs an explicit browser choice.
