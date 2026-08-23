# Build a Carbon WebGPU package from compiled effect bytes

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/webgpu`
Audience: Shader-tool authors and engine integrators
Summary: Shows how to translate version-15 compiled effects into Carbon-record Carbon WebGPU bytes.

## Purpose

Use `buildEffect` when a caller already has version-15 compiled-effect bytes
and needs a WebGPU-targeted effect container. The operation parses the complete
input, resolves a permutation, lowers supported DXBC, allocates pass-global
bindings, emits WGSL, writes a Carbon v15 container, and validates the result.

The method is byte-oriented and does not open files or resource paths.

## Build selected passes

```js
import { CjsWebgpuFormat } from "@carbonenginejs/runtime-resource/formats/webgpu";

const result = CjsWebgpuFormat.buildEffect(effectBytes, {
    source: "res:/graphics/effect.dx11/example.sm_hi",
    mode: "selected",
    permutation: [
        { name: "QUALITY", value: "HIGH" }
    ],
    selection: {
        techniqueName: "Main",
        passIndex: 0,
        stageNames: [ "vertex", "pixel" ]
    }
});

const packageBytes = result.bytes;
const emittedShaders = result.wgsl;
```

`source` is a caller-owned diagnostic label. An optional `sourceIdentity`
records build provenance in the returned result; it does not change the wire
identity, which belongs to the resource path used to load the emitted bytes.
When `sourceIdentity.sha256` is supplied, the build checks it against the exact
input bytes.

## What the bytes contain

The emitted bytes are a stock Carbon v15 effect container:

- every source permutation remains in the dense offset table;
- each distinct emitted description body is stored once, based on exact emitted
  bytes rather than the source alias partition;
- representable non-program description/reflection fields remain in the Carbon
  tree, non-dynamic sampler names and the authored stage order included;
- translated stage program slots contain UTF-8 WGSL;
- untranslated or unsupported stage program slots have zero length; and
- translated passes may carry a WebGPU backend block with bind-group layouts
  and resource transforms.

Source-stage DXBC and the original source hash are not stored in Carbon WebGPU bytes.
The build result no longer carries any source-reflection document; it was removed with the intermediate format. What remains in memory is
`BuildEffect` result.

There are no stored `INFO`, `META`, `PGRF`, `RFLX`, `ANLS`, `WGSL`, or `WGSB`
chunks. The read API derives compatible JSON views from the Carbon records.

## Translation modes

### Selected

`mode: "selected"` is the default. It translates the resolved body's requested
complete passes. Every permutation row and representable non-program
description fields remain in the container, but untranslated program slots are
empty.

Selected mode does not discard permutations. It narrows backend translation.

### All

`mode: "all"` first lowers the resolved selection; an unsupported resolved body
aborts the build. Once that precondition succeeds, later bodies that lower
successfully carry WGSL and backend blocks. A later body outside the compiler's
current boundary remains present with non-program description fields and empty
program slots. The in-memory body-set view records its reason; a reread can
report only that it carries no translated programs.

Passes, rather than individual stages, are the translation unit because a pass
owns one binding plan and resource-transform plan.

The compatibility option `allPermutations: true` selects all mode.
`allPermutations: false` selects the requested `mode` or the selected default.

## Build result

The returned record contains build-time evidence in addition to `bytes`:

| Field | Purpose |
| --- | --- |
| `bytes` | Carbon v15 Carbon WebGPU bytes. |
| `info` | Producer, source, translation-scope, and completeness evidence. |
| `metadata` | Resolved selection and caller provenance. |
| `permutationGraph` | Complete source permutation and body-alias view. |
| `analysis` | Selected-body diagnostic analysis. |
| `wgsl` | Emitted shaders, layouts, and transforms. |
| `backendBodySet` | All-body translation result, or `null` in selected mode. |
| `inspection` | Summary obtained by rereading the emitted bytes. |
| `qualification` | Structural build outcome and translation counts. |

These fields are returned data. They are not separate documents stored beside
the Carbon records.

`qualification.packageValid` means the emitted container passed structural
validation. It is not prepared-pipeline or rendered evidence.
`backendComplete` and `runtimeComplete` remain false until the broader compiler,
resource-hydration, selection, and execution gates are satisfied.

## Read the result

```js
const summary = CjsWebgpuFormat.inspect(packageBytes, {
    source: "res:/graphics/effect.webgpu/example.sm_hi"
});

const data = CjsWebgpuFormat.read(packageBytes, {
    source: "res:/graphics/effect.webgpu/example.sm_hi"
});
```

The JSON read derives `info`, `metadata`, `permutationGraph`, `analysis`,
`wgsl`, and `backendBodySet` views from the one record tree. It also exposes
convenience `stages`, `shaders`, and `layouts` arrays.

Raw reads return the internal container reader. That surface is useful for
current package integration but is not a second artifact and should not be
persisted as a replacement wire format.

## Binding scope

A D3D resource tuple is stage-local unless authoritative metadata proves that
the vertex and fragment declarations name one compatible resource. Build one
binding plan from the complete stage set.

```js
const plan = CjsWebgpuFormat.buildWgslBindingPlan(
    [ vertexIr, fragmentIr ],
    { sharedIdentities: [ "uniform-buffer:0:0" ] }
);
```

Unshared identities receive separate `@vertex` or `@fragment`
`scopeIdentity` values and numeric slots. Shared identities retain one bare
scope with combined visibility.

## Resource transforms

When semantic metadata proves that several logical textures may be represented
by one physical array texture, the derived WGSL set uses version 3 and carries
a `texture-2d-array` transform recipe.

The consumer must assemble the named layers, match size/mips/sample
type/format, and bind the resulting array through the transformed layout.
Missing layers fail closed. A version-3 document is not executable evidence by
itself.

## Errors

Conversion fails explicitly when:

- the source is not a version-15 compiled effect;
- a permutation assertion is unknown or unresolved;
- the permutation table is sparse, misordered, out of bounds, or malformed;
- the technique, pass, or requested stage does not exist;
- the requested stage list is duplicated or incomplete;
- the selected shader uses unsupported semantics;
- resource declarations cannot form one unambiguous pass layout;
- a lowerer emits an entry point other than `main`; or
- the emitted Carbon records or backend block fail structural validation.

Unsupported selected programs abort selected-mode packaging and also abort the
initial selection gate in all mode. After that gate succeeds, an unsupported
later body remains represented with empty program slots and an explicit
in-memory derived status.

## Related documentation

- [Carbon WebGPU effect container](../formats/carbon-webgpu.md)
- [Public API reference](../reference/api.md)
- [WGSL compatibility](../reference/wgsl-compatibility.md)
- [Carbon compiled-effect container](../../carbon-effect-container.md)
