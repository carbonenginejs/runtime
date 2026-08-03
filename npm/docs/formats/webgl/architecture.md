# Architecture and ownership

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/webgl`
Audience: Shader-tool authors, runtime integrators, and maintainers
Summary: Defines the package's compiler, container, runtime, and engine boundaries.

## Purpose

`format-webgl` is the transformation and package layer between compiled
Carbon-style effects and WebGL engine realization. It emits Carbon container
bytes and GLSL ES 3.00 without constructing mutable runtime shader classes or
WebGL objects.

## Dependency direction

```text
@carbonenginejs/runtime-resource/formats/hlsl
          |
          +---- effect parsing and permutation analysis
          |
          v
@carbonenginejs/runtime-resource/formats/webgl <---- @carbonenginejs/runtime-resource/formats/dxbc
          |                              decoded DXBC
          |
          +---- Carbon container bytes, metadata, GLSL
          |
          +---- runtime-resource ---- option selection + Tr2Shader
          +---- runtime-trinity ----- effect/material facade + parameters
          `---- WebGL engine -------- GPU realization
```

Tools may call the public byte-oriented API, but the format package does not
import the toolchain. Runtime packages read the emitted container bytes
directly.

## Owned responsibilities

- Building the shared Carbon v15 container for the WebGL backend, with GLSL in
  each stage's program slot.
- Preserving every source permutation and unique body identity.
- Translating supported DXBC vertex, pixel, and bounded map-style compute
  stages into GLSL ES 3.00.
- Preserving backend bodies, stages, programs, manifests, and render states.
- Rejecting incomplete or inconsistent canonical effect packages.

## Ownership elsewhere

- `format-hlsl` owns compiled-effect parsing and permutation analysis.
- `format-dxbc` owns DXBC decoding.
- `runtime-resource` owns `Tr2EffectRes`, the container bytes, option
  selection, per-permutation cache identity, canonical `Tr2Shader`, reflection
  records, and sampler setup records.
- `runtime-trinity` owns the mutable `Tr2Effect`/`Tr2Material` facade,
  parameters, authored options, and sampler overrides.
- The WebGL engine owns program compilation, locations, layouts, resource
  binding, uploads, draws, and context recovery.

## Completeness boundary

A version-15 build can be source-complete while remaining backend- and
runtime-incomplete. Successful GLSL translation and compile/link do not prove
the engine's physical binding/layout contract or a rendered result.

## Related documentation

- [Package documentation](README.md)
- [Carbon compiled-effect container](../carbon-effect-container.md)
- [Class-purpose catalog](reference/classes/README.md)
