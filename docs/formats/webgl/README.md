# WebGL format documentation

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/webgl`
Audience: Shader-tool authors, runtime integrators, and maintainers
Summary: Explains CEWG packages, portable reflection, and DXBC-to-GLSL conversion.

## Purpose

`@carbonenginejs/runtime-resource/formats/webgl` reads and builds CEWG packages and converts
supported compiled Carbon effect stages into GLSL ES 3.00 package data. It
preserves complete source permutation topology and, for version-15 effects,
portable reflection for every unique body without creating live shader or GPU
objects.

## Use this package when

Use `format-webgl` to inspect or build CEWG bytes, translate supported DXBC
stages, or convert one compiled effect while preserving all source
permutations and portable reflection. Use runtime and engine packages for live
shader objects, resource selection, bindings, and draws.

## Where it fits

```text
compiled effect bytes
        |
        +---- format-hlsl ---- portable source reflection
        +---- format-dxbc ---- decoded shader programs
        |
        v
     format-webgl
  CEWG + GLSL ES 3.00
        |
        +---- runtime-resource ---- selection, cache, Tr2Shader hydration
        +---- runtime-trinity ----- effect/material facade and parameters
        `---- WebGL engine -------- programs, bindings, and draws
```

## Start here

```js
import { CjsWebglFormat } from "@carbonenginejs/runtime-resource/formats/webgl";

const summary = CjsWebglFormat.inspect(packageBytes);
const packageData = CjsWebglFormat.read(packageBytes);
```

## Documentation map

- [Architecture and ownership](architecture.md)
- [Effect reflection contract](effect-reflection.md)
- [Constant-buffer layouts](carbon-constant-layouts.md)
- [Declaration and I/O lowering](decl-io.md)
- [Structured-memory lowering](memory-structured.md)
- [Texture sampling](texture-sample.md)
- [Class-purpose catalog](reference/classes/README.md)
