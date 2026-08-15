# Carbon WebGPU effect container

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/webgpu`
Audience: Shader-tool authors and engine integrators
Summary: Defines the Carbon v15 record container used for WebGPU effects, its backend block, and its derived compatibility views.

## Purpose

A `.carbonwebgpu` file is a stock Carbon version-15 compiled-effect container whose
program slots carry WGSL instead of DXBC. It preserves every permutation row
and representable non-program description/reflection fields, including
non-dynamic sampler names and the authored stage order. Source-stage
programs are not stored: a translated slot contains WGSL and an untranslated slot is empty.
Each translated pass may also carry one WebGPU backend block containing
bind-group layouts and resource transforms.

That preservation is **inherited, not separately tested.** It holds because the
emit round-trips the description through the same Carbon classes the plain
container uses and mutates only `stage.sourceProgram` and `pass.backendBlock`;
the byte-exact corpus proof covers the shared codec, and no WebGPU-specific test
pins sampler names or stage order. Anything that widens what the emit touches
loses that guarantee silently, so widen it and add the test together.

There is no Carbon WebGPU-specific magic, envelope, payload tag, or container version.
Backend identity comes from the resource path, such as `effect.webgpu/`, just
as Carbon selects `effect.dx11/`, `effect.dx12/`, or `effect.metal/`.
`isCarbonWebgpu(bytes)` is therefore only a Carbon-v15 shape check. It cannot prove
that arbitrary version-15 bytes contain WGSL.

## Wire layout

The shared Carbon container contract is documented in
[Carbon compiled-effect container](../../carbon-effect-container.md). In
outline, the file contains:

- Carbon's version-15 header, compiler version, source-hash slot (zero-filled
  by the current builder), string table, and permutation axes;
- one dense offset-table row for every permutation;
- one stored description tree for every distinct emitted body, with exact
  emitted-description-byte aliases sharing that body; and
- one optional backend block after each pass's render states.

The Carbon region is backend-invariant. Carbon WebGPU substitutes:

- UTF-8 WGSL in each translated stage's `shaderData`;
- the fixed entry point `main`, which is omitted from the wire because every
  current lowerer must emit it; and
- a versioned backend block for bind-group layouts and resource transforms
  that Carbon reflection cannot derive.

A stage with zero program bytes is reflection-only. This is how selected-mode
packages retain untranslated bodies and how unsupported Carbon stage types
remain represented without pretending WebGPU can execute them.

## No stored chunks

The former flat Carbon WebGPU format stored `INFO`, `META`, `PGRF`, `RFLX`, `RBLB`,
`ANLS`, `WGSL`, and `WGSB` chunks. The current wire stores none of them.

Equivalent read surfaces are derived from the one Carbon record tree:

| Former document | Current source of truth |
| --- | --- |
| `INFO` | Carbon version, compiler version, zero-filled rebuilt source hash, and counted records |
| `META` | The resolved permutation and the passes/stages that carry programs |
| `PGRF` | Carbon's permutation axes, dense offset table, and emitted-body aliases |
| `RFLX` / `RBLB` | Representable non-program description fields and exact arena-backed values |
| `ANLS` | A normalized analysis view rebuilt from one description |
| `WGSL` | Program text and layouts read from stage records and backend blocks |
| `WGSB` | A body-set view derived across distinct stored bodies |

`Read` returns these derived views as plain data. They are not independent stored
documents and carry no cross-document digests. There is no `chunks` array and no
generic `Build(chunks)` API.

There is exactly one emit, as there is for WebGL, and the document it returns is
complete: alongside the views above it carries `permutationGraph` and
`backendBodySet`, the latter being every translated body joined to its shared
translation units. A second `raw` emit used to hand back the internal
`CarbonWebgpuContainer` because the former chunk package could not express the
body set in JSON. It is removed. The container is internal, and consumers read
the document rather than binding to a reader object.

## Building

`BuildEffect` accepts version-15 compiled-effect bytes only. It parses the
complete input, resolves the requested permutation, lowers selected programs,
and writes a new Carbon v15 container. Source-stage program bytes and the
caller's source hash are not retained in the emitted wire.

The returned build record is richer than the bytes. Its `info`, `metadata`,
`permutationGraph`, `analysis`, `wgsl`, `backendBodySet`, `inspection`, and
`qualification` fields are build-time evidence for callers. They must not be
interpreted as separate records stored in the container.

### Selected mode

`mode: "selected"` is the default. The container still carries every
permutation row and representable non-program description fields, but only the
resolved body's requested complete passes carry translated WGSL. Other bodies
have zero-length program slots.

Selected mode narrows backend translation without reducing permutation
topology.

### All mode

`mode: "all"` first lowers the resolved selection through the same initial gate
as selected mode; an unsupported resolved body therefore aborts the build.
After that precondition succeeds, the builder attempts every distinct body. A
later body that cannot be lowered remains in the container with its non-program
description fields and zero-length programs. The in-memory body-set view
records its specific failure; rereading the wire can report only that the body
carries no translated programs.

Translation units are pass-scoped because binding plans and resource
transforms are pass contracts. Arena deduplication shares identical emitted
program and backend blobs; the wire does not contain a separate unit table.

## Reading and validation

The shared Carbon reader validates version, count caps, dense positional
offsets, arena bounds, and exact record ends. The WebGPU layer then checks each
distinct body and rejects any program-bearing stage outside vertex, pixel, and
compute. Geometry, hull, and domain reflection may remain only when the
corresponding program slot is empty.

Inspection reports:

- Carbon version and compiler-version bytes;
- permutation and distinct-body counts; and
- stage, shader, and layout counts for the resolved translation.

The JSON read shape contains `info`, `metadata`, `permutationGraph`,
`analysis`, `wgsl`, `backendBodySet`, and convenience `stages`, `shaders`, and
`layouts` arrays. `analysis`, `wgsl`, and `backendBodySet` are derived views.

## Backend block

Each translated pass may reference one version-1 backend block from the Carbon
arena. The block carries:

- physical bind-group and binding slots;
- resource kind, stage visibility, register identity, generated symbol, and
  optional structured-buffer or array-layer metadata; and
- resource-transform family, identifier, and ordered source inputs.

Strings inside the block are inline and length-prefixed. The block contains no
arena offsets, so its bytes remain independent of the arena's content sort and
can deduplicate safely. An unknown backend-block version is skipped instead of
being guessed.

Fields such as `identity`, `layoutKey`, transform output, and fixed layer
numbers are reconstructed from the block plus record position. Backend-block
version 1 stores visibility but not the original `scopeIdentity`; the reader
reconstructs `${identity}@${visibility[0]}`. A multi-stage shared binding
therefore rereads as stage-qualified rather than recovering its original bare
scope. Callers must not use the wire view to infer that original sharing
decision.

## Structured WGSL set

The derived `CJS_WGSL_SET` version-2 view contains shader descriptors and
pass-level layouts. A layout records the numeric bind group and binding slots
already present in the WGSL source.

Each binding keeps:

- a D3D-derived base `identity`;
- a resource-resolution `scopeIdentity`;
- stage visibility;
- the buffer, texture, or sampler layout; and
- its numeric group and binding.

Resource tuples are stage-scoped unless the caller explicitly proves one
compatible shared identity. The builder rejects duplicate scopes, duplicate
numeric slots, mixed shared and stage-scoped forms, incomplete visibility,
and stage/layout conflicts. It never renumbers slots during WGSL-set assembly.

Version-1 binding plans remain accepted as legacy input. Ordinary new plans
and WGSL sets use version 2.

### Version 3 resource transforms

A derived set becomes version 3 when the compiler proves that several logical
source resources can be represented by one physical WebGPU resource. Its
`resourceTransforms` array describes the realization recipe; the matching
physical layout binding carries `transformId` and `arrayLayerCount`.

The currently supported version-1 recipe is `kind: "texture-2d-array"`.
Inputs are ordered by fixed array layer. The output reuses layer zero's D3D
identity, and later logical inputs do not remain as physical bindings.

`representation: "native-or-rgba8"` requires the consumer to assemble one
compatible `texture_2d_array` from the named inputs, either in a shared native
format or after decoding every layer to RGBA8. Dimensions, mip coverage,
sample type, and texture format must agree. `missingLayer: "reject"` forbids a
fallback layer.

The set builder fails closed unless every recipe:

- targets an emitted fragment stage in its own pass;
- links exactly one `texture_2d_array<f32>` physical binding;
- numbers distinct inputs contiguously from layer zero;
- matches the binding's identity, view dimension, and layer count; and
- removes only the later input scopes from that recipe's owning pass.

`engine-webgpu` accepts WGSL-set versions 1, 2, and 3 and realizes the
version-1 `texture-2d-array` recipe. Unsupported recipe kinds or versions fail
closed.

## Compatibility boundary

The JSON compatibility views exist so current consumers can cross the
container switchover without a second artifact. New code should treat the
Carbon record tree as the wire authority and should not rebuild assumptions
around the retired chunk names.

The raw container's current reflection-to-`Tr2Shader` adapter and the engine's
body-program view remain integration boundaries under active repair. Their
existence does not change the wire contract described here.

## Related documentation

- [Carbon compiled-effect container](../../carbon-effect-container.md)
- [Effect packaging guide](../guides/effect-packaging.md)
- [Public API reference](../reference/api.md)
- [WGSL compatibility](../reference/wgsl-compatibility.md)
