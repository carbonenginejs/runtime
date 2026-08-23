# Dropped classes — deliberately not ported, never exported

The files in this folder are Carbon Blue classes or scanner-emitted native C++
shapes that CarbonEngineJS has DECIDED NOT TO PORT as runtime models. They are
kept here, outside `src/trinity/generated/`, so the
generator skips them permanently and no one spends another pass trying to
"finish" their stubs. Nothing in this folder is exported from any package
index, imported by any runtime code, or registered in the schema registry
(the `@type.define` decorators only run on import, and nothing imports these
files).

## Why these classes are dropped

Every quarantined file has an explicit disposition:

| File | Why it is not a runtime model | Replacement |
|---|---|---|
| `AreaBoundsInfo.js` | Native Granny extended-data record nested inside `MeshBoundsInfo`; it is neither Blue-exposed nor independently persisted. | Plain `{ bounds, vertexCount }` data owned by the GR2/geometry reader boundary. |
| `BoundingBox.js` | Native `granny_real32[3]` min/max record used only while decoding Granny extended data; it is not a Blue graph class. | `@carbonenginejs/runtime/math/box3` or plain `{ min, max }` reader data. |
| `CASConstants.js` | Native AMD sharpening constant struct nested in the post-process renderer; it is not Blue-exposed or independently persisted. | Plain pair of four-lane numeric/bit-pattern arrays produced by the renderer's CAS parameter builder. |
| `EveInstancedMeshManager.js` | Native scene-owned instancing manager with GPU buffers, allocator state, picking state, and nested C++ records; it has no `BLUE_CLASS` declaration or persisted graph identity. | Engine-owned instancing realization fed by Trinity instance data and scene objects. |
| `EveSpherePinIndexTree.js` | Native spherical geometry index with private pointer-backed `Face`/`TreeNode` storage; it is not Blue-exposed or serialized. | Engine/resource-side spatial index built from decoded geometry when sphere-pin picking needs it. |
| `ITriColor.js` | Pure interface for the retired Blue/Python color wrapper; it has no independent graph state. | `@carbonenginejs/runtime/vec4` and schema `color` fields. |
| `ITriDevice.js` | Pure device interface; the emitted `adapter` member was nested creation data, not interface state. | Maintained device-free `TriDevice` graph plus injected engine realization. |
| `ITriEffectTextureParameter.js` | Pure interface; the emitted `UV_SET_MAX_COUNT` is a static constant, not instance state. | Concrete maintained texture-parameter graph classes. |
| `ITriMatrix.js` | Pure interface for the Blue/Python matrix wrapper; it has no independent graph state. | `@carbonenginejs/runtime/math/mat4`; the concrete `TriMatrix` quarantine is owned by `src/character`. |
| `ITriQuaternion.js` | Pure interface for the retired Blue/Python quaternion wrapper. | `@carbonenginejs/runtime/math/quat` and schema `quat` fields. |
| `ITriVector.js` | Pure interface for the retired Blue/Python vector wrapper. | `@carbonenginejs/runtime/math/vec3` and schema vector fields. |
| `MeshBoundsInfo.js` | Packed native Granny extended-data layout containing pointers and counts; it is reader implementation data, not a persisted Trinity object. | A detached plain record produced by the GR2/geometry reader, with arrays replacing native pointers/counts. |
| `Point.js` | Native integer helper record, not a persisted Blue object. | Plain `{ x, y }` records at adapter boundaries. |
| `Tr2CurveBase.js` | Generic C++ template whose emitted `KeyValue`/`Key` fields are unresolved template parameters. | Maintained concrete curve classes own concrete storage and behavior. |
| `Tr2CurveRasterizeDestination.js` | Native method destination record, not a Blue graph class. | Plain destination records consumed by `Tr2CurveScalar.Rasterize`. |
| `Tr2CurveScalarDefinition.js` | Native method definition record, not a Blue graph class. | Plain definition records consumed by `Tr2CurveScalar.GetDefinition`/`SetDefinition`. |
| `Tr2DebugColor.js` | Native debug-renderer value struct, not persisted graph state. | Plain engine/debug-adapter record when a renderer needs it. |
| `Tr2DebugObjectReference.js` | Native debug-renderer reference struct, not persisted graph state. | Plain engine/debug-adapter record when a renderer needs it. |
| `Tr2Key.js` | Generic C++ key template with unresolved value type `T`. | Concrete maintained key classes such as `Tr2CurveScalarKey`. |
| `Tr2OcclusionBuffer.js` | Native singleton `Tr2DeviceResource` that allocates GPU offsets and processes an effect-backed occlusion buffer; it is not a Blue graph class. | Renderer-owned occlusion-buffer service associated with scene graph objects outside persisted state. |
| `Tr2ParticleStreamIterator.js` | Internal C++ template that advances typed pointers through particle buffers; the scanner exposed its stride local as model state. | Plain typed-array indexing inside maintained CPU particle simulation code. |
| `Tr2RaytracingMeshArea.js` | Native per-area BLAS/cache helper with device acceleration structures; it has no `BLUE_CLASS` declaration and the emitted `true` field is a method literal. | Raytracing engine backend area state associated with the maintained graph/resource owner. |
| `Tr2Rect.js` | Native integer rectangle record, not a persisted Blue object. | Plain `{ left, top, right, bottom }` records at adapter boundaries. |
| `TriColor.js` | Blue/Python scripting wrapper around native color math. | `@carbonenginejs/runtime/math/vec4`. |
| `TriPerlinNoise.js` | Real native seeded-noise utility, but not a Blue/persisted model; the scanner emitted only private constants and omitted its gradient state and behavior. | Source-backed deterministic `createPerlinNoise1D` and `carbonPerlin1D` in `@carbonenginejs/runtime/math/noise`; legacy ccpwgl `perlin1`/`perlin1D` remain separate. |
| `TriQuaternion.js` | Blue/Python scripting wrapper around native quaternion math. | `@carbonenginejs/runtime/math/quat`. |
| `TriVector.js` | Blue/Python scripting wrapper around native vector math. | `@carbonenginejs/runtime/math/vec3`. |
| `Vector3d.js` | Native double-precision math value struct; scanner fields such as `d`, `dDiv`, and `norm` are constructor/operator locals, not instance state. | Three-element numeric/`Float64Array` values at double-precision boundaries; schema references remain structural `Vector3d` records. |
| `Vector4d.js` | Native double-precision math value struct; scanner fields such as `d`, `dDiv`, and `f` are constructor/operator locals, not instance state. | Four-element numeric/`Float64Array` values at double-precision boundaries. |

The 2026-07-19 generated-source placement audit added four groups that the
scanner had incorrectly promoted to constructible `CjsModel` classes:

- Pure interfaces `ITriDevice` and `ITriEffectTextureParameter`. Their emitted
  fields came from a nested declaration or a static constant, not interface
  instance state.
- Generic C++ templates `Tr2CurveBase` and `Tr2Key`. Runtime curve classes own
  their concrete storage and behavior; these template shells are not Blue
  graph objects.
- Native method records `Tr2CurveScalarDefinition` and
  `Tr2CurveRasterizeDestination`. `Tr2CurveScalar` consumes their shapes as
  ordinary JavaScript records rather than registered constructors.
- Native utility/debug records `Point`, `Tr2Rect`, `Tr2DebugColor`,
  `Tr2DebugObjectReference`, and `TriPerlinNoise`. They are not persisted Blue
  model classes and their generated static/member shapes are misleading.
- Native Granny extended-data records `BoundingBox`, `AreaBoundsInfo`, and
  `MeshBoundsInfo`, plus the native double-precision value structs `Vector3d`
  and `Vector4d`. Readers and math buffers own these shapes; registering them
  as `CjsModel` constructors would turn array members, pointer/count pairs, and
  operator locals into false serialized state.

`ITr2InteriorLight` is deliberately not in this list: its type-only Carbon
interface contract is owned by `src/character/trinity/interior`.

The browser platform/input classes are also deliberately not dropped.
`Tr2DisplayMode`, `Tr2PlatformInfo`, `Tr2VideoAdapter`, `Tr2VideoAdapters`, and
`Tr2VideoDriver` are maintained by `src/core`, which reports the
capabilities and privacy-filtered adapter/display information actually exposed
by a browser. `Tr2MainWindow`, `Tr2MainWindowState`, `Tr2MouseCursor`, and
`UIScancode` are maintained by `runtime-input`, where native handles and
message pumps are adapted to DOM input, CSS cursors, Pointer Lock, Fullscreen,
and injected browser host objects.

`TriVector`, `TriQuaternion`, `TriColor` (and their Blue interfaces
`ITriVector`, `ITriMatrix`, `ITriQuaternion`, `ITriColor`) were
investigated on 2026-07-17 during the trinity CPU-completion pass:

- They are Blue/Python SCRIPTING WRAPPERS (`IPythonMethods`, `Py*` thunks)
  around Carbon's native math, fully redundant with `@carbonenginejs/runtime/global`
  (gl-matrix based), which every runtime class already uses.
- Carbon composes row vectors while core-math/gl-matrix composes column
  vectors; delegating these wrappers to core-math without reversing composed
  operands would be wrong. The CPU graph keeps logical gl-matrix values.
  Trinity's `RawData.SetAndTranspose*` methods encode matrix fields into the
  canonical stored representation; an engine uploads those lanes unchanged.
- The concrete `TriMatrix` wrapper is referenced only by the character layer's
  interior/skinned-object schemas. Its quarantine and full disposition moved
  to `src/character/dropped`; only the unused `ITriMatrix` interface
  artifact remains here.
- The full TQ 3430261 `data.black` corpus (2,551 hulls) builds and hydrates
  with zero reports without any of these classes registered.

## Superseded per-object-data payloads (RawData migration, 2026-07-24)

Unlike the rest of this folder (native shapes never ported), these three were
FULLY-PORTED `CjsModel` per-object-data payload classes that the RawData
per-object-data system replaced. Payloads now flow through Trinity's
`TriPoolAllocator` (`src/trinity/core/rawData/`): a renderable's
`GetPerObjectData` allocates a catalogued record and writes fields with `Set`,
`SetIndex`, or `SetAndTranspose*`. Trinity resolves the offsets and encodes the
canonical stored lanes; an engine later allocates, uploads, and binds those
bytes. The CjsModel payload class is therefore no longer the vehicle. These
files are quarantined here (not deleted) as shape reference in case the
contract must be re-derived.

| File | Was | Replaced by |
|---|---|---|
| `EveBasicPerObjectData.js` | EveTransform world/worldLast/worldInverse record | `Alloc("EveBasicPerObjectData")` in `EveTransform.GetPerObjectData` |
| `EveMissileWarheadPerObjectData.js` | Warhead world + missileSize record | `Alloc("EveMissileWarheadPerObjectData")` in `EveMissileWarhead.GetPerObjectData` |
| `EveSceneStaticParticlesPerObjectData.js` | Static-particles world/lastWorld record (generator-emitted) | `Alloc("EveSceneStaticParticlesPerObjectData")` in `EveSceneStaticParticles.GetPerObjectData` |

The maintained struct definitions (names, sizes, encodings, stages, and
offsets) live in Trinity's `CjsPerObjectLayouts.js`, keyed by the same struct
names. `test/trinity/helpers/perObjectStore.js` supplies additional test-only
definitions for records not yet in that production catalog. These three keep
their `export class` text like every other file in this folder, which is also
what makes the generator skip re-emitting the one generated basename
(`EveSceneStaticParticlesPerObjectData`).

## Superseded per-object-data payloads, wave 2 (producer port, 2026-07-29)

The 2026-07-24 note above described three payload classes replaced by RawData.
The remaining eighteen followed on 2026-07-29, when the last producers were
ported and every per-object fill in the package became a `RawData` write. They
live in `perObjectData/`.

The decision behind them: Carbon has ONE struct per payload that is both the CPU
record and the uploaded bytes. Keeping a `CjsModel` mirror of each meant every
field existed twice, with nothing enforcing that the two agreed - so the mirrors
are quarantined and `RawData` + `CjsPerObjectLayouts` is the single
representation.

**Why this package owns the identity:** these are Carbon per-object constant
structs declared in the Trinity/Eve headers, so the Trinity layer is their
canonical home and no other package may declare them.

**Why they are not supported runtime models:** a per-object record is GPU-form,
write-mostly staging - transposed matrices, bit-cast integers, positional
packing. `CjsModel` gives persistence, notification and reactivity, none of
which apply, and its per-field JS objects cannot express the byte layout the
shader binding depends on.

**Replacement:** `RawData` (`src/trinity/core/rawData/RawData.js`) over a layout
from `CjsPerObjectLayouts`, keyed by the SAME struct names these classes carried.
Transient payloads come from `accumulator.Alloc("<StructName>")`; persistent ones
from `RawData.create("<StructName>")`.

**Condition for revival:** a proven need for a per-object payload to be
serialized, notified, or hydrated as graph state - which would mean it is not
per-object staging data any more, and the layout question should be revisited
before any class here is restored.

| File | Was | Replaced by |
|---|---|---|
| `perObjectData/EveSpaceObjectVSData.js` | Hull VS record (116 floats) | Persistent `RawData` on `EveSpaceObject2`, the child owners and `EveSwarmRenderable` |
| `perObjectData/EveSpaceObjectPSData.js` | Hull PS record (116 floats) | As above |
| `perObjectData/EveSpacePerObjectData.js` | Flattened instance record (164 floats) | Persistent `RawData` on `EveChildInstancedMeshes` |
| `perObjectData/EveTurretSetVSData.js` | Turret VS record (236 floats) | `Alloc("EveTurretSetVSData")` in `EveTurretSet.GetPerObjectData` |
| `perObjectData/EveTurretSetPSData.js` | Turret PS record (40 floats) | `Alloc("EveTurretSetPSData")` in the same fill |
| `perObjectData/EveTurretSetPerObjectData.js` | VS+PS composite wrapper | The `{ vs, ps }` record the fill returns |
| `perObjectData/DecalVSPerObjectData.js` | Decal VS record | `Alloc("DecalVSPerObjectData")` in `EveSpaceObjectDecal.GetPerObjectData` |
| `perObjectData/DecalPSPerObjectData.js` | Decal PS record | `Alloc("DecalPSPerObjectData")` in the same fill |
| `perObjectData/EveDecalPerObjectData.js` | Decal VS+PS composite wrapper | The `{ vs, ps }` record the fill returns |
| `perObjectData/EveBoosterSetVSData.js` | Booster VS record | `Alloc("EveBoosterSetVSData")` in `EveBoosterSet2Renderable.GetPerObjectData` |
| `perObjectData/EveBoosterSetPSData.js` | Booster PS record | `Alloc("EveBoosterSetPSData")` in the same fill |
| `perObjectData/EveBoosterSetPerObjectData.js` | Booster VS+PS composite wrapper | The `{ vs, ps }` record the fill returns |
| `perObjectData/EvePerObjectVSData.js` | Generic `Tr2PerObjectDataStandard` VS half | `Alloc("EvePerObjectVSData")` in `EveLineSet.GetPerObjectData` |
| `perObjectData/EvePerObjectPSData.js` | Generic PS half | `Alloc("EvePerObjectPSData")` in the same fill |
| `perObjectData/EveSpherePinPerObjectData.js` | Sphere-pin record | `Alloc("EveSpherePinPerObjectData")` in `EveSpherePin.GetPerObjectData` |
| `perObjectData/EveChildSpherePinPerObjectData.js` | Child sphere-pin record | `Alloc("EveChildSpherePinPerObjectData")` in `EveChildSpherePin.GetPerObjectData` |
| `perObjectData/EveChildBulletStormPerObjectData.js` | Bullet-storm record | `Alloc("EveChildBulletStormPerObjectData")` in `EveChildBulletStorm.GetPerObjectData` |
| `perObjectData/MergeMorphsConstantBuffer.js` | Morph-merge compute constants | Catalogued layout; the compute pass that consumes it is engine-owned and unported |

Their struct sizes are still guarded: `test/trinity/per-object-layouts.test.js` pins every
stride against its Carbon header cite, which is what the retired
`test/trinity/per-object-classes.test.js` used to do.

## Mechanics

- `tools-core` owns schema and class emission. Its output is reviewed before
  being copied into this package; the copy review must exclude every basename
  listed in this file and preserve its maintained or dropped owner.
- The Trinity layer deliberately has no generator dependency on `tools-core`
  and does not read a sibling workspace or scratch schema directory.
- The files are kept verbatim as the generator last emitted them (provenance
  headers, Blue method mapping breadcrumbs, throwing `@impl.notImplemented`
  stubs) so that IF a future decision revives one, it starts from the exact
  generated surface: delete the file here, remove it from this README, and
  include it during the next reviewed tools-core output copy.

## Do not

- Do not export anything from this folder or add an `index.js`.
- Do not implement the stubs here. If you think one of these classes is
  needed, that is a scope decision for the requester first; the rationale
  above (from the 2026-07-17 trinity CPU-completion investigation) is the
  standing record of why they were dropped.
