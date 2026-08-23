# Architecture and boundaries

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/webgpu`
Audience: Shader-tool authors, engine integrators, and maintainers
Summary: Defines the package's compiler, container, dependency, and engine boundaries.

## Purpose

The WebGPU format subpath is the transformation and package layer between
compiled Carbon effects and WebGPU engine realization. It converts supported
shader programs into WGSL and writes Carbon version-15 effect records without
creating live GPU objects.

## Dependency direction

```text
@carbonenginejs/runtime/resource/formats/hlsl
          |
          +---- effect selection and binding metadata
          |
          v
@carbonenginejs/runtime/resource/formats/webgpu <---- @carbonenginejs/runtime/resource/formats/dxbc
          |                              decoded DXBC
          |
          +---- Carbon WebGPU bytes, analysis, WGSL, canonical layouts
          |
          v
@carbonenginejs/engine-webgpu
```

Node build tools may call the public byte-oriented API, but the format package
does not import the toolchain. Dependency direction remains tools to formats,
then package data to the engine.

## Owned responsibilities

- Reading, inspecting, and building Carbon-record Carbon WebGPU containers.
- Resolving one compiled-effect permutation and complete pass.
- Preserving every source permutation row and representable non-program
  description field, including non-dynamic sampler names and the authored stage
  order — both are preserved, whatever Carbon's runtime does with them.
  Stored-body identity is exact emitted-description-byte identity; it does not
  promise to retain the source alias partition after programs are replaced.
- Writing WGSL to program slots and bind-group/transform data to the optional
  per-pass backend block.
- Normalizing effect, stage, binding, and decoded DXBC analysis.
- Building validated shader intermediate representation and structured control
  flow.
- Lowering the supported vertex and fragment profiles to WGSL.
- Allocating a pass-global binding plan with explicit stage scope.
- Assembling emitted shaders and layouts into a portable WGSL set.
- Rejecting unsupported or ambiguous semantics with explicit diagnostics.

## Ownership elsewhere

- `@carbonenginejs/runtime/resource/formats/hlsl` owns compiled-effect parsing, permutation resolution,
  unique-body enumeration, and binding-manifest interpretation.
- `@carbonenginejs/runtime/resource/formats/dxbc` owns DXBC container and instruction decoding.
- `@carbonenginejs/engine-webgpu` owns `GPUDevice`, shader-module compilation, bind groups,
  pipelines, resource realization, device loss, and draw execution.
- Node tooling owns indexed input acquisition, filesystem adapters, caching,
  build reports, and optional native comparison.
- the `resource` layer owns effect-resource lifecycle, permutation selection,
  canonical device-free `Tr2Shader` hydration, and shader caching.
- the `trinity` layer owns authored effect/material facades, parameters, options,
  sampler overrides, and scene references.

## Browser and Node boundary

The public class accepts `ArrayBuffer`, typed-array, and compatible byte views.
Its source does not read files, inspect processes, or invoke native programs.
This allows applications to fetch or select bytes and build Carbon WebGPU data in a
browser.

The repository's command-line scripts are development adapters over the same
public operations. They are not a second compiler contract.

## Shader target

The general translation target is DX11 SM5.0 vertex and fragment bytecode.
The compiler also admits a finite, frozen set of exact bounded compute
profiles. DX12 SM5.1 input is useful for differential analysis where
supported, but DX12-only bindless resource ranges are not part of the current
translation target.

Geometry, hull, and domain stages, plus compute programs outside the admitted
profiles, are not emitted. The exact supported and adapted boundaries are
listed in [WGSL compatibility](reference/wgsl-compatibility.md).

## Related documentation

- [Package documentation](README.md)
- [Carbon WebGPU package format](formats/carbon-webgpu.md)
- [Public API reference](reference/api.md)
