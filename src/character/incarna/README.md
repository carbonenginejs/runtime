# Incarna classes

Incarna, EVE's walk-in stations, used classes that current Carbon no longer
declares. Its content still names them: a captain's quarters walkway piece is a
`Tr2InteriorStatic` whose mesh areas hold `Tr2ShaderMaterial`s. The classes
here let that content load.

Each class is reconstructed from Black records, not ported from source:

- Its members, and their order, are those the records write. Its JSDoc names
  the records.
- It is `@meta.define`d, with no Carbon donor, and carries a class-level
  `@meta.adapted`.
- Its exposure flags, and any interfaces it maps, are guessed. The records show
  only that members persist; interfaces are the ones the consuming scene needs.
- Its behaviour, where it has any, is ours. It is modelled on the nearest class
  current Carbon still has, and each method's JSDoc says where it differs.

| Class | Records | Behaviour |
|---|---|---|
| `Tr2InteriorStatic` | interior kit pieces | Draws its `detailMeshes` in a `Tr2InteriorScene`, modelled on `Tr2InteriorPlaceable`. Its `transform` is ours; the records carry no placement. On `Initialize` it replaces each area's `Tr2ShaderMaterial` with the `Tr2Effect` it becomes. |
| `Tr2ShaderMaterial` | the effect of an Incarna mesh area | Read, then converted: `CreateEffect` moves its parameters into a `Tr2Effect` whose path comes from the shader library, `res:/graphics/shaders/compiled/dx11/<source>.fxt`. The material itself never draws (`IsGood()` false). |
| `Tr2ShaderManager` | `res:/graphics/shaders/shaderdescriptions.black` | Data only: the shader library, every `Tr2HighLevelShader`. |
| `Tr2HighLevelShader` | the library and `shaderdescriptions/*.black` | Data only: a shader's source path, permutation tags and parameter descriptions. |
| `Tr2ShaderPermuteTag` | the library | Data only: a permutation define and the bit it sets in a compiled row's key. |
| `Tr2ShaderTexDesc`, `Tr2ShaderFloatDesc`, `Tr2ShaderFloat2Desc`, `Tr2ShaderFloat3Desc`, `Tr2ShaderFloat4Desc` | the library | Data only: one parameter's default and editor text. |

Incarna's compiled shaders, `graphics/shaders/compiled/<platform>/*.fxt`, load
through `Tr2EffectRes`; `fxt` is registered as an Incarna-era extension
(`trinity/shader/registerShaderResources.js`).

An opaque request to a `Tr2InteriorStatic` also draws its meshes'
`opaquePrepassAreas`. Incarna drew those in its light pre-pass, and current
Carbon draws them only for picking.
