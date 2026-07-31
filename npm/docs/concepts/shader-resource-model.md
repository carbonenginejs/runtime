# Shader resource model

Status: Stable
Scope: `@carbonenginejs/runtime-resource`, with notes on `@carbonenginejs/runtime-trinity`
Audience: Anyone touching `Tr2EffectRes`, `Tr2Shader`, `Tr2Effect`, or shader effect formats
Summary: Explains how one effect file, its permutations, and the objects that resolve them relate.

## Three levels

The distinction between resource, resolved shader, and effect instance is
load-bearing:

| Level | Represents | Owns |
| --- | --- | --- |
| `Tr2EffectRes` | One effect file | Bytes, permutation axes, offset table, and a cache of resolved shaders |
| `Tr2Shader` | One permutation | Techniques and passes for one option set |
| `Tr2Effect` | One instance | Authored options, a resource reference, and the currently resolved shader |

One file yields many shaders. One shader represents one permutation. Many
effect instances may share the same resource and cached shader.

## Carbon model

Carbon's `Tr2EffectRes` retains the whole compiled file, its permutation
records, and a map from permutation index to `Tr2Shader`. Its
`GetShader(options, count)` resolves an option tuple to an index and reuses the
cached shader for that index.

`Tr2Effect` inherits the shader pointer from `Tr2Material`. Rebuilding an
effect clears that pointer and resolves it again through the resource. This
creates two deliberate caches:

- the resource caches one hydrated shader per permutation index; and
- each effect instance caches its currently resolved pointer.

Changing effect options therefore selects another shader from the same loaded
file rather than loading another file.

## Runtime-resource model

`runtime-resource/src/resource/shader/Tr2EffectRes.js` follows the same shape:

| Carbon | Runtime-resource |
| --- | --- |
| shader map keyed by permutation index | private `#shaders` map |
| `GetShader(options, count)` | option resolution followed by `GetShaderByIndex` |
| permutation records | `permutationGraph.axes` and `variants` |
| offset-table body lookup | portable reflection lookup; Carbon-record adapter pending |
| retained file bytes | `GetPayload()` |

`runtime-trinity`'s `Tr2Effect.RebuildCachedDataInternal` clears and
re-resolves its shader through the effect resource. Renderer-owned pipelines,
bind groups, and GPU handles are not part of this device-free graph.

## Package coverage

Carbon effect files carry every permutation and select through a dense offset
table. Representative source files demonstrate why body count and permutation
count are different:

| File | Permutations | Distinct bodies |
| --- | ---: | ---: |
| `effect.dx11/.../unpacked_quadv5.sm_hi` | 480 | 144 |
| `effect.gles2/.../geometryviewer.sm_hi` | 80 | 27 |
| `effect.gles2/.../textureviewer.sm_hi` | 18 | 3 |

Current `.cewgpu` bytes use Carbon's version-15 record layout and retain every
permutation row and representable non-program description fields. Non-dynamic
sampler names are unrecoverable and stage order is canonicalized. Emitted body
dedupe follows exact emitted bytes, so it need not preserve the original source
alias partition. `mode: "selected"` narrows which body receives translated
WGSL; it does not discard source permutations. `mode: "all"` attempts every
distinct body after the resolved selection passes the initial translation gate.

`.cewg` remains its own CEWG chunk format. Its current package contract also
preserves complete source permutation topology and supports selected versus
all backend coverage.

The selected/all distinction is therefore backend translation scope, not
source cardinality. A resource can still reason about every option tuple even
when some bodies have no translated backend program.

## Current integration boundaries

The wire topology is complete, but two adapters still require focused
regression proof:

- the raw CEWGPU container's Carbon description must be converted to the
  portable envelope expected by `Tr2Shader.fromPortable`; and
- the engine's derived body-program view must agree on stable pass-unit
  identity.

Until those adapters are reconciled, the presence of every permutation proves
source preservation, not successful runtime hydration or execution.

## Reading the model without inventing gaps

Three recurring mistakes explain most false conclusions in this area:

1. **Searching only one package.** `Tr2EffectRes` is in runtime-resource while
   `Tr2Effect` is in runtime-trinity.
2. **Searching only the derived class.** The effect's shader pointer is
   declared on its `Tr2Material` base.
3. **Confusing permutation rows with stored bodies.** Several rows may alias
   one description body while remaining distinct option selections.

When an expected mechanism appears absent, check the owner package, base
classes, and record indirection before treating the absence as a design gap.

## Related documentation

- [CEWGPU effect container](../formats/webgpu/formats/cewgpu.md)
- [Carbon compiled-effect container](../formats/carbon-effect-container.md)
- [WebGPU effect packaging](../formats/webgpu/guides/effect-packaging.md)
