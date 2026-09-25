# Carbon character and interior classes

This folder holds the Carbon-derived classes of the character domain:
`trinityCore/` (skinned objects, models, LODs, GState animation), `interior/`
(interior scene, placeables, lights, per-object PS data) and `wod/`. They
describe CPU scene, LOD, skeleton, light and batch intent. A resource-typed
field is a reference, not a GPU allocation. Carbon's headers and
implementations stay authoritative: registering or hydrating a class does not
make its behaviour a port.

`CjsCharacterRigBinding` (`../controls/`) maps animation-rig bones to render
joints by exact name and packs the 3x4 skinning palette that
`Tr2SkinnedObject.UpdateBones` produces. Cloth synchronization, delayed queues
and the backend upload stay outside this layer.

Historical classes with no current Carbon declaration live in `../incarna/`,
not here.

## Interior interfaces

Carbon's `ITr2Interior.h` declares four `BLUE_INTERFACE`s:

| Carbon interface | Here |
| --- | --- |
| `ITr2InteriorCullable` | not represented |
| `ITr2Interior` | not represented |
| `ITr2InteriorDynamic` | not represented |
| `ITr2InteriorLight` | `interior/ITr2InteriorLight.js` |

A `BLUE_INTERFACE` is not a constructible Blue model, so `ITr2InteriorLight`
is a JSDoc `@typedef` with no class and no `type.define` registration. The
other three would follow the same form. Because none of them declares a
class, class catalogs, parity audits and naming lints do not list them.

## Skinned per-object data (not ported)

Carbon's `Tr2PerObjectDataSkinned` (extends `Tr2PerObjectDataPSBuffer`) and
`Tr2PerAreaDataSkinned` (extends `Tr2PerObjectData`) are allocated only on
skinned and interior paths (`Tr2IntSkinnedObject`, `Tr2SkinnedModel`). They
have no JS class. Their vertex buffer binds the per-object VS register 3 and
is `(TR2_MAX_BONES_PER_MESHAREA * 3 + 5 + 4) * 16` bytes, with
`TR2_MAX_BONES_PER_MESHAREA = 69`:

| Region | Offset | Bytes |
| --- | --- | --- |
| joint palette, 3 registers per joint | 0 | 3,312 |
| world matrix | 3,312 | 64 |
| not written | 3,376 | 16 |
| mirror matrix | 3,392 | 64 |

Two objects write that one buffer. `Tr2PerAreaDataSkinned::SetPerObjectDataToDevice`
creates and locks it, calls its object's `UpdateVertexShaderCBMirror` to place
the world and mirror matrices, then copies `jointCount * 3 * 16` bytes of its
own joints at offset 0 (`jointCount` is asserted and clamped to 69). It then
removes the vertex-stage bits from the mask and hands the rest, including the
pixel payload, to the object's `SetPerObjectDataToDevice`. Porting it needs
that instance relationship, not a helper over a `{ vs, ps }` record.

The object writes the world and mirror matrices as raw bytes, with no
transpose, unlike the per-object data of `EveSpaceObject2`. Its world matrix
comes from `Tr2IntSkinnedObject` untouched and its mirror is the identity. It
stores `m_worldPos` but never uploads it. Check the interior skinned shader's
matrix orientation before reusing the `SetAndTranspose` rule of
`../../trinity/core/rawData/perObjectData/`, and test with rotation and
non-uniform scale.
