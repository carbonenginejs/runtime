# HLSL effect format

`CjsHlslFormat` reads Carbon effect containers and emits JSON, compact metadata,
or canonical `Tr2EffectRes` reflection. The raw mode and `readEffectAnalysis`
are internal tooling surfaces; use JSON or metadata for application data.

Raw loading decodes the header. `GetShader` selects a permutation using
canonical global, local and default options; `GetShaderByIndex` bypasses
overrides and caches that exact table index. The format does not mark a
resource ready in a resource manager, create device state, or intern handles.
`IsGood` therefore reports lifecycle readiness, not successful header decoding.

Format header metadata is read over the same byte buffer without accessing the
resource's private reader. Body decoding remains in the resource. The shared
binding projection derives translator defaults and sampler values without
changing the source reflection used by the Carbon writer.

The canonical graph keeps authored sampler names, raw float bits and complete
default-value bytes. JSON and translator bindings expose effective sampler
names and numeric descriptors. Nonempty program arena offsets are not retained:
their diagnostic `stringTableOffset` is null. Shader handles remain unrealized
until Trinity registers them.
