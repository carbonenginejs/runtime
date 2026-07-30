# Shader resource model

Status: Stable
Scope: `@carbonenginejs/runtime-resource`, with notes on `@carbonenginejs/runtime-trinity`
Audience: Anyone touching `Tr2EffectRes`, `Tr2Shader`, `Tr2Effect`, or the shader package formats
Summary: How an effect file, its permutations, and the objects that resolve them relate — and why this matches Carbon exactly.

## The target

This is Carbon's model, verified against `E:\carbonengine`. It is the target and we
should not diverge from it. Where our code already matches, leave it alone; where
it does not, the difference is a defect rather than a design choice.

Three levels, and the distinction between them is the thing people get wrong:

| level | is | owns |
|---|---|---|
| `Tr2EffectRes` | **the file** | the bytes, string table, permutation axes, offset table, and a cache of resolved shaders |
| `Tr2Shader` | **one permutation** | all techniques and passes for that one option set |
| `Tr2Effect` | **an instance** | its own `options`, a reference to the res, and a pointer to the shader those options resolve to |

The common error is assuming `Tr2EffectRes` is one permutation, or that `Tr2Shader`
is "the shader" for a file. Neither is true. One file yields many shaders; one
shader is one permutation; many effects share both.

## Carbon

`carbonengine/trinity/trinity/Resources/Tr2EffectRes.h`:

```cpp
BLUE_CLASS( Tr2EffectRes ) : public BlueAsyncRes, public ICacheable, ...
{
    Tr2ShaderPtr GetShader( const Tr2ShaderOption* options, size_t count );

protected:
    // Per-permutation compiled file information
    struct FileRecord { uint32_t index; uint32_t offset; uint32_t size; };

    CcpMallocBuffer   m_data;                                  // the whole file, retained
    const char*       m_stringTable;
    const FileRecord* m_offsets;   uint32_t m_offsetCount;     // one row per permutation
    TrackableStdVector<Tr2ShaderPermutation>         m_permutations;  // the axes
    TrackableStdUnorderedMap<uint32_t, Tr2ShaderPtr> m_shaders;       // index -> shader
};
```

`m_shaders` is a **map keyed by permutation index**, and `m_data` retains the whole
file. `Tr2EffectRes` is `ICacheable` with `GetMemoryUsage()` — it is shared and
long-lived, by design.

`Tr2Effect` inherits `Tr2Material`, which declares `Tr2ShaderPtr m_shader`
(`Tr2Material.h:247` — it is *not* in `Tr2Effect.h`, which is why a quick grep
suggests the member does not exist). It resolves in
`Tr2Effect::RebuildCachedDataInternal`:

```cpp
m_shader = nullptr;
if( m_effectResource )
    m_shader = m_effectResource->GetShader( &m_options[0], m_options.size() );
```

So there are **two** caches, deliberately:

- the res caches shaders so many effects share one per permutation
- each effect caches its resolved pointer so it is not re-resolving per draw

Change an effect's options, rebuild, get a different shader out of the same file.

## Ours

`runtime-resource/src/resource/shader/Tr2EffectRes.js` matches:

| Carbon | ours |
|---|---|
| `m_shaders` map<index, shader> | `#shaders = new Map()`, keyed by index |
| `GetShader(options, count)` | `GetShader(options, count)` -> index -> `GetShaderByIndex` |
| `m_permutations` | `getPermutationAxes(payload)` from `permutationGraph.axes` |
| `m_offsets` FileRecord | `getPortableReflection(payload, index)` |
| `m_data` | `GetPayload()` retains the package |

```js
GetShaderByIndex(index) {
  if (this.#shaders.has(index)) return this.#shaders.get(index);
  const portable = getPortableReflection(this.GetPayload(), index);
  const shader = Tr2Shader.fromPortable(portable);
  this.#shaders.set(index, shader);
  return shader;
}
```

`runtime-trinity`'s `Tr2Effect.RebuildCachedDataInternal` matches Carbon too — it
clears and re-resolves through the res on rebuild. ccpwgl's `Tw2Effect` does the
same thing; all three agree, so this is Carbon's shape and not a ccpwgl import.

**The apparatus is right. What is missing is upstream.**

## The gap: our packages carry one permutation

Carbon effect files carry **every** permutation and select at read time through the
offset table. Measured:

| file | permutations | distinct bodies |
|---|---|---|
| `effect.dx11/.../unpacked_quadv5.sm_hi` | 480 | 144 |
| `effect.gles2/.../geometryviewer.sm_hi` | 80 | 27 |
| `effect.gles2/.../textureviewer.sm_hi` | 18 | 3 |

Our `.cewgpu` / `.cewg` builder takes `{permutation, selection}` and bakes one body
at build time, recording what it kept as `bodyIndex` / `bodyMode` /
`selectedOptions` / `wgslSelection`. Those fields have no Carbon counterpart
because Carbon's compiler never discards anything.

The consequence is not a size inefficiency. It is that **`#shaders` can only ever
hold one entry**, so:

- `Tr2Effect` cannot switch permutation options at runtime — there is nothing to
  switch to
- two effects with different options cannot both resolve correctly from one loaded
  file, concurrently, which is the normal case (one ship with patterns, one
  without, same frame)
- every option an effect sets is silently ignored rather than failing loudly

**Requirement: a shader package must contain all of its permutations.** SOF and
`Tr2Effect` must be able to enable and disable permutation options at will. This is
functional, not a preference.

Tracked in `.agents/handoff/2026-07-30-cewgpu-cewg-binary-chunk-encoding.md`.

## Reading Carbon without getting it wrong

Three claims were made and retracted while establishing the above, all from
partial reads. They are recorded because the same traps are still there:

1. **"Carbon has no per-pass dedupe, so porting its offset table loses our
   `Depth` 96->8 sharing."** Wrong. Shader code is a `{size, offset}` into the
   shared string table (`shaderCode = stream.ReadString( shaderSize )`), so
   identical passes already share across bodies. Carbon dedupes at two levels —
   offset table for whole bodies, string table for code — which is simpler and
   better than the two-level offset table that "fix" would have invented.

2. **"There is no `Tr2EffectRes` class."** There is; it is in `runtime-resource`,
   not `runtime-trinity`. The search was scoped to one package.

3. **"`Tr2Effect` has no shader member, so our caching it is a ccpwgl import."**
   It does; `m_shader` is declared on the `Tr2Material` base, not on `Tr2Effect`.

The pattern in all three: reading one file, finding an absence, and treating it as
evidence. If Carbon's design looks deficient, assume the mechanism is somewhere you
have not looked yet.
