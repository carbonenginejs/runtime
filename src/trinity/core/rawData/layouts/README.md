# Per-object constant-buffer layouts

One file per Carbon donor header, each declaring the constant-buffer layouts that
header's producer uploads. `CjsPerObjectLayouts` composes them and resolves a
struct name to the form `RawData` is built from.

## Why these exist at all

C++ gets a struct's layout free from the type system: Carbon declares
`EveStretch2PerObjectData`, calls `accumulator->Allocate<T>()`, and memcpys the
struct straight into the constant buffer. JavaScript has no equivalent, so the
layout has to be written down.

That is why the classes are `Cjs*` rather than `Tr2*`/`Tri*`: grouping structs by
header is ours, not Carbon's. The donor's own name is usually taken anyway —
`EveStretch2` and `EveTurretSet` are the renderables that upload these.

## The contract

**Field ORDER and field SIZE are the whole binding contract.** Carbon's C++
declaration order *is* the byte layout the shader reads, so renaming a field is
safe while reordering or resizing one silently shifts every field after it.

**Every matrix here is TRANSPOSED**, matching Carbon's `= Transpose(m)` staging
fill. See the `carbon-math-conventions` skill before changing one, and verify with
rotation *and* non-uniform scale — identity and translation-only fixtures pass
under either operand order.

**Defaults are frozen and COPIED** into a record's buffer on allocation, never
assigned by reference. Carbon's arena does not clear on `Alloc`, so a field with
no default shows the previous tenant's bytes; that reproduces "unwritten slots =
allocator garbage", and declaring a default opts a field out of it.

## The shape of a file

A class holding one static, so the file owns one name like every other file in
the tree. It carries configuration and no behaviour:

```js
export class CjsEveStretch2Layout
{
  static structConfig = Object.freeze({ shared: { struct: "…", fields: { … } } });
}
```

A header may declare several structs — a vertex and a pixel payload, typically —
and they are read and changed together, so they stay in one file under one class
rather than being split.

## The three buffer keys

| key | meaning |
|---|---|
| `vs` | bound to the vertex stage, and to cs/gs/hs/ds per Carbon's mask |
| `ps` | bound to the pixel stage |
| `shared` | ONE buffer bound to both, where Carbon uploads the same bytes twice rather than declaring a pair |

`shared` is the one that pays for itself: `EveChildSpherePinPerObjectData` and
`StretchPerObjectData` each call `FillAndSetConstants` twice over identical bytes,
and a single declaration binds both stages from one upload.

## Related

The classes that own these payloads at runtime live in `../perObjectData`, whose
README covers the per-object data family and the one divergence it carries.
