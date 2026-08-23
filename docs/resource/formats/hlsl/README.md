# Package documentation

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/hlsl`
Audience: Users and integrators
Summary: Documentation home for the compiled Carbon/Trinity effect-container reader.

## Purpose

`@carbonenginejs/runtime/resource/formats/hlsl` reads versions 8 through 15 of the compiled
effect container used by Carbon/Trinity. It resolves a permutation and exposes
techniques, passes, stage metadata, render states, signatures, and opaque
shader bytecode as JavaScript data.

```js
import CjsHlslFormat from "@carbonenginejs/runtime/resource/formats/hlsl";

const metadata = CjsHlslFormat.read(bytes, {
    emit: "metadata"
});
```

## Where it fits

- Use this package for the effect container and its metadata.
- Use `@carbonenginejs/runtime/resource/formats/dxbc` to decode supported embedded Direct3D
  shader bytecode.
- Translation backends such as `@carbonenginejs/runtime/resource/formats/webgpu` can consume
  the metadata and bytecode through their own integration layers.
- `@carbonenginejs/runtime/resource` reads the compiled container directly and
  owns canonical `Tr2EffectRes`/`Tr2Shader` construction, selection, and
  caching.
- `@carbonenginejs/runtime/trinity` consumes that shader graph through its
  mutable effect/material facade, parameters, options, and sampler overrides.

The package does not compile HLSL source, translate shader instructions,
construct canonical runtime model instances, or provide a rendering runtime.

## Start here

- [Architecture](architecture.md)
- [Reading effects](guides/reading-effects.md)
- [Hydrating JSON output](guides/hydrating-json-output.md)
- [API reference](reference/api.md)
- [Advanced analysis exports](reference/advanced-analysis.md)
- [JSON graph reference](reference/json-graph.md)
- [Class catalog](reference/classes/README.md)

## Compatibility

Supported input types are `.sm_hi`, `.sm_lo`, and `.sm_depth` compiled effect
bodies. Unsupported headers, invalid offsets, truncated data, and invalid
permutation selections fail with an error rather than returning a partial
success value.
