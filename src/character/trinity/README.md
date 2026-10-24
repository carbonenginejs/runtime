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

## Interior scene resource notifications

`Tr2InteriorScene` acquires its background cubemap through the installed resource
manager. Shadow size/count edits recreate shared Trinity render-target and
depth-stencil wrappers through the supplied or application-installed render
context. The scene chooses native dimensions/formats and owns wrapper lifetime;
resource acquisition and backend texture realization remain in their existing
owners. Final `Destruct` releases the scene's shadow surfaces. Initializing the
scene acquires the cubemap only. Dynamic add/remove/rebuild membership now
uses native list callbacks and a unique pending-load set. Admission checks the
mapped interface before side effects. The forward scene path performs primary
visibility, fills per-frame buffers and submits native opaque/decal/transparent
batches through the normal render context. Physics updates and shadow rendering
remain unported; the forward path currently requires shadows to be disabled.

## Placeable resource ownership

`Tr2InteriorPlaceable` starts typed object loading after reader initialization and
reloads on resource-path notifications. Enabling uniqueness clones the current
authored graph through Blue; path edits take precedence in a combined notification.
Asynchronous completions cannot replace a newer request or a destroyed owner.
`WodPlaceableRes` belongs to `resource/geometry`: it is a loaded object graph,
not a resource-manager handle. Its visual `Tr2Model` remains in this character
tree and owns mesh bounds, transparency and batch ordering. Render allocations
use Trinity's existing geometry and AL owners.

Model resource bounds require every mesh to finish preparing; the public local
query aggregates whichever mesh bounds are available. A placeable resource caches
its first successful bounds. The mesh readiness adaptation observes its selected
request through completion, including failure and low-detail fallback; it does
not reproduce Carbon's queue-wide load fence. Placeable world bounds and the
unresolved TriMatrix boundary remain unported;
the implemented forward scene path does not establish complete placeable support.

## Interior interfaces

Carbon's `ITr2Interior.h` declares four `BLUE_INTERFACE`s:

| Carbon interface | Here |
| --- | --- |
| `ITr2InteriorCullable` | `interior/ITr2InteriorCullable.js` |
| `ITr2Interior` | `interior/ITr2Interior.js` |
| `ITr2InteriorDynamic` | `interior/ITr2InteriorDynamic.js` |
| `ITr2InteriorLight` | `interior/ITr2InteriorLight.js` |

These interfaces are registered nominal identities with abstract
methods and no persisted fields. Their registration supports native casts and
composition; it does not turn the nested `LightSourceItem` helper into a model.

## Skinned per-object data

Carbon's `Tr2PerObjectDataSkinned` (extends `Tr2PerObjectDataPSBuffer`) and
`Tr2PerAreaDataSkinned` (extends `Tr2PerObjectData`) are allocated only on
skinned and interior paths (`Tr2IntSkinnedObject`, `Tr2SkinnedModel`). They
now have maintained JS classes under `trinityCore/`. Their vertex buffer binds the per-object VS register 3 and
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
pixel payload, to the object's `SetPerObjectDataToDevice`. The port preserves
that instance relationship and uses virtual dispatch on normal render batches.
`Tr2SkinnedModel` creates a separate remapped palette per area, skips areas
above 69 joints, and uses 69 identity matrices when mapping is unavailable.

The object writes the world and mirror matrices as raw bytes, with no
transpose, unlike the per-object data of `EveSpaceObject2`. Its world matrix
comes from `Tr2IntSkinnedObject` untouched and its mirror is the identity. It
stores `m_worldPos` but never uploads it. Check the interior skinned shader's
matrix orientation before reusing the `SetAndTranspose` rule of
`../../trinity/core/rawData/perObjectData/`. CPU verification covers rotation,
non-uniform scale, the 69th joint, partial writes, stage masks and normal batch
submission. The interior object's producer now clears and fills the native
79-register PS block, including cached light records and already-transposed
spotlight matrices. Its batch traversal validates mesh indices, remaps area
palettes and computes the native float32 transparent depth key. World-bounds
queries transform all eight corners, preserving native float32 arithmetic and
zero-W behavior; frustum queries and scene-readiness checks consume those
bounds. Bone updates refresh dynamic bounds from the current animation
transforms and clear validity before an unavailable model or pose can reuse
stale bounds. Native forward scene submission now consumes this direct batch
path. Indirect draws, shadows, physics updates and complete character lifecycle
remain open.
