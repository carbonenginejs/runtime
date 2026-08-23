# Runtime constant knowledge base

Status: Evolving
Scope: `@carbonenginejs/runtime` constant families
Audience: Runtime authors and maintainers
Summary: Defines ownership and dependency rules for shared constant vocabularies.

The runtime global foundation owns shared vocabulary and numeric constants for
CarbonEngineJS.

## Purpose

This package provides stable constants that can be shared by:

- `@carbonenginejs/runtime/resource/formats/*` readers when emitting GPU-free semantic
  payloads, including the DXBC, HLSL, WebGL, and WebGPU subpaths.
- the `resource` layer when interpreting payloads and resource intent.
- `src/engine/*` layers when mapping payloads to backend APIs.
- tools and tests that need canonical media, graphics, audio, shader, D3D, or
  backend names.

## Boundaries

The global constant layer owns:

- canonical string tokens, such as pixel formats and color spaces.
- small helpers for normalization and classification.
- numeric mirrors of external enums where useful, such as DXGI/D3D values.
- mapping tables between shared constants and backend constants.

The constant families do not own:

- resource lifecycle, cache, source reads, or loader dispatch.
- format parsing or byte decoding.
- format-container internals such as DDS header offsets, FOURCC parsing,
  PNG chunk handling, WAV chunk layouts, or MP4 box parsing.
- class hydration or runtime object population, which are separate
  global foundation families.
- WebGPU/WebGL resource creation.

## Dependency rule

The global foundation should stay dependency-light and pure JavaScript.

Preferred direction:

```text
resource/formats/*  may emit matching strings and import global constants
resource            may import/re-export global constants
engine/*            imports global constants for backend mapping
global/consts       imports no resource or engine layer
```

Shader formats are maintained as runtime resource subpaths. Retired standalone
format package names are provenance labels, not current dependency owners.

## Initial domains

- media and payload types
- graphics pixel formats, color spaces, texture dimensions
- audio sample formats and channel layouts
- shader stages and shader models
- D3D/DXGI enum mirrors
- WebGPU mapping helpers

## Format-specific constants

Container-specific constants live with their maintained reader.

Examples:

- DDS magic numbers, header offsets, pixel format flags, caps bits, FOURCC
  values, and DX10 header parsing belong to
  `@carbonenginejs/runtime/resource/formats/dds` after the resource migration.
- PNG chunk names and filter ids belong to
  `@carbonenginejs/runtime/resource/formats/png` after the resource migration.
- WAV RIFF chunk ids belong to
  `@carbonenginejs/runtime/resource/formats/wav` after the resource migration.

The global foundation may still expose general constants that those formats reference,
such as canonical `PixelFormat` strings or generic `DxgiFormat` numeric enum
values. Parser-specific interpretation remains in the maintained reader.

## Payload example

```js
{
    payloadType: "texture",
    sourceFormat: "dds",
    pixelFormat: "bc7-rgba-unorm",
    colorSpace: "srgb",
    dimension: "2d",
    isCompressed: true
}
```

The payload is still GPU-free. Engine packages decide whether and how to create
backend resources from it.
