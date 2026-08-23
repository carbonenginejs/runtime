# Advanced analysis exports

Status: Experimental
Scope: `@carbonenginejs/runtime/resource/formats/hlsl` advanced named exports
Audience: Translation-tool authors and maintainers
Summary: Documents unstable helpers for raw graph analysis and binding-manifest construction.

## Stability

These exports support translation and inspection tooling that needs internal
effect-model objects. Their shapes may change without a major version bump.
Use `CjsHlslFormat.read(..., { emit: "json" })` or `"metadata"` for the
supported data contracts.

## `readEffectAnalysis`

```js
import { readEffectAnalysis } from "@carbonenginejs/runtime/resource/formats/hlsl";

const analysis = readEffectAnalysis(bytes, {
    source: "effect.sm_hi",
    permutation: [
        { name: "BLEND_MODE", value: "TRANSPARENT" }
    ]
});
```

The result contains the loaded effect resource, resolved shader, selected
option and body-index data, effect description, and a binding manifest when
an effect description is available.

The returned internal parser-DTO effect resource also has
`GetShaderByIndex(index)`. It decodes one exact permutation-table slot without
applying global or local option overrides, so a body-table index stays stable
even when an application has set global effect options. It is distinct from the
canonical `Tr2EffectRes.GetShaderByIndex`, which resolves options, hydrates a
`Tr2Shader`, and caches it per index.

## Binding manifest

`analysis.bindingManifest` derives register-named constant, resource, sampler,
and UAV bindings from an internal effect description. Its class is internal to
the format and is not a published export; treat the manifest as data.

## Source truth and realization

Nothing this subpath returns carries a renderer handle: no shader, program,
render-state, sampler, or library handles, and no resource sets, heap-view
arrays, backend layouts, masks, sort values, or caches. Engines own all of
that. Two consequences are easy to trip over:

- Register dynamic classification is not persisted. It follows per-frame
  reader and engine policy, and is not an authored binary field.
- Authored constant defaults are separate from the raw model's mutable
  `constantValues`. Carbon-compatible sampler-heap realization may zero-extend
  the latter; it cannot change the authored source prefix.

## Related documentation

- [JSON and metadata graphs](json-graph.md)
- [Carbon compiled-effect container](../../carbon-effect-container.md)
