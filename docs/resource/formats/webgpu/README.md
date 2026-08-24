# WebGPU format documentation

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/webgpu`
Audience: Shader-tool authors, engine integrators, and maintainers
Summary: Explains the Carbon-record Carbon WebGPU format, compiled-effect conversion API, and bounded DXBC-to-WGSL compiler.

## Purpose

`@carbonenginejs/runtime/resource/formats/webgpu` reads and builds WebGPU
effect containers and converts supported compiled-effect stages into WGSL. It
owns effect analysis, DXBC-to-intermediate-representation lowering, WGSL
emission, pass-global binding planning, and the WebGPU backend block carried by
Carbon version-15 records.

Unsupported requested shader semantics fail explicitly instead of producing a
partially translated selected pass. `BuildEffect` preserves every permutation
row and representable non-program description/reflection fields in the Carbon
container, including non-dynamic sampler names and the authored stage order.
Source-stage DXBC is replaced by WGSL or an empty program slot.
Selected mode writes WGSL only for the resolved body's requested passes; all
mode attempts every distinct body after the resolved body passes the initial
translation gate. Backend and runtime completeness remain broader gates.

## Use this package when

Use the WebGPU format subpath when you need to:

- inspect or build a `.carbonwebgpu` package;
- analyze caller-supplied compiled effect bytes;
- lower supported DXBC vertex and fragment programs to WGSL;
- build one collision-free WebGPU binding layout across a complete pass; or
- translate selected or all distinct version-15 effect bodies while preserving
  permutation topology and representable non-program reflection fields.

Use `@carbonenginejs/runtime/resource/formats/hlsl` directly for effect metadata without WGSL
conversion, and `@carbonenginejs/runtime/resource/formats/dxbc` directly for standalone DXBC
inspection. GPU device, shader-module, bind-group, and pipeline realization
belong in `@carbonenginejs/runtime/engine/webgpu`.

## Where it fits

```text
compiled effect bytes
        |
        +---- formats/hlsl ---- effect and binding metadata
        |
        +---- formats/dxbc ---- decoded shader programs
        |                              |
        +------------------------------+
                       |
                       v
               formats/webgpu
       analysis + WGSL + Carbon records
                       |
                       v
              engine/webgpu
```

The package is browser-safe at its public source boundary. Repository-only
commands may adapt filesystem input for development, but the core conversion
path accepts bytes and does not depend on Node filesystem APIs or native
executables.

## Start here

```js
import { CjsWebgpuFormat } from "@carbonenginejs/runtime/resource/formats/webgpu";

const summary = CjsWebgpuFormat.inspect(packageBytes);
const packageData = CjsWebgpuFormat.read(packageBytes);
```

For compiled-effect conversion, continue with the
[effect packaging guide](guides/effect-packaging.md).

## Documentation map

- [Architecture and boundaries](architecture.md)
- [Effect packaging guide](guides/effect-packaging.md)
- [Public API reference](reference/api.md)
- [Carbon WebGPU package format](formats/carbon-webgpu.md)
- [WGSL compatibility](reference/wgsl-compatibility.md)
- [Class-purpose catalog](reference/classes/README.md)
