# Architecture and ownership

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/webgl`
Audience: Shader-tool authors, runtime integrators, and maintainers
Summary: Defines the package's compiler, container, runtime, and engine boundaries.

## Purpose

`format-webgl` is the transformation and package layer between compiled
Carbon-style effects and WebGL engine realization. It emits portable CEWG data
and GLSL ES 3.00 without constructing mutable runtime shader classes or WebGL
objects.

## Dependency direction

```text
@carbonenginejs/runtime-resource/formats/hlsl
          |
          +---- effect parsing and portable reflection
          |
          v
@carbonenginejs/runtime-resource/formats/webgl <---- @carbonenginejs/runtime-resource/formats/dxbc
          |                              decoded DXBC
          |
          +---- CEWG bytes, metadata, reflection, GLSL
          |
          +---- runtime-resource ---- package selection + Tr2Shader hydration
          +---- runtime-trinity ----- effect/material facade + parameters
          `---- WebGL engine -------- GPU realization
```

Tools may call the public byte-oriented API, but the format package does not
import the toolchain. Runtime packages consume immutable package data through
an explicit adapter boundary.

## Owned responsibilities

- Reading, inspecting, validating, and building CEWG v1 containers.
- Preserving every source permutation and unique body identity.
- Packing complete version-15 portable reflection and exact shared bytes.
- Translating supported DXBC vertex, pixel, and bounded map-style compute
  stages into GLSL ES 3.00.
- Preserving backend bodies, stages, programs, manifests, and render states.
- Rejecting incomplete or inconsistent canonical effect packages.

## Ownership elsewhere

- `format-hlsl` owns compiled-effect parsing and the portable reflection
  schema.
- `format-dxbc` owns DXBC decoding.
- `runtime-resource` owns `Tr2EffectRes`, package bytes, option selection,
  per-permutation cache identity, canonical `Tr2Shader`, reflection records,
  sampler setup records, and portable hydration.
- `runtime-trinity` owns the mutable `Tr2Effect`/`Tr2Material` facade,
  parameters, authored options, and sampler overrides.
- The WebGL engine owns program compilation, locations, layouts, resource
  binding, uploads, draws, and context recovery.

## Completeness boundary

Version-15 CEWG can be source-complete while remaining backend- and
runtime-incomplete. Successful GLSL translation and compile/link do not prove
the engine's physical binding/layout contract or a rendered result.

## Related documentation

- [Package documentation](README.md)
- [Effect reflection contract](effect-reflection.md)
- [Class-purpose catalog](reference/classes/README.md)
