# CEWG effect reflection contract

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/webgl` effect packages and portable reflection
Audience: Package users, runtime integrators, and GPU-engine maintainers
Summary: Defines CEWG reflection, validation, ownership, and completeness.

`@carbonenginejs/runtime-resource/formats/webgl` packages immutable compiled-effect data. It
does not create runtime shader classes or WebGL objects.

## Ownership

- `format-hlsl` owns the portable, GPU-free reflection schema and source
  parser.
- `format-webgl` owns CEWG serialization, GLSL backend records, integrity
  validation, and reconstruction of one portable body by permutation index.
- `runtime-resource` owns loaded effect-package bytes, option selection,
  per-index caching, canonical `Tr2Shader`, and its device-free reflection and
  sampler records.
- `runtime-trinity` owns the mutable `Tr2Effect`/`Tr2Material` facade,
  parameters, authored shader options, and sampler overrides. `Tw2*` is legacy
  ccpwgl comparison terminology, not a maintained runtime class surface.
- The WebGL engine owns handles, locations, layouts, buffer packing, texture
  binding, and draw-time validation.

The current runtime connection is one-way: runtime-resource consumes the
package's immutable portable data and hydrates a fresh canonical shader graph;
runtime-trinity depends on and consumes that graph. runtime-resource does not
import runtime-trinity. Engines add only backend realization.

## Container and schemas

The binary CEWG container remains version 1. Effect packages use one of these
INFO schemas:

| INFO | Source input | Required chunks | Source reflection |
| --- | --- | --- | --- |
| v1 | legacy | `INFO META GLSL` | unspecified |
| v2 | effect v8-v14 | `INFO META PGRF GLSL` | permutation topology only |
| v3 | effect v15 | `INFO META PGRF RFLX RBLB GLSL` | complete for every unique body |

`PGRF` v1 records every Cartesian permutation, its option indices, its exact
source record, and a content-deduplicated body identity.

`RFLX` v2 records complete portable reflection once per unique source body:
techniques, passes, stages, source programs, exact constant-default bytes,
constants, resources, UAVs, samplers, signatures, static samplers,
annotations, render states, and libraries. Binary fields use verified
references into the shared `RBLB` byte arena.

`META` and `GLSL` retain the WebGL backend graph: permutation-to-body
mappings, Carbon manifests, stage and shader identities, translated source,
bindings, vertex inputs/outputs, and backend-specific transform contracts.
Backend body keys deliberately retain the historical
`body_<offset>_<size>` form; PGRF/RFLX content identities are separate.

All cross-document references, counts, SHA-256 digests, source identity,
package mode, body/stage/shader graph edges, reflection blobs, and reflected
pass/stage identities are validated while reading a canonical package.
Generic CEWG containers remain readable, but they cannot use the portable
reflection accessor.

## Runtime accessor

Read with `emit: "raw"` and call:

```js
const pkg = CjsWebglFormat.read(bytes, {
    emit: CjsWebglFormat.OUTPUT_RAW
});
const portable = pkg.GetPortableEffectReflection(permutationIndex);
```

Omitting the index selects `INFO.defaultPermutationIndex`. The method returns
`null` for legacy, partial, generic, or unvalidated packages. Every returned
binary field is a fresh owned `Uint8Array`; callers may mutate it without
changing subsequent reads. This method is the supported stable exception on
the otherwise internal `CewgPackage` object.

The default JSON read exposes packed PGRF/RFLX documents for inspection, but
does not inline RBLB. Runtime hydration must retain the package bytes and use
the accessor.

## Completeness

- `sourceComplete` is true only for v15 packages with PGRF v1 plus
  all-unique RFLX v2/RBLB.
- `backendComplete` remains false. Successful translation does not yet prove
  the engine's physical binding/layout and transform contract.
- `runtimeComplete` remains false. Live shader objects and GPU handles are
  outside the format package.
- `qualification.ok` separately reports whether the selected WebGL programs
  translated and formed the required raster/compute families.

Selected-only or technique/pass/stage-filtered packages still carry complete
v15 source reflection, but only their selected backend programs.

## Tier and permutation policy

For EVE shader work:

- High is `.sm_depth`.
- Medium is `.sm_hi`.
- Low is `.sm_lo`.
- Unpacked Quad V5 evidence must explicitly select `SOPPT_ENABLED`; the
  default permutation is commonly PPT-off and is not representative.

Always resolve an option tuple against the current source axes. Do not persist
a permutation index across builds.

## Validation evidence

The 2026-07-28 build-3444265 gate covered 1,074 High/Medium CEWG packages:

- all 1,074 baseline/candidate statuses matched;
- 1,016 remained qualified and 58 remained diagnostic;
- all 17,444 permutations reconstructed byte-exact portable reflection;
- all 7,134 unique reflected bodies matched fresh `format-hlsl` output;
- the oracle covered 49,308 source programs, 2,563,024 exact default bytes,
  148,972 constants, 88,970 resources, 808 UAVs, 25,564 samplers, and 202,147
  annotations; and
- GLSL source remained unchanged. Vertex-stage metadata was corrected so the
  Carbon `BITANGENT` alias names the actual emitted `in_BITANGENT#`
  declaration instead of stale `in_BINORMAL#` metadata.

The real unpacked Quad V5 PPT-on High and Medium bodies compile and link all
Main, Depth, Picking, Shadow, and DynamicLightShadow programs in WebGL2.
