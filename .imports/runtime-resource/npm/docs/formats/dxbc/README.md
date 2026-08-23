# DXBC format documentation

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/dxbc`
Audience: Shader-tool authors, lowering-backend authors, and maintainers
Summary: Explains the pure-JavaScript DXBC reader, its decoded output, and its boundary with effect and shader-lowering packages.

## Purpose

`@carbonenginejs/runtime-resource/formats/dxbc` owns pure-JavaScript reading of Microsoft DXBC
containers. It validates the chunk directory, decodes input/output/patch
signatures, reads SM4/SM5 program headers, and converts instruction tokens into
structured records.

The package preserves unfamiliar declaration payload words as `tailTokens`
where the framing is valid. Executable instructions decode strictly and reject
malformed operand lengths.

## Use this package when

Use `format-dxbc` when you need:

- cheap DXBC identification and container inspection;
- plain JSON-compatible signatures and instruction records;
- internal decoder objects for an advanced shader backend; or
- a browser-safe byte decoder with no native executable or filesystem
  dependency.

Do not place target-language lowering rules here. GLSL emission belongs to
`@carbonenginejs/runtime-resource/formats/webgl`, and WGSL emission belongs to
`@carbonenginejs/runtime-resource/formats/webgpu`.

## Where it fits

```text
compiled effects
      |
      v
 format-hlsl
      |
      | opaque DXBC stage bytes
      v
 format-dxbc
      |
      +---- decoded records ----> format-webgl
      |
      +---- decoded records ----> format-webgpu
```

The public decoder contract is Microsoft DXBC data. Package-local binary
utilities are internal implementation details and are not public npm subpaths.

## Start here

```js
import { CjsDxbcFormat } from "@carbonenginejs/runtime-resource/formats/dxbc";

const decoded = CjsDxbcFormat.read(shaderBytes, {
    source: "example.dxbc"
});
```

## Documentation map

- [Architecture and boundaries](architecture.md)
- [Public API reference](reference/api.md)
- [Decoded output contract](reference/decoded-output.md)
- [Class-purpose catalog](reference/classes/README.md)
