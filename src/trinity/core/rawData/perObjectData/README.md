# Per-object data

Carbon's per-object data classes. One folder because they are one family: a base
with a virtual upload, two generic subclasses, and a class per Eve producer that
needs a payload shape of its own.

`index.js` re-exports them in Carbon's declaration order.

## What these are for

A renderable's `GetPerObjectData` returns one of these, a batch references it,
and the renderer asks it to upload itself. Carbon's upload is a **virtual on the
data**, which is why the classes exist rather than one function over a record:
the subclasses genuinely differ, and at least one difference is inexpressible in
JavaScript without them (see *The divergence*, below).

The payload itself is a `RawData` in a layout named by `CjsPerObjectLayouts`.
Carbon holds a fixed float array plus a size, and copies a stack struct into it
with `CopyToVSFloatBuffer` / `CopyToPSFloatBuffer`:

```cpp
EvePerObjectVSData perObjectVSBuffer;                  // stack, defaults
perObjectVSBuffer.WorldMat = Transpose( m_worldTransform );
data->CopyToVSFloatBuffer( perObjectVSBuffer );        // memcpy into the member
```

**Those Copy methods are deliberately not ported.** They bridge a stack struct
into a member array, and JavaScript has no such gap: a `RawData` already *is* the
uploadable buffer. So a class leases its payload in the named layout and the
producer writes onto it directly. A method carrying Carbon's name while taking
field-wise writes instead of a whole struct would read as ported when it is not.
Carbon's `static_assert( sizeof(T) <= sizeof(buffer) )` survives as
`AssertFitsPerObjectBudget`, which throws rather than letting the upload clamp
and silently drop a tail.

The layout name is how we express Carbon's template parameter: there is no
`CopyToVSFloatBuffer<T>`, so `T` is named when the payload is leased.

## The divergence

One, carried by the whole family and stated once here and on
`Tr2PerObjectDataStandard`.

**Carbon binds most per-object payloads without consulting the technique's shader
mask; we always consult it.** Carbon distinguishes the two forms by C++ overload
resolution on an argument type — `FillAndSetConstants` takes `unsigned` at
`Tr2RenderUtils.h:35` and `ShaderType` at `:46`, the latter shifting `1 << t` —
which JavaScript cannot express at all.

**The donor does three different things**, which is why this is a choice rather
than a defect to reproduce. Verified 2026-09-11 across every per-object bind:

| behaviour | classes |
|---|---|
| masks the vertex family with `perFrameVsMask & constantTypeMask`; `Standard` leaves its pixel half unmasked, `Skinned` gates that half behind an explicit `if` | the two Trinity generics — and `Tr2PerObjectData.cpp` is the ONLY file in Carbon where the masked form appears |
| unmasked, both halves | all fourteen Eve classes, at sixteen call sites |
| gates EVERY stage explicitly, geometry included | `Tr2PerObjectDataWithPersistentBuffers` |

So gating everything is not an invention: it is what Carbon's persistent class
does, and that class carries the most careful comment of the family. What we add
is generality — it gates per stage by hand, we gate per layout declaration.

We gate every payload, for a reason Carbon does not have available: **our layouts
declare which stages they serve.** The gate is therefore per layout rather than
per hardcoded half, and it is strictly more precise. `FillAndSetConstants` is
built around it — its own comment records the zero-mask skip as how "a payload
declared for stages a technique does not use gets skipped, per batch, without the
caller testing anything". Binding a pixel buffer for a pipeline with no pixel
stage is wasted upload work.

The declaration also expresses something Carbon cannot. `EveChildSpherePinPerObjectData`
uploads **the same bytes to both per-object registers** — two
`FillAndSetConstants` calls over one `&m_worldMatrix`. A layout declaring
`stages: [ "vs", "ps" ]` is one payload uploaded once, bound to both.

Recorded as CE-19 in `docs/research/carbon-known-defects.md`.

## The ownership patterns

The family is not uniform, and the differences are the reason to keep the donor
names rather than collapse anything:

| pattern | holds | examples |
|---|---|---|
| **pair** | a vertex payload and a pixel payload | `Tr2PerObjectDataStandard`, `EveDecalPerObjectData`, `EveTurretSetPerObjectData`, `EveBoosterSetPerObjectData` |
| **shared** | ONE payload, bound to both registers | `EveChildSpherePinPerObjectData`, `EveSpherePinPerObjectData`, `EveLensflarePerObjectData` |
| **vertex only** | one vertex payload | `EveChildBulletStormPerObjectData`, `EveChildParticleSpherePerObjectData` |
| **borrowed** | nothing; points at the payloads of the object it decorates | `EveChildBehaviorSystemPerObjectData`, `EveChildLineSetPerObjectData` |
| **type-erased** | opaque bytes and a size (`void* m_data; size_t m_size`) | `StretchPerObjectData` |
| **persistent** | buffers owned across frames rather than leased per frame | `Tr2PerObjectDataWithPersistentBuffers` |

Because those shapes differ, each class declares what it uploads through
`GetPayloads()` rather than anything reading its properties. The base returns
none, matching its empty upload.

## Leased or persistent

Most payloads are leased per frame from the batch accumulator's arena, which is
Carbon's shape — `accumulator->Allocate<Tr2PerObjectDataStandard>()` leases the
object and its buffers are members of it. A few are owned across frames via
`RawData.create`.

**Getting this wrong is silent**: a long-lived object holding a recycled lease
reads another object's bytes next frame. Carbon answers it by class rather than by
flag — `Tr2PersistentPerObjectData` and `Tr2PerObjectDataWithPersistentBuffers`
exist for objects that own their buffer — so a producer's choice is visible in
which class it allocates.

Our classes construct the object directly rather than through
`ITriRenderBatchAccumulator.Allocate`, because that door records that it only
calls the constructor: in JavaScript the GC owns the object's lifetime, and it is
the *buffers* that need the arena. If it ever starts pooling, route through it.

## Not here

- **`Tr2PerObjectDataSkinned` and `Tr2PerAreaDataSkinned`** belong to the
  character domain: every allocation site is a skinned or interior path, and they
  need the interior renderer. `runtime/docs/character/architecture.md` holds their
  layout, including a transpose rule that does **not** match this family's.
- **`ApplyConstantBuffers`**, the indirect-draw sibling of the upload, writes
  through `Tr2IndirectDrawBufferWriter`. That has no JS counterpart and nothing on
  this path draws indirectly, so it throws — as Carbon's base asserts.

## Before changing a layout

Per-object matrices are uploaded transposed, and `RawData` makes `Set`/`Get`
*throw* on a matrix field so the call site has to say `SetAndTranspose`. Verify
any change with rotation **and non-uniform scale**: identity and translation-only
fixtures pass under either operand order, so they cannot see a transpose or
operand-order error. See the `carbon-math-conventions` skill.
