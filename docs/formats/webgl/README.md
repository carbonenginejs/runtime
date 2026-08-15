# WebGL format documentation

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/webgl`
Audience: Shader-tool authors, runtime integrators, and maintainers
Summary: Explains WebGL effect packages, completeness, and DXBC-to-GLSL conversion.

## Purpose

`@carbonenginejs/runtime-resource/formats/webgl` builds effect packages and
converts supported compiled Carbon effect stages into GLSL ES 3.00 package
data. It preserves complete source permutation topology without creating live
shader or GPU objects.

## Use this package when

Use `format-webgl` to inspect or build package bytes, translate supported DXBC
stages, or convert one compiled effect while preserving all source
permutations. Use runtime and engine packages for live shader objects, resource
selection, bindings, and draws.

## Where it fits

```text
compiled effect bytes
        |
        +---- format-hlsl ---- source parsing and permutation analysis
        +---- format-dxbc ---- decoded shader programs
        |
        v
     format-webgl
  Carbon container + GLSL ES 3.00
        |
        +---- runtime-resource ---- selection, cache, Tr2Shader
        +---- runtime-trinity ----- effect/material facade and parameters
        `---- WebGL engine -------- programs, bindings, and draws
```

The emitted artifact is a shared Carbon v15 container, not a tagged-chunk
package; the GLSL replaces the DXBC in each stage's program slot. Backend body
keys deliberately retain the historical `body_<offset>_<size>` form.
The permutation graph still records every Cartesian permutation, its option
indices, its exact source record, and a content-deduplicated body identity — but
it is a **derived view** (`CJS_EFFECT_PERMUTATION_GRAPH`, built by
`buildEffectPermutationGraph`), not a stored `PGRF` chunk. That chunk and its
`EFFECT_PERMUTATION_GRAPH_CHUNK` export are retired; nothing emits or reads one.

## Completeness

The build result reports four flags plus a separate qualification:

- `sourceComplete` is true only for version-15 effects.
- `backendComplete` remains false. Successful translation does not yet prove
  the engine's physical binding/layout and transform contract.
- `runtimeComplete` remains false. Live shader objects and GPU handles are
  outside the format package.
- `qualification.ok` separately reports whether the selected WebGL programs
  translated and formed the required raster/compute families. It is returned
  frozen.

Selected-only or technique/pass/stage-filtered packages still carry complete
version-15 source coverage, but only their selected backend programs.

Beyond those flags, `glslEffectCompleteness` runs checks that a translation can
be structurally valid and still be wrong. Two families are worth knowing about:

- `unlowered_local_light_family` — the recognised local-light constants
  survived into GLSL without being lowered. It is deliberately scoped to that
  one family: a general "every declared resource is used" rule fires on good
  builds, because Carbon routinely describes resources a body does not read.
- `resource_transform_underfilled`, `_layer_gap`, `_carrier_undeclared`, and
  `_input_still_bound` — a declared resource transform (the detail-map array is
  the live case) did not complete. Each check is scoped to the stage the
  transform names, and transform vocabulary is WGSL's: a transform saying
  `fragment` applies to the WebGL `pixel` stage. Running them across every
  stage in a pass instead produces 48 false positives.

### Measured link rate

Across all 4,833 shipped compiled effects, **9,319 of 9,321 emitted programs
compile and link in a real WebGL2 context.** Before the DXBC SM5.1 range-id
operand fix the rate was near 61%, and the failures were the lesser half of the
problem: shaders that *did* link were reading constant-buffer rows off the
register number, and in 56 of 161 multi-dimensional resource operands were
bound to the wrong texture entirely.

## Tier and permutation policy

For EVE shader work:

- High is `.sm_depth`.
- Medium is `.sm_hi`.
- Low is `.sm_lo`.
- Unpacked Quad V5 evidence must explicitly select `SOPPT_ENABLED`; the
  default permutation is commonly PPT-off and is not representative.

Always resolve an option tuple against the current source axes. Do not persist
a permutation index across builds.

## Start here

```js
import { CjsWebglFormat } from "@carbonenginejs/runtime-resource/formats/webgl";

const summary = CjsWebglFormat.inspect(packageBytes);
const packageData = CjsWebglFormat.read(packageBytes);
```

## Documentation map

- [Architecture and ownership](architecture.md)
- [Carbon compiled-effect container](../carbon-effect-container.md)
- [Constant-buffer layouts](carbon-constant-layouts.md)
- [Declaration and I/O lowering](decl-io.md)
- [Structured-memory lowering](memory-structured.md)
- [Texture sampling](texture-sample.md)
- [Class-purpose catalog](reference/classes/README.md)
