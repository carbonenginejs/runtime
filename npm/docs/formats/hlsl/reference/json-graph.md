# JSON and metadata graphs

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/hlsl` emitted data
Audience: Users and integrators
Summary: Documents the default JSON graph, compact metadata graph, and permutation selection.

## Default JSON graph

`emit: "json"` is the default:

```text
Root
|- version, compilerVersion, sourcePath, bodyCount, loadError
|- permutations: Permutation[]
`- effect: EffectDescription | null
   |- version, effectName, annotations, readError
   `- techniques: Technique[]
      `- passes: Pass[]
         |- renderStates: { key, value }[]
         `- stageInputs: (StageInput | null)[]
            |- constants: Constant[]
            |- resources: Resource[]
            |- uavs: Resource[]
            |- samplers: Sampler[]
            |- signature
            `- bytecode: ShaderBytecode | null
```

Bytecode values are opaque payloads. A compatible bytecode-format package
must decode their instruction streams.

## Permutation selection

By default, `effect` represents the container's default option set. Select
another compiled body with an array or `Map`:

```js
const effect = CjsHlslFormat.read(bytes, {
    permutation: [
        { name: "BLEND_MODE", value: "TRANSPARENT" }
    ]
});
```

## Metadata graph

`emit: "metadata"` returns compact inspection data without bytecode,
constant-value bytes, or runtime handles:

```text
MetadataRoot
|- version, compilerVersion, sourcePath, bodyCount, loadError
|- permutations: Permutation[]
|- bodyIndex
|- selectedOptions: Option[]
`- effect: MetadataEffect | null
   `- techniques: Technique[]
      `- passes: Pass[]
         |- renderStates: RenderState[]
         `- stageInputs: (StageInput | null)[]
            |- constantValueSize
            |- constants: Constant[]
            |- resources: Resource[]
            |- uavs: Resource[]
            |- samplers: Sampler[]
            |- annotations
            `- signature
```

Each render-state record retains its numeric `key` and `value`. Known state
types can also include readable or typed fields such as `name`, `valueName`,
`valueFloat`, `valueHex`, or `valueFlags`.

## Raw graph

`emit: "raw"` returns the internal parser-DTO `Tr2EffectRes` graph. It is not
the canonical runtime-resource class. It allows advanced callers to resolve
multiple permutations after one parse, but it is not a stable or
serialization-safe schema.

Raw stage and library inputs retain authored `sourceConstantValueSize` /
`sourceConstantValues` separately from Carbon-compatible mutable constant
buffers. Libraries retain their source `cjsShaderBytecode` directly.

## Compatibility and failures

The reader supports compiled effect versions 8 through 15. The root or
selected effect can contain format-defined error fields when a compiled body
cannot be decoded. Invalid input reads and unsupported layout decisions throw
rather than being filled with guessed values.

## Related documentation

- [API reference](api.md)
- [Advanced analysis exports](advanced-analysis.md)
- [Reading effects](../guides/reading-effects.md)
