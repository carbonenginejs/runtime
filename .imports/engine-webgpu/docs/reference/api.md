# Public API reference

Status: Experimental
Scope: `@carbonenginejs/engine-webgpu`
Audience: Users and renderer integrators
Summary: Lists the current public exports and their supported responsibilities.

## Package descriptors

- `CjsWebgpuPackage` consumes decoded Carbon WebGPU data and exposes immutable package
  and pipeline records.
- `CjsWebgpuPipeline`, `CjsWebgpuShaderModule`, `CjsWebgpuBindGroup`,
  `CjsWebgpuResource`, `CjsWebgpuBuffer`, `CjsWebgpuTexture`, and
  `CjsWebgpuSampler` represent immutable normalized descriptors.

Use `CjsWebgpuPackage.from(packageJson)` for decoded plain data or
`CjsWebgpuPackage.fromBytes(bytes, { read, readOptions })` with an explicitly
injected reader function and optional reader options.

## Device boundary

`CjsWebgpuDevice.Request(...)` acquires or accepts a WebGPU adapter and device.
The device prepares Carbon WebGPU pipelines, creates explicit geometry, RGBA8 2D or
2D-array textures and samplers, builds binding sets, encodes draws, submits
command buffers, and manages device generations.

The resource helpers accept complete caller-owned data. They do not select
effects, resolve paths, infer vertex layouts, or create production uniform
values.

`CjsWebgpuPipeline.resourceTransforms` exposes validated immutable transform
records, and `GetResourceTransform(scopeIdentity)` resolves the record carried
by one merged binding. The current supported shape merges ordered 2D inputs
into one 2D-array binding. The package validates the recipe and rewritten
layout; callers remain responsible for supplying compatible layer payloads and
assembling them before `CreateTexture(...)`.

The source tree also contains an internal
`CjsWebgpuTrinityBatchDispatcher` conformance prototype. It is intentionally
not exported from the package root and is not part of the supported public API.
Its batch, accumulator, and batch-map paths keep material/resource resolution
and render-pass selection injected. Batch-map preparation supplies an
immutable `{ batchType }` context to each injected material, geometry, and
binding resolver. Accumulator preparation retains separate GDPR and ordinary
vectors, encoding GDPR first and grouping each vector into runs that share one
pipeline and one set of buffer bindings.
Geometry resolution may additionally supply a validated `draw` override when
the neutral batch carries an area range but no realized draw arguments.

`CjsWebgpuTrinityStepRecorder` is another internal conformance prototype. It
implements the duck-typed `Tr2RenderContext.SetStepExecutor(...)` callbacks,
preserves nested render-step intent order, and defers asynchronous WebGPU work
until after the synchronous render-job run.

`CjsWebgpuTrinityPassEncoder` synchronously encodes caller-authored pass
descriptors and prepared batch-map selections into an existing command
encoder. It does not choose pass order, techniques, attachments, or submission.

## Space-object uniform serialization

The bounded Eve space-object Main serializer is **no longer part of this
package**. It was harness scaffolding that duplicated an ABI `runtime-trinity`
already owns in `CjsPerObjectLayouts`/`CjsPerFrameLayouts`, and it carried the
format-record material read described under *Material constants*. It now lives
beside the fixtures that use it, at `harness/webgpu/spaceObjectMainUniforms.js`,
and ships in no artifact.

A composed caller needs no replacement: per-object bytes come from `RawData`
and reach the GPU through `CollectPerObjectUploads`, and the material layout
comes from `MaterialLayoutFromShader`.

Logical 4x4 matrix values use ordinary gl-matrix storage. The harness serializer
transposes each matrix once into Carbon cbuffer register-row order, including
each element of a matrix array. `customMaskMatrix` is copied unchanged because
the current Trinity custom-mask producer already supplies those slots in GPU
form. A `RawData.GetData()` payload is also already GPU-form and belongs on a
later raw upload path, not through this semantic serializer.

The serializer does not read SOF and does not supply production defaults.

## Per-object uploads

- `CollectPerObjectUploads(pairs, { force })` filters `[{ identity, payload }]`
  down to the payloads that changed, returning the `uniformData` record a
  binding-set update takes.
- `CommitPerObjectUploads(collection)` marks them uploaded.
- `UploadPerObjectData(pairs, write, options)` does both around a caller's
  write, with the ordering built in.

Current, before runtime consolidation: `payload` accepts the historical
`RawData` shape with `GetData()`, and optional `IsDirty()` and `ClearDirty()`.
A payload that cannot report dirtiness is always uploaded, because "cannot
say" must not read as "unchanged".

Planned at the combined-runtime cutover: payloads use the canonical
`CjsConstantPayload` identity, all three methods are required, and the
structural fallback is removed. The engine still receives terminal bytes and
does not reinterpret their layout.

Two properties of the dirty flag matter to a caller. It **is a write barrier**:
any field write arms it, so a clear flag means "not changed since the last
upload". That is a deliberate deviation from Carbon, which arms the flag only
through an explicit once-per-frame invalidation by the owner — a rule that would
freeze most of our records at their first frame's values, because far more sites
create a persistent record than call `Invalidate`. And a commit must follow a
successful write: clearing first would leave a payload claiming to match a
buffer that was never written.

Deciding which payload binds where is not this API's business. That join is
Trinity's stage mask plus the package's binding identity; pairs arrive already
decided.

## Material constants

- `MaterialLayoutFromShader(shader, { technique, pass, stage })` builds a named
  material-constant layout by walking a pass's stage inputs, which is where
  Carbon reads them from. `shader` is duck-typed — this package declares no
  runtime dependencies and cannot import `Tr2Shader`, so a caller supplies
  anything with `GetTechniqueIndex` and `GetEffect`.
- `PackMaterialConstants(layout, values)` packs values matched **by name** into
  that layout, seeding the buffer from the pass's authored defaults so a caller
  names only what it overrides.
- `NormalizeMaterialLayout(layout)` validates a hand-built layout.

The buffer is sized from `max(offset + size)` across the constants, as Carbon
sizes it. A stage input's `constantValueSize` is the authored default blob's
length and is not that number.

Reflection — constant names, offsets, sizes, defaults, annotations — belongs to
`Tr2Shader`. The backend package owns only physical binding topology: group,
binding, visibility, register identity. The analysis-chunk fallback that once
stood in for reflection here has been **removed**, along with the serializer
that held it, so `MaterialLayoutFromShader` is the only path this package
offers and there is nothing left for a second engine to copy.

## Effect paths

This package does not resolve effect paths and exports no helper for it. Which
compiled effect tree an authored `/effect/` path resolves into is configuration,
and the composition root owns it — see `ResolveEffectPath` in
`@carbonenginejs/runtime-core/platform`, or supply the resolved path yourself.

The engine is handed a path or a package and validates what it receives,
failing with a thrown error rather than rendering nothing when it is given
something it cannot load.

## Example

This example requires browser WebGPU globals. Destroy the device boundary when
its native resources are no longer needed.

```js
import {
  CjsWebgpuDevice,
  CjsWebgpuPackage
} from "@carbonenginejs/engine-webgpu";

const pkg = CjsWebgpuPackage.from(packageJson);
const selectedPipeline = pkg.GetPipeline("Main", 0);
const webgpu = await CjsWebgpuDevice.Request({
  gpu: navigator.gpu,
  shaderStage: GPUShaderStage
});

try {
  const prepared = await webgpu.PreparePipeline(selectedPipeline, {
    warningsAsErrors: true
  });
} finally {
  webgpu.Destroy();
}
```

Pipeline state, resources, uniforms, draw encoding, and cleanup remain explicit
steps because the current package does not define a renderer composition
contract.
