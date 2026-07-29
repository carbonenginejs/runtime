# Build a CEWGPU package from compiled effect bytes

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/webgpu`
Audience: Shader-tool authors and engine integrators
Summary: Shows how to package the complete supported pass scope of one selected compiled-effect body as CEWGPU data.

## Purpose

Use `buildEffect` when an application or build tool already has compiled
effect bytes and needs one structurally valid CEWGPU package for a selected
effect body. The operation performs effect analysis, exact selection,
DXBC-to-IR lowering, pass-global binding allocation, WGSL emission, package
assembly, and structural qualification.

## Prerequisites

- Caller-supplied compiled `.sm_*` effect bytes.
- An exact technique, pass index, and complete stage list when deterministic
  selection matters.
- Permutation assertions for every axis whose value must not depend on effect
  defaults.
- A complete, internally consistent source permutation header: every ordered
  axis must have valid names/options/defaults, and every Cartesian permutation
  must have one correctly indexed, in-bounds body record. PGRF construction
  validates the whole header even though only one body is translated. The
  synchronous builder accepts at most 65,536 Cartesian permutations.

## Build one pass

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

The `source` value is diagnostic provenance only. The method does not open
that path. Callers may separately provide `sourceIdentity` with a canonical
`logicalPath` plus optional `game`, `client`, `build`, `md5`, and `sha256`
fields. Its logical path need not equal the diagnostic label. `BuildEffect`
always computes the lower-case SHA-256 digest over the exact input byte view;
when a caller supplies `sha256`, the build fails if it does not match.

Version-15 packages use INFO schema version 3 while the binary CEWGPU
container remains version 1. INFO v3 identifies the `webgpu` target, the
producing `@carbonenginejs/runtime-resource/formats/webgpu` package version, and the
`dxbc-js-wgsl` translator version. Versions 8-14 use INFO v2 without
reflection. The reader continues to accept legacy INFO v1 packages, INFO v2
packages without PGRF, and INFO v2 packages with selected-body RFLX v1.

Every new selected-effect package also includes a complete source permutation
graph in `PGRF`. This preserves every axis, Cartesian permutation index,
option-index tuple, compiler alias, and unique raw body identity even though
only one selected body's WGSL is currently packaged. INFO v3 binds the exact
PGRF bytes with SHA-256.

For version-15 input, the package also includes complete portable reflection
for every unique source body in RFLX v2 and its exact immutable byte payloads
in one shared `RBLB`. These include authored parameter/resource metadata,
constant defaults, stage/library source programs, signatures, static samplers,
annotations, and the opaque native source hash. Earlier source versions keep
the legacy package surface because portable reflection version 1 is
intentionally version-15-only.

## Result

The returned record contains:

| Field | Purpose |
| --- | --- |
| `bytes` | Encoded CEWGPU package bytes. |
| `info` | Translator and package information. |
| `metadata` | Selection and caller provenance. |
| `permutationGraph` | Complete source permutation topology and identity-only body table. |
| `reflection` | Complete all-unique portable source reflection for version-15 input, otherwise `null`. |
| `reflectionBlobs` | Exact RBLB bytes for reflected programs/defaults/native hash, otherwise `null`. |
| `analysis` | Compact selected-body diagnostic binding/stage data; not lossless effect reflection. |
| `wgsl` | Portable shader set and pass layouts. |
| `inspection` | Summary produced by reading the built package. |
| `qualification` | Structural conversion outcome. |

`mode: "selected"` is the default and currently the only supported backend
body mode. The package retains normalized analysis for that resolved body while
emitting WGSL for the selected complete passes. PGRF retains the complete
source permutation graph and RFLX/RBLB retain every unique version-15 body's
portable source reflection. `META.bodyIndex` selects a PGRF variant; its
`bodyKey` selects the matching RFLX body. A raw reader exposes that join as
`GetPortableEffectReflection(permutationIndex)`, returning a freshly owned,
format-hlsl-validated single-body document with every byte reference expanded
to `Uint8Array`. `runtime-resource` `Tr2EffectRes` consumes that document,
hydrates a canonical device-free `Tr2Shader`, and caches it by selected body
index. Engines still own prepared pipelines and GPU realization.

`mode: "all"` additionally packages translated programs, layouts, and resource
transforms for every unique body in a `WGSB` chunk, and
`GetBackendBodyPrograms(permutationIndex)` resolves any permutation to them.
Because one pass of one body is the translation unit, bodies whose pass is
byte-identical share a single stored unit rather than duplicating its WGSL.
Bodies the compiler cannot lower stay in the package as explicitly unsupported
records with a reason, and never remove that body's source reflection.

JSON `Read` output exposes `reflection` with byte references and
`reflectionBlobByteLength`. Consumers that need exact defaults or source
program bytes use `Read(bytes, { emit: "raw" })`, then call
`GetPortableEffectReflection(permutationIndex)`. Omit the index to use
`META.bodyIndex`. For individual payload access,
`GetReflectionBlob(referenceOrKey)` returns an owned `Uint8Array`; an object
reference must exactly match its RFLX inventory entry.

Raw stage bytecode, decoded DXBC instruction trees, and compiler IR are
transient build inputs and are not embedded in `ANLS`. Use `AnalyzeEffect`
when return-only DXBC/IR diagnostics are required.

The qualification record distinguishes structural package validity from
broader completeness. `packageValid` means only that the selected CEWGPU
container passed required-chunk, schema, cross-document, key, layout, and
selection reconciliation. Version-15 INFO v3 reports `sourceComplete: true`
because PGRF plus RFLX/RBLB cover every unique body's portable reflection and
immutable exact defaults for that exact input file. This does not embed raw
body records or make CEWGPU an archive of the original `.sm_*` bytes.
`backendComplete` would additionally require every required translated
program, layout, and transform. `runtimeComplete` would require
complete-resource hydration and selection. None of these fields is
prepared-pipeline or rendered evidence. The same four booleans are retained
under `INFO.completeness` in the package.

Shader-tier and permutation evidence remain orthogonal to source reflection.
High is `.sm_depth`; Medium is `.sm_hi`; Low is `.sm_lo`. Source completeness
applies only to the exact input tier. For unpacked Quad ship gates, explicitly
select `SPACE_OBJECT_PPT_ENABLED=SOPPT_ENABLED`: an all-unique RFLX does not
turn a PPT-disabled selected WGSL body into PPT-on backend evidence.

When exact semantic metadata and shader use prove an allowed physical resource
coalescing, the returned WGSL document is a `CJS_WGSL_SET` version 3 record.
Its `resourceTransforms` recipes are required runtime work, not optional
diagnostics: the consumer must build the described resource and bind it through
the matching transformed layout entry. See the package-format contract before
passing version 3 output to an engine. Packages without transforms remain WGSL
set version 2.

## Binding scope

A D3D resource tuple is stage-local unless the caller has authoritative
metadata proving that the vertex and fragment declarations name one compatible
resource. Build one binding plan from the complete stage set; do not build
independent stage plans and combine them afterward.

When compatible sharing is proven, pass the base binding identity through
`sharedIdentities`:

```js
const plan = CjsWebgpuFormat.buildWgslBindingPlan(
    [ vertexIr, fragmentIr ],
    { sharedIdentities: [ "uniform-buffer:0:0" ] }
);
```

Unshared identities receive distinct `@vertex` or `@fragment` scopes and
numeric binding slots.

## Errors

Conversion fails explicitly when:

- a permutation assertion is unknown or unresolved;
- any axis/default/option or positional body record in the complete source
  permutation header is malformed, out of bounds, partially overlapping, or
  inconsistent, even when the selected body itself is translatable;
- the Cartesian permutation product exceeds the 65,536-entry synchronous-build
  limit;
- the technique, pass, or requested stage does not exist;
- the requested stage list is incomplete or duplicated;
- the selected shader uses unsupported semantics;
- resource declarations cannot form one unambiguous pass layout; or
- emitted package records fail structural validation.

An unsupported requested shader aborts selected-pass packaging; no partially
translated pass is emitted. This fail-closed behavior does not imply
whole-effect completeness.

## Related documentation

- [Public API reference](../reference/api.md)
- [CEWGPU package format](../formats/cewgpu.md)
- [WGSL compatibility](../reference/wgsl-compatibility.md)
